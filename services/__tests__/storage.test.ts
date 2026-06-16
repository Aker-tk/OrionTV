jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

import AsyncStorage from "@react-native-async-storage/async-storage";
import { PlayRecordManager, SettingsManager } from "@/services/storage";

describe("SettingsManager", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns the default live stream source when no saved settings exist", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

    const settings = await SettingsManager.get();

    expect(settings.m3uUrl).toBe(
      "https://gh-proxy.com/raw.githubusercontent.com/vbskycn/iptv/refs/heads/master/tv/iptv4.m3u"
    );
  });
});

describe("PlayRecordManager", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("reads a single local play record and merges local player settings", async () => {
    (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => {
      if (key === "mytv_play_records") {
        return JSON.stringify({
          "source-a+video-1": {
            title: "Video 1",
            cover: "poster.jpg",
            source_name: "Source A",
            year: "2026",
            index: 1,
            total_episodes: 12,
            play_time: 30,
            total_time: 120,
            save_time: 1000,
          },
        });
      }
      if (key === "mytv_player_settings") {
        return JSON.stringify({
          "source-a+video-1": {
            playbackRate: 1.25,
            introEndTime: 5000,
          },
        });
      }
      return null;
    });

    const record = await PlayRecordManager.get("source-a", "video-1");

    expect(record?.title).toBe("Video 1");
    expect(record?.playbackRate).toBe(1.25);
    expect(record?.introEndTime).toBe(5000);
    expect(AsyncStorage.getItem).toHaveBeenCalledWith("mytv_play_records");
    expect(AsyncStorage.getItem).toHaveBeenCalledWith("mytv_player_settings");
  });
});
