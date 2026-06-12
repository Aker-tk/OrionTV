jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
  },
}));

import AsyncStorage from "@react-native-async-storage/async-storage";
import { lunaConfig } from "@/services/luna";

describe("lunaConfig source profile config", () => {
  const originalDateNow = Date.now;

  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (lunaConfig as any).config = null;
    Date.now = originalDateNow;
  });

  afterAll(() => {
    Date.now = originalDateNow;
  });

  it("returns api sites from the active source profile", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
      JSON.stringify({
        sourceProfiles: [
          {
            id: "builtin-luna",
            name: "LunaTV 默认源",
            type: "builtin",
            sites: [
              {
                key: "active-site",
                api: "https://example.com/api.php/provide/vod",
                name: "Active Site",
                detail: "https://example.com",
              },
            ],
          },
          {
            id: "inactive",
            name: "Inactive",
            type: "imported",
            importedAt: 1700000000000,
            sites: [
              {
                key: "inactive-site",
                api: "https://inactive.example.com/api.php/provide/vod",
                name: "Inactive Site",
                detail: "https://inactive.example.com",
              },
            ],
          },
        ],
        activeSourceProfileId: "builtin-luna",
        customCategories: [],
        siteName: "LunaTV",
        searchMaxPage: 3,
        doubanProxyType: "cmliussss-cdn-ali",
        disableYellowFilter: false,
      })
    );

    const sites = await lunaConfig.getApiSites();

    expect(sites).toEqual([
      {
        key: "active-site",
        api: "https://example.com/api.php/provide/vod",
        name: "Active Site",
        detail: "https://example.com",
      },
    ]);
  });

  it("migrates legacy apiSites storage into sourceProfiles and persists the migrated shape", async () => {
    const legacyApiSites = [
      {
        key: "legacy-site",
        api: "https://legacy.example.com/api.php/provide/vod",
        name: "Legacy Site",
        detail: "https://legacy.example.com",
      },
    ];

    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
      JSON.stringify({
        apiSites: legacyApiSites,
        customCategories: [{ name: "推荐", type: "1", query: "hot" }],
        siteName: "Custom LunaTV",
        searchMaxPage: 5,
        doubanProxyType: "proxy-a",
        disableYellowFilter: true,
      })
    );
    Date.now = jest.fn(() => 1700000000000) as unknown as typeof Date.now;

    const config = await lunaConfig.getConfig();

    expect(config.sourceProfiles).toHaveLength(2);
    expect(config.sourceProfiles[0]).toMatchObject({
      id: "builtin-luna",
      name: "LunaTV 默认源",
      type: "builtin",
    });
    expect(config.sourceProfiles[0].sites).toHaveLength(27);
    expect(config.sourceProfiles[0].sites).toEqual(
      expect.arrayContaining([
        {
          key: "iqiyizyapi_com",
          api: "https://iqiyizyapi.com/api.php/provide/vod",
          name: "🎬-爱奇艺-",
          detail: "https://iqiyizyapi.com",
        },
      ])
    );
    expect(config.sourceProfiles[1]).toEqual({
      id: "migrated-legacy",
      name: "迁移的旧版源",
      type: "imported",
      importedAt: 1700000000000,
      sites: legacyApiSites,
    });
    expect(config.activeSourceProfileId).toBe("migrated-legacy");
    expect(config.customCategories).toEqual([{ name: "推荐", type: "1", query: "hot" }]);
    expect(config.siteName).toBe("Custom LunaTV");
    expect(config.searchMaxPage).toBe(5);
    expect(config.doubanProxyType).toBe("proxy-a");
    expect(config.disableYellowFilter).toBe(true);
    expect(AsyncStorage.setItem).toHaveBeenCalledTimes(1);
    const persistedConfig = JSON.parse(
      (AsyncStorage.setItem as jest.Mock).mock.calls[0][1]
    );
    expect(persistedConfig).toMatchObject({
      sourceProfiles: [
        {
          id: "builtin-luna",
          name: "LunaTV 默认源",
          type: "builtin",
        },
        {
          id: "migrated-legacy",
          name: "迁移的旧版源",
          type: "imported",
          importedAt: 1700000000000,
          sites: legacyApiSites,
        },
      ],
      activeSourceProfileId: "migrated-legacy",
      customCategories: [{ name: "推荐", type: "1", query: "hot" }],
      siteName: "Custom LunaTV",
      searchMaxPage: 5,
      doubanProxyType: "proxy-a",
      disableYellowFilter: true,
    });
    expect(persistedConfig.sourceProfiles[0].sites).toHaveLength(27);
  });

  it("exposes builtin Luna profile-backed sites in the default config", async () => {
    const config = await lunaConfig.getConfig();
    const sites = await lunaConfig.getApiSites();

    expect(config.sourceProfiles).toHaveLength(1);
    expect(config.sourceProfiles[0]).toMatchObject({
      id: "builtin-luna",
      name: "LunaTV 默认源",
      type: "builtin",
    });
    expect(config.activeSourceProfileId).toBe("builtin-luna");
    expect(sites).toEqual(config.sourceProfiles[0].sites);
    expect(sites).toHaveLength(27);
    expect(sites).toEqual(
      expect.arrayContaining([
        {
          key: "iqiyizyapi_com",
          api: "https://iqiyizyapi.com/api.php/provide/vod",
          name: "🎬-爱奇艺-",
          detail: "https://iqiyizyapi.com",
        },
        {
          key: "www_hongniuzy_com",
          api: "https://www.hongniuzy2.com/api.php/provide/vod",
          name: "🎬红牛资源",
          detail: "https://www.hongniuzy.com",
        },
      ])
    );
    expect(sites.some((site) => site.key === "dbzy_tv")).toBe(false);
    expect(sites.some((site) => site.key === "91md_me")).toBe(false);
  });

  it("falls back to builtin defaults instead of activating an empty migrated profile for malformed stored config", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
      JSON.stringify({
        siteName: "Broken Config",
      })
    );

    const config = await lunaConfig.getConfig();
    const sites = await lunaConfig.getApiSites();

    expect(config.activeSourceProfileId).toBe("builtin-luna");
    expect(config.sourceProfiles).toHaveLength(1);
    expect(config.sourceProfiles[0]).toMatchObject({
      id: "builtin-luna",
      type: "builtin",
    });
    expect(sites).toHaveLength(27);
  });

  it("returns defensive copies so callers cannot mutate cached config or sites directly", async () => {
    const config = await lunaConfig.getConfig();
    const sites = await lunaConfig.getApiSites();

    config.sourceProfiles[0].sites[0].name = "Mutated Name";
    sites[0].name = "Mutated Site";

    const freshConfig = await lunaConfig.getConfig();
    const freshSites = await lunaConfig.getApiSites();

    expect(freshConfig.sourceProfiles[0].sites[0].name).not.toBe("Mutated Name");
    expect(freshSites[0].name).not.toBe("Mutated Site");
  });

  it("imports a LunaTV config as a new active profile with a unique derived name", async () => {
    Date.now = jest.fn(() => 1700000000000) as unknown as typeof Date.now;

    const result = await lunaConfig.importSourceProfile(
      "我的源.json",
      JSON.stringify({
        api_site: {
          "dbzy.tv": {
            name: "豆瓣资源",
            api: "https://caiji.dbzy5.com/api.php/provide/vod",
            detail: "https://dbzy.tv",
          },
          "broken.tv": {
            name: "坏数据",
          },
        },
      })
    );

    const config = await lunaConfig.getConfig();

    expect(result.skippedCount).toBe(1);
    expect(result.profile).toMatchObject({
      id: "imported-1700000000000",
      name: "我的源",
      type: "imported",
      importedAt: 1700000000000,
    });
    expect(config.activeSourceProfileId).toBe("imported-1700000000000");
    expect(config.sourceProfiles.at(-1)).toMatchObject({
      id: "imported-1700000000000",
      name: "我的源",
      type: "imported",
      importedAt: 1700000000000,
    });
    expect(config.sourceProfiles.at(-1)?.sites).toEqual([
      {
        key: "dbzy_tv",
        name: "豆瓣资源",
        api: "https://caiji.dbzy5.com/api.php/provide/vod",
        detail: "https://dbzy.tv",
      },
    ]);
  });

  it("falls back to the builtin profile when removing the active imported profile", async () => {
    Date.now = jest.fn(() => 1700000000000) as unknown as typeof Date.now;

    await lunaConfig.importSourceProfile(
      "我的源.json",
      JSON.stringify({
        api_site: {
          "dbzy.tv": {
            name: "豆瓣资源",
            api: "https://caiji.dbzy5.com/api.php/provide/vod",
          },
        },
      })
    );

    await lunaConfig.removeSourceProfile("imported-1700000000000");

    const config = await lunaConfig.getConfig();
    const sites = await lunaConfig.getApiSites();

    expect(config.activeSourceProfileId).toBe("builtin-luna");
    expect(config.sourceProfiles).toHaveLength(1);
    expect(config.sourceProfiles[0]).toMatchObject({
      id: "builtin-luna",
      type: "builtin",
    });
    expect(sites).toHaveLength(27);
  });
});
