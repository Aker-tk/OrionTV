import { useCallback, RefObject, useMemo } from 'react';
import { Video, ResizeMode } from 'expo-av';
import Toast from 'react-native-toast-message';
import usePlayerStore from '@/stores/playerStore';
import Logger from '@/utils/Logger';
import { PerfTracker } from '@/utils/PerfTracker';

const logger = Logger.withTag('VideoHandlers');

const describeUrlForLog = (url: string) => url.split(/[?#]/)[0];
const getPlaybackErrorString = (error: any) => (error as any)?.error?.toString() || error?.toString() || '';
const describePlaybackErrorForLog = (errorString: string) =>
  errorString.replace(/https?:\/\/[^\s"'<>]+/g, (url) => describeUrlForLog(url)) || 'Unknown playback error';

interface UseVideoHandlersProps {
  videoRef: RefObject<Video>;
  currentEpisode: { url: string; title: string } | undefined;
  initialPosition: number;
  introEndTime?: number;
  playbackRate: number;
  handlePlaybackStatusUpdate: (status: any) => void;
  deviceType: string;
  detail?: { poster?: string };
}

export const useVideoHandlers = ({
  videoRef,
  currentEpisode,
  initialPosition,
  introEndTime,
  playbackRate,
  handlePlaybackStatusUpdate,
  deviceType,
  detail,
}: UseVideoHandlersProps) => {
  
  const onLoad = useCallback(async () => {
    if (currentEpisode?.url) {
      PerfTracker.measure("Playback", "video-load:current", "onLoad", currentEpisode.title);
    }

    logger.debug('Video onLoad - video ready to play');
    
    try {
      const jumpPosition = initialPosition || introEndTime || 0;
      if (jumpPosition > 0) {
        logger.debug(`Setting initial position to ${jumpPosition}ms`);
        await videoRef.current?.setPositionAsync(jumpPosition);
      }
      
      await videoRef.current?.playAsync();
      usePlayerStore.setState({ isLoading: false });
    } catch (error) {
      logger.debug('Failed to auto-play after onLoad:', describePlaybackErrorForLog(getPlaybackErrorString(error)));
      usePlayerStore.setState({ isLoading: false });
    }
  }, [videoRef, initialPosition, introEndTime, currentEpisode?.url, currentEpisode?.title]);

  const onLoadStart = useCallback(() => {
    if (!currentEpisode?.url) return;
    
    PerfTracker.mark("Playback", "video-load:current");
    logger.debug('Video onLoadStart - starting to load video');
    usePlayerStore.setState({ isLoading: true });
  }, [currentEpisode?.url]);

  const onError = useCallback((error: any) => {
    if (!currentEpisode?.url) return;
    
    const errorString = getPlaybackErrorString(error);
    logger.error('Video playback error:', describePlaybackErrorForLog(errorString));

    const isSSLError = errorString.includes('SSLHandshakeException') || 
                      errorString.includes('CertPathValidatorException') ||
                      errorString.includes('Trust anchor for certification path not found');
    const isNetworkError = errorString.includes('HttpDataSourceException') ||
                         errorString.includes('IOException') ||
                         errorString.includes('SocketTimeoutException');
    const safeUrl = describeUrlForLog(currentEpisode.url);
    
    if (isSSLError) {
      logger.error('SSL certificate validation failed for URL:', safeUrl);
      Toast.show({ 
        type: "error", 
        text1: "SSL证书错误，正在尝试其他播放源...",
        text2: "请稍候"
      });
      usePlayerStore.getState().handleVideoError('ssl', currentEpisode.url);
    } else if (isNetworkError) {
      logger.error('Network connection failed for URL:', safeUrl);
      Toast.show({ 
        type: "error", 
        text1: "网络连接失败，正在尝试其他播放源...",
        text2: "请稍候"
      });
      usePlayerStore.getState().handleVideoError('network', currentEpisode.url);
    } else {
      logger.error('Other video error for URL:', safeUrl);
      Toast.show({ 
        type: "error", 
        text1: "视频播放失败，正在尝试其他播放源...",
        text2: "请稍候"
      });
      usePlayerStore.getState().handleVideoError('other', currentEpisode.url);
    }
  }, [currentEpisode?.url]);

  // 优化的Video组件props
  const videoProps = useMemo(() => ({
    source: { uri: currentEpisode?.url || '' },
    posterSource: { uri: detail?.poster ?? "" },
    resizeMode: ResizeMode.CONTAIN,
    rate: playbackRate,
    onPlaybackStatusUpdate: handlePlaybackStatusUpdate,
    onLoad,
    onLoadStart,
    onError,
    useNativeControls: deviceType !== 'tv',
    shouldPlay: true,
    progressUpdateIntervalMillis: deviceType === 'tv' ? 1000 : 500,
  }), [
    currentEpisode?.url,
    detail?.poster,
    playbackRate,
    handlePlaybackStatusUpdate,
    onLoad,
    onLoadStart,
    onError,
    deviceType,
  ]);

  return {
    onLoad,
    onLoadStart,
    onError,
    videoProps,
  };
};
