import { create } from "zustand";
import Toast from "react-native-toast-message";
import { AVPlaybackStatus, Video } from "expo-av";
import { RefObject } from "react";
import { PlayRecord, PlayerSettings, PlayRecordManager, PlayerSettingsManager } from "@/services/storage";
import useDetailStore, { episodesSelectorBySource } from "./detailStore";
import Logger from '@/utils/Logger';
import { PerfTracker } from "@/utils/PerfTracker";

const logger = Logger.withTag('PlayerStore');

const describeUrlForLog = (url: string) => {
  const urlWithoutQuery = url.split(/[?#]/)[0];
  return urlWithoutQuery.length > 100 ? `${urlWithoutQuery.substring(0, 100)}...` : urlWithoutQuery;
};

interface Episode {
  url: string;
  title: string;
}

interface PlayerState {
  videoRef: RefObject<Video> | null;
  currentEpisodeIndex: number;
  episodes: Episode[];
  status: AVPlaybackStatus | null;
  isLoading: boolean;
  showControls: boolean;
  showEpisodeModal: boolean;
  showSourceModal: boolean;
  showSpeedModal: boolean;
  showNextEpisodeOverlay: boolean;
  isSeeking: boolean;
  seekPosition: number;
  progressPosition: number;
  initialPosition: number;
  playbackRate: number;
  introEndTime?: number;
  outroStartTime?: number;
  setVideoRef: (ref: RefObject<Video>) => void;
  loadVideo: (options: {
    source: string;
    id: string;
    title: string;
    episodeIndex: number;
    position?: number;
  }) => Promise<void>;
  playEpisode: (index: number) => void;
  togglePlayPause: () => void;
  seek: (duration: number) => void;
  handlePlaybackStatusUpdate: (newStatus: AVPlaybackStatus) => void;
  setLoading: (loading: boolean) => void;
  setShowControls: (show: boolean) => void;
  setShowEpisodeModal: (show: boolean) => void;
  setShowSourceModal: (show: boolean) => void;
  setShowSpeedModal: (show: boolean) => void;
  setShowNextEpisodeOverlay: (show: boolean) => void;
  setPlaybackRate: (rate: number) => void;
  setIntroEndTime: () => void;
  setOutroStartTime: () => void;
  reset: () => void;
  _seekTimeout?: NodeJS.Timeout;
  _isRecordSaveThrottled: boolean;
  // Internal helper
  _savePlayRecord: (updates?: Partial<PlayRecord>, options?: { immediate?: boolean }) => void;
  handleVideoError: (errorType: 'ssl' | 'network' | 'other', failedUrl: string) => Promise<void>;
}

const usePlayerStore = create<PlayerState>((set, get) => ({
  videoRef: null,
  episodes: [],
  currentEpisodeIndex: -1,
  status: null,
  isLoading: true,
  showControls: false,
  showEpisodeModal: false,
  showSourceModal: false,
  showSpeedModal: false,
  showNextEpisodeOverlay: false,
  isSeeking: false,
  seekPosition: 0,
  progressPosition: 0,
  initialPosition: 0,
  playbackRate: 1.0,
  introEndTime: undefined,
  outroStartTime: undefined,
  _seekTimeout: undefined,
  _isRecordSaveThrottled: false,

  setVideoRef: (ref) => set({ videoRef: ref }),

  loadVideo: async ({ source, id, episodeIndex, position, title }) => {
    const loadMark = `load:${source}:${id}`;
    const measureLoadError = (reason?: string) => {
      PerfTracker.measure("Playback", loadMark, "error", reason);
    };

    PerfTracker.mark("Playback", loadMark);
    logger.debug(`Loading video ${source}/${id}: ${title}`);
    let loadErrorReason: string | undefined;

    try {
      let detailStoreState = useDetailStore.getState();
      let detail = detailStoreState.detail;
      let episodes: string[] = [];

      const detailMatchesRequestedItem = (candidate: typeof detail) =>
        !!candidate &&
        candidate.title === title &&
        candidate.source === source &&
        candidate.id.toString() === id;

      const findRequestedSearchResult = (state: typeof detailStoreState) =>
        state.searchResults?.find((result) =>
          result.title === title &&
          result.source === source &&
          result.id.toString() === id
        ) ?? null;

      const getEpisodesForDetail = (
        candidate: NonNullable<typeof detail>,
        state: typeof detailStoreState
      ) => {
        const matchingResult = state.searchResults?.find((result) =>
          result.source === candidate.source &&
          result.id.toString() === candidate.id.toString()
        );
        return matchingResult?.episodes || candidate.episodes || [];
      };

      const canUseCachedDetail = detailMatchesRequestedItem(detail);
      
      // 如果有匹配请求的detail，使用detail的source获取episodes；否则使用传入的source
      if (detail && detail.source && canUseCachedDetail) {
        logger.debug(`[INFO] Using existing detail source "${detail.source}" to get episodes`);
        episodes = getEpisodesForDetail(detail, detailStoreState);
      } else {
        logger.debug(`[INFO] No reusable detail, using provided source "${source}" to get episodes`);
        episodes = episodesSelectorBySource(source)(detailStoreState);
      }

      set({
        isLoading: true,
      });

      const needsDetailInit = !canUseCachedDetail || !episodes || episodes.length === 0;
      logger.debug(`Detail check - needsInit: ${needsDetailInit}, hasDetail: ${!!detail}, episodesCount: ${episodes?.length || 0}`);

      if (needsDetailInit) {
        loadErrorReason = "detail-init";
        await PerfTracker.timeAsync(
          "Playback",
          "detail-init",
          () => useDetailStore.getState().init(title, source, id),
          title
        );
        loadErrorReason = undefined;
        
        detailStoreState = useDetailStore.getState();
        detail = detailStoreState.detail;
        
        if (!detail) {
          logger.error(`[ERROR] Detail not found after initialization for "${title}" (source: ${source}, id: ${id})`);
          
          // 检查DetailStore的错误状态
          const detailStoreState = useDetailStore.getState();
          if (detailStoreState.error) {
            logger.error(`[ERROR] DetailStore error: ${detailStoreState.error}`);
            set({ 
              isLoading: false,
              // 可以选择在这里设置一个错误状态，但playerStore可能没有error字段
            });
          } else {
            logger.error(`[ERROR] DetailStore init completed but no detail found and no error reported`);
            set({ isLoading: false });
          }
          measureLoadError("detail-not-found");
          return;
        }

        if (!detailMatchesRequestedItem(detail)) {
          const requestedSearchResult = findRequestedSearchResult(detailStoreState);
          if (!requestedSearchResult) {
            logger.error(`[ERROR] DetailStore init returned "${detail.source}/${detail.id}" but requested "${source}/${id}"`);
            set({ isLoading: false });
            measureLoadError("detail-mismatch");
            return;
          }

          logger.debug(`[INFO] Switching initialized detail from "${detail.source}/${detail.id}" to requested "${source}/${id}"`);
          try {
            await useDetailStore.getState().setDetail(requestedSearchResult);
            detailStoreState = useDetailStore.getState();
          } catch (setDetailError) {
            logger.warn(`[WARN] Failed to persist requested detail selection, continuing with requested result`, setDetailError);
          }
          const selectedDetail = detailStoreState.detail;
          detail = selectedDetail && detailMatchesRequestedItem(selectedDetail)
            ? selectedDetail
            : requestedSearchResult;
        }
        
        // 使用DetailStore找到的实际source来获取episodes，而不是原始的preferredSource
        logger.debug(`[INFO] Using actual source "${detail.source}" instead of preferred source "${source}"`);  
        episodes = getEpisodesForDetail(detail, detailStoreState);
        
        if (!episodes || episodes.length === 0) {
          logger.error(`[ERROR] No episodes found for "${title}" from source "${detail.source}" (${detail.source_name})`);
          
          // 尝试从searchResults中直接获取episodes
          logger.debug(`[INFO] Available sources in searchResults: ${detailStoreState.searchResults.map(r => `${r.source}(${r.episodes?.length || 0} episodes)`).join(', ')}`);
          
          logger.error(`[ERROR] Requested source has no episodes in searchResults`);
          set({ isLoading: false });
          measureLoadError("no-episodes");
          return;
        }
        
        logger.debug(`[SUCCESS] Detail and episodes loaded - source: ${detail.source_name}, episodes: ${episodes.length}`);
      } else {
        logger.debug(`Skipping DetailStore.init - using cached data`);
      }

      // 最终验证：确保我们有有效的detail和episodes数据
      if (!detail) {
        logger.error(`[ERROR] Final check failed: detail is null`);
        set({ isLoading: false });
        measureLoadError("detail-null");
        return;
      }

      if (!detailMatchesRequestedItem(detail)) {
        logger.error(`[ERROR] Final check failed: detail does not match requested item (${source}/${id})`);
        set({ isLoading: false });
        measureLoadError("detail-mismatch");
        return;
      }
       
      if (!episodes || episodes.length === 0) {
        logger.error(`[ERROR] Final check failed: no episodes available for source "${detail.source}" (${detail.source_name})`);
        set({ isLoading: false });
        measureLoadError("episodes-empty");
        return;
      }
      
      logger.debug(`[SUCCESS] Final validation passed - detail: ${detail.source_name}, episodes: ${episodes.length}`);

      loadErrorReason = "storage-reads";
      const detailId = detail!.id.toString();
      const { playRecord, playerSettings } = await PerfTracker.timeAsync(
        "Playback",
        "storage-reads",
        async (): Promise<{
          playRecord: PlayRecord | null;
          playerSettings: PlayRecord | PlayerSettings | null;
        }> => {
          const playRecord = await PlayRecordManager.get(detail!.source, detailId);
          if (playRecord) {
            return { playRecord, playerSettings: playRecord };
          }

          const playerSettings = await PlayerSettingsManager.get(detail!.source, detailId);
          return { playRecord, playerSettings };
        }
      );
      loadErrorReason = undefined;
      
      const initialPositionFromRecord = playRecord?.play_time ? playRecord.play_time * 1000 : 0;
      const savedPlaybackRate = playerSettings?.playbackRate || playRecord?.playbackRate || 1.0;
      
      const mappedEpisodes = episodes.map((ep, index) => ({
        url: ep,
        title: `第 ${index + 1} 集`,
      }));
      
      set({
        isLoading: false,
        currentEpisodeIndex: episodeIndex,
        initialPosition: position || initialPositionFromRecord,
        playbackRate: savedPlaybackRate,
        episodes: mappedEpisodes,
        introEndTime: playRecord?.introEndTime ?? playerSettings?.introEndTime,
        outroStartTime: playRecord?.outroStartTime ?? playerSettings?.outroStartTime,
      });

      PerfTracker.measure("Playback", loadMark, "ready", `${mappedEpisodes.length} episodes`);
      
    } catch (error) {
      logger.debug("Failed to load play record", error);
      set({ isLoading: false });
      measureLoadError(loadErrorReason);
    }
  },

  playEpisode: async (index) => {
    const { episodes, videoRef } = get();
    if (index >= 0 && index < episodes.length) {
      set({
        currentEpisodeIndex: index,
        showNextEpisodeOverlay: false,
        initialPosition: 0,
        progressPosition: 0,
        seekPosition: 0,
      });
      try {
        await videoRef?.current?.replayAsync();
      } catch (error) {
        logger.debug("Failed to replay video:", error);
        Toast.show({ type: "error", text1: "播放失败" });
      }
    }
  },

  togglePlayPause: async () => {
    const { status, videoRef } = get();
    if (status?.isLoaded) {
      try {
        if (status.isPlaying) {
          await videoRef?.current?.pauseAsync();
        } else {
          await videoRef?.current?.playAsync();
        }
      } catch (error) {
        logger.debug("Failed to toggle play/pause:", error);
        Toast.show({ type: "error", text1: "操作失败" });
      }
    }
  },

  seek: async (duration) => {
    const { status, videoRef } = get();
    if (!status?.isLoaded || !status.durationMillis) return;

    const newPosition = Math.max(0, Math.min(status.positionMillis + duration, status.durationMillis));
    try {
      await videoRef?.current?.setPositionAsync(newPosition);
    } catch (error) {
      logger.debug("Failed to seek video:", error);
      Toast.show({ type: "error", text1: "快进/快退失败" });
    }

    set({
      isSeeking: true,
      seekPosition: newPosition / status.durationMillis,
    });

    if (get()._seekTimeout) {
      clearTimeout(get()._seekTimeout);
    }
    const timeoutId = setTimeout(() => set({ isSeeking: false }), 1000);
    set({ _seekTimeout: timeoutId });
  },

  setIntroEndTime: () => {
    const { status, introEndTime: existingIntroEndTime } = get();
    const detail = useDetailStore.getState().detail;
    if (!status?.isLoaded || !detail) return;

    if (existingIntroEndTime) {
      // Clear the time
      set({ introEndTime: undefined });
      get()._savePlayRecord({ introEndTime: undefined }, { immediate: true });
      Toast.show({
        type: "info",
        text1: "已清除片头时间",
      });
    } else {
      // Set the time
      const newIntroEndTime = status.positionMillis;
      set({ introEndTime: newIntroEndTime });
      get()._savePlayRecord({ introEndTime: newIntroEndTime }, { immediate: true });
      Toast.show({
        type: "success",
        text1: "设置成功",
        text2: "片头时间已记录。",
      });
    }
  },

  setOutroStartTime: () => {
    const { status, outroStartTime: existingOutroStartTime } = get();
    const detail = useDetailStore.getState().detail;
    if (!status?.isLoaded || !detail) return;

    if (existingOutroStartTime) {
      // Clear the time
      set({ outroStartTime: undefined });
      get()._savePlayRecord({ outroStartTime: undefined }, { immediate: true });
      Toast.show({
        type: "info",
        text1: "已清除片尾时间",
      });
    } else {
      // Set the time
      if (!status.durationMillis) return;
      const newOutroStartTime = status.durationMillis - status.positionMillis;
      set({ outroStartTime: newOutroStartTime });
      get()._savePlayRecord({ outroStartTime: newOutroStartTime }, { immediate: true });
      Toast.show({
        type: "success",
        text1: "设置成功",
        text2: "片尾时间已记录。",
      });
    }
  },

  _savePlayRecord: (updates = {}, options = {}) => {
    const { immediate = false } = options;
    if (!immediate) {
      if (get()._isRecordSaveThrottled) {
        return;
      }
      set({ _isRecordSaveThrottled: true });
      setTimeout(() => {
        set({ _isRecordSaveThrottled: false });
      }, 10000); // 10 seconds
    }

    const { detail } = useDetailStore.getState();
    const { currentEpisodeIndex, episodes, status, introEndTime, outroStartTime } = get();
    if (detail && status?.isLoaded) {
      const existingRecord = {
        introEndTime,
        outroStartTime,
      };
      PlayRecordManager.save(detail.source, detail.id.toString(), {
        title: detail.title,
        cover: detail.poster || "",
        index: currentEpisodeIndex + 1,
        total_episodes: episodes.length,
        play_time: Math.floor(status.positionMillis / 1000),
        total_time: status.durationMillis ? Math.floor(status.durationMillis / 1000) : 0,
        source_name: detail.source_name,
        year: detail.year || "",
        ...existingRecord,
        ...updates,
      });
    }
  },

  handlePlaybackStatusUpdate: (newStatus) => {
    if (!newStatus.isLoaded) {
      if (newStatus.error) {
        logger.debug(`Playback Error: ${newStatus.error}`);
      }
      set({ status: newStatus });
      return;
    }

    const { currentEpisodeIndex, episodes, outroStartTime, playEpisode, status: prevStatus, progressPosition: prevProgress } = get();
    const detail = useDetailStore.getState().detail;

    if (
      outroStartTime &&
      newStatus.durationMillis &&
      newStatus.positionMillis >= newStatus.durationMillis - outroStartTime
    ) {
      if (currentEpisodeIndex < episodes.length - 1) {
        playEpisode(currentEpisodeIndex + 1);
        return;
      }
    }

    if (detail && newStatus.durationMillis) {
      get()._savePlayRecord();

      const isNearEnd = newStatus.positionMillis / newStatus.durationMillis > 0.95;
      if (isNearEnd && currentEpisodeIndex < episodes.length - 1 && !outroStartTime) {
        set({ showNextEpisodeOverlay: true });
      } else {
        set({ showNextEpisodeOverlay: false });
      }
    }

    if (newStatus.didJustFinish) {
      if (currentEpisodeIndex < episodes.length - 1) {
        playEpisode(currentEpisodeIndex + 1);
      }
    }

    const newProgress = newStatus.durationMillis ? newStatus.positionMillis / newStatus.durationMillis : 0;
    const progressDelta = Math.abs(newProgress - prevProgress);
    const secondChanged = !prevStatus?.isLoaded ||
      Math.floor((prevStatus.positionMillis || 0) / 1000) !== Math.floor((newStatus.positionMillis || 0) / 1000);
    const playbackStateChanged = !prevStatus?.isLoaded ||
      prevStatus.isPlaying !== newStatus.isPlaying;

    if (progressDelta > 0.002 || secondChanged || playbackStateChanged) {
      set({ status: newStatus, progressPosition: newProgress });
    }
  },

  setLoading: (loading) => set({ isLoading: loading }),
  setShowControls: (show) => set({ showControls: show }),
  setShowEpisodeModal: (show) => set({ showEpisodeModal: show }),
  setShowSourceModal: (show) => set({ showSourceModal: show }),
  setShowSpeedModal: (show) => set({ showSpeedModal: show }),
  setShowNextEpisodeOverlay: (show) => set({ showNextEpisodeOverlay: show }),

  setPlaybackRate: async (rate) => {
    const { videoRef } = get();
    const detail = useDetailStore.getState().detail;
    
    try {
      await videoRef?.current?.setRateAsync(rate, true);
      set({ playbackRate: rate });
      
      // Save the playback rate preference
      if (detail) {
        await PlayerSettingsManager.save(detail.source, detail.id.toString(), { playbackRate: rate });
      }
    } catch (error) {
      logger.debug("Failed to set playback rate:", error);
    }
  },

  reset: () => {
    set({
      episodes: [],
      currentEpisodeIndex: 0,
      status: null,
      isLoading: true,
      showControls: false,
      showEpisodeModal: false,
      showSourceModal: false,
      showSpeedModal: false,
      showNextEpisodeOverlay: false,
      initialPosition: 0,
      playbackRate: 1.0,
      introEndTime: undefined,
      outroStartTime: undefined,
    });
  },

  handleVideoError: async (errorType: 'ssl' | 'network' | 'other', failedUrl: string) => {
    const videoErrorMark = "video-error:fallback";
    const safeFailedUrl = describeUrlForLog(failedUrl);
    PerfTracker.mark("Playback", videoErrorMark);
    logger.error(`[VIDEO_ERROR] Handling ${errorType} error for URL: ${safeFailedUrl}`);
    
    const detailStoreState = useDetailStore.getState();
    const { detail } = detailStoreState;
    const { currentEpisodeIndex } = get();
    
    if (!detail) {
      logger.error(`[VIDEO_ERROR] Cannot fallback - no detail available`);
      set({ isLoading: false });
      PerfTracker.measure("Playback", videoErrorMark, "fallback-error", "missing-detail");
      return;
    }
    
    // 标记当前source为失败
    const currentSource = detail.source;
    const errorReason = `${errorType} error: ${safeFailedUrl}`;
    useDetailStore.getState().markSourceAsFailed(currentSource, errorReason);
    
    // 获取下一个可用的source
    const fallbackSource = useDetailStore.getState().getNextAvailableSource(currentSource, currentEpisodeIndex);
    
    if (!fallbackSource) {
      logger.error(`[VIDEO_ERROR] No fallback sources available for episode ${currentEpisodeIndex + 1}`);
      Toast.show({ 
        type: "error", 
        text1: "播放失败", 
        text2: "所有播放源都不可用，请稍后重试" 
      });
      set({ isLoading: false });
      PerfTracker.measure("Playback", videoErrorMark, "fallback-error", "no-source");
      return;
    }
    
    logger.debug(`[VIDEO_ERROR] Switching to fallback source: ${fallbackSource.source} (${fallbackSource.source_name})`);
    
    try {
      // 更新DetailStore的当前detail为fallback source
      await useDetailStore.getState().setDetail(fallbackSource);
      
      // 重新加载当前集数的episodes
      const newEpisodes = fallbackSource.episodes || [];
      if (newEpisodes.length > currentEpisodeIndex) {
        const mappedEpisodes = newEpisodes.map((ep: string, index: number) => ({
          url: ep,
          title: `第 ${index + 1} 集`,
        }));
        
        set({
          episodes: mappedEpisodes,
          isLoading: false, // 让Video组件重新渲染
        });
        
        PerfTracker.measure("Playback", videoErrorMark, "fallback-ready", fallbackSource.source);
        logger.debug(`[VIDEO_ERROR] New episode URL: ${describeUrlForLog(newEpisodes[currentEpisodeIndex])}`);
        
        Toast.show({ 
          type: "success", 
          text1: "已切换播放源", 
          text2: `正在使用 ${fallbackSource.source_name}` 
        });
      } else {
        logger.error(`[VIDEO_ERROR] Fallback source doesn't have episode ${currentEpisodeIndex + 1}`);
        set({ isLoading: false });
        PerfTracker.measure("Playback", videoErrorMark, "fallback-error", "missing-episode");
      }
    } catch (error) {
      PerfTracker.measure("Playback", videoErrorMark, "fallback-error");
      logger.error(`[VIDEO_ERROR] Failed to switch to fallback source:`, error);
      set({ isLoading: false });
    }
  },
}));

export default usePlayerStore;

export const selectCurrentEpisode = (state: PlayerState) => {
  // 增强数据安全性检查
  if (
    state.episodes &&
    Array.isArray(state.episodes) &&
    state.episodes.length > 0 &&
    state.currentEpisodeIndex >= 0 &&
    state.currentEpisodeIndex < state.episodes.length
  ) {
    const episode = state.episodes[state.currentEpisodeIndex];
    // 确保episode有有效的URL
    if (episode && episode.url && episode.url.trim() !== "") {
      return episode;
    } else {
      // 仅在调试模式下打印
      if (__DEV__) {
        logger.debug(`[PERF] selectCurrentEpisode - episode found but invalid URL: ${episode?.url}`);
      }
    }
  } else {
    // 仅在调试模式下打印
    if (__DEV__) {
      logger.debug(`[PERF] selectCurrentEpisode - no valid episode: episodes.length=${state.episodes?.length}, currentIndex=${state.currentEpisodeIndex}`);
    }
  }
  return undefined;
};
