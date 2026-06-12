jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

import AsyncStorage from "@react-native-async-storage/async-storage";
import { SettingsManager } from "@/services/storage";

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
