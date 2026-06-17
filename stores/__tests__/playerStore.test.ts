jest.mock("@/services/storage", () => ({
  PlayRecordManager: {
    get: jest.fn(),
  },
  PlayerSettingsManager: {
    get: jest.fn(),
  },
}));

jest.mock("../detailStore", () => {
  return {
    __esModule: true,
    default: {
      getState: jest.fn(),
    },
    episodesSelectorBySource: jest.fn(),
  };
});

jest.mock("@/utils/PerfTracker", () => ({
  PerfTracker: {
    mark: jest.fn(),
    measure: jest.fn(),
    timeAsync: jest.fn(async (_flow, _label, callback) => callback()),
  },
}));

import usePlayerStore from "../playerStore";
import useDetailStore, { episodesSelectorBySource } from "../detailStore";
import { PlayRecordManager, PlayerSettingsManager } from "@/services/storage";
import { PerfTracker } from "@/utils/PerfTracker";

const defaultDetail = {
  id: "video-1",
  title: "Video 1",
  source: "source-a",
  source_name: "Source A",
  episodes: ["https://example.com/video.m3u8"],
};

describe("usePlayerStore", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useDetailStore.getState as jest.Mock).mockReturnValue({ detail: defaultDetail });
    (episodesSelectorBySource as jest.Mock).mockReturnValue(jest.fn(() => defaultDetail.episodes));
    usePlayerStore.getState().reset();
  });

  it("uses settings merged into a play record without reading player settings again", async () => {
    (PlayRecordManager.get as jest.Mock).mockResolvedValue({
      title: "Video 1",
      cover: "poster.jpg",
      source_name: "Source A",
      year: "2026",
      index: 1,
      total_episodes: 12,
      play_time: 30,
      total_time: 120,
      save_time: 1000,
      playbackRate: 1.25,
      introEndTime: 5000,
    });
    (PlayerSettingsManager.get as jest.Mock).mockResolvedValue({ playbackRate: 2 });

    await usePlayerStore.getState().loadVideo({
      source: "source-a",
      id: "video-1",
      title: "Video 1",
      episodeIndex: 0,
    });

    expect(PlayerSettingsManager.get).not.toHaveBeenCalled();
    expect(usePlayerStore.getState()).toMatchObject({
      initialPosition: 30000,
      playbackRate: 1.25,
      introEndTime: 5000,
    });
  });

  it("initializes detail when cached detail matches title but not requested source or id", async () => {
    const requestedDetail = {
      ...defaultDetail,
      id: "video-2",
      source: "source-b",
      source_name: "Source B",
      episodes: ["https://example.com/source-b-video.m3u8"],
    };
    const init = jest.fn(async () => {
      (useDetailStore.getState as jest.Mock).mockReturnValue({
        detail: requestedDetail,
        init,
        searchResults: [requestedDetail],
      });
    });
    (useDetailStore.getState as jest.Mock).mockReturnValue({
      detail: defaultDetail,
      init,
      searchResults: [defaultDetail],
    });
    (episodesSelectorBySource as jest.Mock).mockImplementation((source: string) =>
      jest.fn(() => (source === "source-b" ? requestedDetail.episodes : defaultDetail.episodes))
    );
    (PlayRecordManager.get as jest.Mock).mockResolvedValue(null);
    (PlayerSettingsManager.get as jest.Mock).mockResolvedValue(null);

    await usePlayerStore.getState().loadVideo({
      source: "source-b",
      id: "video-2",
      title: "Video 1",
      episodeIndex: 0,
    });

    expect(init).toHaveBeenCalledWith("Video 1", "source-b", "video-2");
    expect(PlayRecordManager.get).toHaveBeenCalledWith("source-b", "video-2");
    expect(PlayerSettingsManager.get).toHaveBeenCalledWith("source-b", "video-2");
    expect(PlayRecordManager.get).not.toHaveBeenCalledWith("source-a", "video-1");
    expect(usePlayerStore.getState().episodes).toEqual([
      { url: "https://example.com/source-b-video.m3u8", title: "第 1 集" },
    ]);
  });

  it("uses requested search result when init leaves same-title first detail", async () => {
    const requestedDetail = {
      ...defaultDetail,
      id: "video-2",
      source: "source-b",
      source_name: "Source B",
      episodes: ["https://example.com/source-b-video.m3u8"],
    };
    const init = jest.fn(async () => {
      (useDetailStore.getState as jest.Mock).mockReturnValue({
        detail: defaultDetail,
        init,
        setDetail,
        searchResults: [defaultDetail, requestedDetail],
      });
    });
    const setDetail = jest.fn(async (detail) => {
      (useDetailStore.getState as jest.Mock).mockReturnValue({
        detail,
        init,
        setDetail,
        searchResults: [defaultDetail, requestedDetail],
      });
    });
    (useDetailStore.getState as jest.Mock).mockReturnValue({
      detail: defaultDetail,
      init,
      setDetail,
      searchResults: [defaultDetail],
    });
    (episodesSelectorBySource as jest.Mock).mockImplementation((source: string) =>
      jest.fn(() => (source === "source-b" ? requestedDetail.episodes : defaultDetail.episodes))
    );
    (PlayRecordManager.get as jest.Mock).mockResolvedValue(null);
    (PlayerSettingsManager.get as jest.Mock).mockResolvedValue(null);

    await usePlayerStore.getState().loadVideo({
      source: "source-b",
      id: "video-2",
      title: "Video 1",
      episodeIndex: 0,
    });

    expect(init).toHaveBeenCalledWith("Video 1", "source-b", "video-2");
    expect(setDetail).toHaveBeenCalledWith(requestedDetail);
    expect(PlayRecordManager.get).toHaveBeenCalledWith("source-b", "video-2");
    expect(PlayerSettingsManager.get).toHaveBeenCalledWith("source-b", "video-2");
    expect(PlayRecordManager.get).not.toHaveBeenCalledWith("source-a", "video-1");
    expect(usePlayerStore.getState().episodes).toEqual([
      { url: "https://example.com/source-b-video.m3u8", title: "第 1 集" },
    ]);
  });

  it("measures startup errors when detail initialization throws", async () => {
    const init = jest.fn().mockRejectedValue(new Error("detail failed"));
    (useDetailStore.getState as jest.Mock).mockReturnValue({
      detail: null,
      init,
    });
    (episodesSelectorBySource as jest.Mock).mockReturnValue(jest.fn(() => []));

    await expect(
      usePlayerStore.getState().loadVideo({
        source: "source-a",
        id: "video-1",
        title: "Video 1",
        episodeIndex: 0,
      })
    ).resolves.toBeUndefined();

    expect(PerfTracker.measure).toHaveBeenCalledWith(
      "Playback",
      "load:source-a:video-1",
      "error",
      "detail-init"
    );
    expect(usePlayerStore.getState().isLoading).toBe(false);
  });

  it("measures startup errors when detail initialization returns no detail", async () => {
    const init = jest.fn().mockResolvedValue(undefined);
    (useDetailStore.getState as jest.Mock).mockReturnValue({
      detail: null,
      init,
      error: "not found",
    });
    (episodesSelectorBySource as jest.Mock).mockReturnValue(jest.fn(() => []));

    await usePlayerStore.getState().loadVideo({
      source: "source-a",
      id: "video-1",
      title: "Video 1",
      episodeIndex: 0,
    });

    expect(PerfTracker.measure).toHaveBeenCalledWith(
      "Playback",
      "load:source-a:video-1",
      "error",
      "detail-not-found"
    );
    expect(usePlayerStore.getState().isLoading).toBe(false);
  });

  it("measures fallback errors when no fallback source is available", async () => {
    const markSourceAsFailed = jest.fn();
    const getNextAvailableSource = jest.fn(() => null);
    (useDetailStore.getState as jest.Mock).mockReturnValue({
      detail: defaultDetail,
      markSourceAsFailed,
      getNextAvailableSource,
    });

    await usePlayerStore.getState().handleVideoError(
      "network",
      "https://signed.example.com/video.m3u8?token=secret"
    );

    expect(markSourceAsFailed).toHaveBeenCalledWith(
      "source-a",
      "network error: https://signed.example.com/video.m3u8"
    );
    expect(PerfTracker.measure).toHaveBeenCalledWith(
      "Playback",
      "video-error:fallback",
      "fallback-error",
      "no-source"
    );
    expect(usePlayerStore.getState().isLoading).toBe(false);
  });

  it("skips detail lookups for throttled sub-second playback updates", () => {
    const savePlayRecord = jest.fn();
    usePlayerStore.setState({
      currentEpisodeIndex: 0,
      episodes: [{ url: "https://example.com/video.m3u8", title: "第 1 集" }],
      status: {
        isLoaded: true,
        positionMillis: 1000,
        durationMillis: 100000,
        isPlaying: true,
      } as any,
      progressPosition: 0.01,
      _isRecordSaveThrottled: true,
      _savePlayRecord: savePlayRecord,
    });

    usePlayerStore.getState().handlePlaybackStatusUpdate({
      isLoaded: true,
      positionMillis: 1005,
      durationMillis: 100000,
      isPlaying: true,
      didJustFinish: false,
    } as any);

    expect(useDetailStore.getState).not.toHaveBeenCalled();
    expect(savePlayRecord).not.toHaveBeenCalled();
  });
});
