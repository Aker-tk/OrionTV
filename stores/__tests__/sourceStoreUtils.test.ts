import { toggleVideoSourceSelection } from "../sourceStoreUtils";

jest.mock("@/stores/settingsStore", () => ({
  useSettingsStore: {
    getState: () => ({
      videoSource: {
        enabledAll: true,
        sources: {},
      },
      setVideoSource: jest.fn(),
    }),
  },
}));

jest.mock("@/services/luna", () => {
  let activeProfileId = "builtin-luna";
  const builtinProfile = {
    id: "builtin-luna",
    name: "LunaTV 默认源",
    type: "builtin" as const,
    sites: [{ key: "dbzy_tv", api: "https://dbzy.tv/api", name: "豆瓣资源" }],
  };
  const importedProfile = {
    id: "imported-1",
    name: "我的源",
    type: "imported" as const,
    importedAt: 1700000000000,
    sites: [{ key: "ffzyapi_com", api: "https://ffzy.tv/api", name: "非凡资源" }],
  };

  const getProfileById = (profileId: string) =>
    profileId === importedProfile.id ? importedProfile : builtinProfile;

  return {
    lunaConfig: {
      getApiSites: jest.fn(async () => getProfileById(activeProfileId).sites),
      getConfig: jest.fn(async () => ({
        sourceProfiles: [builtinProfile, importedProfile],
        activeSourceProfileId: activeProfileId,
      })),
      updateConfig: jest.fn(async ({ activeSourceProfileId }: { activeSourceProfileId: string }) => {
        activeProfileId = activeSourceProfileId;
      }),
      removeSourceProfile: jest.fn(async (profileId: string) => {
        if (profileId === activeProfileId) {
          activeProfileId = "builtin-luna";
        }
      }),
      importSourceProfile: jest.fn(async () => ({
        profile: importedProfile,
        skippedCount: 1,
      })),
    },
  };
});

import useSourceStore from "../sourceStore";

describe("toggleVideoSourceSelection", () => {
  beforeEach(() => {
    useSourceStore.setState({
      resources: [],
      profiles: [],
      activeProfileId: null,
    });
  });

  it("disables a source when all sources were previously enabled", () => {
    expect(
      toggleVideoSourceSelection(
        {
          enabledAll: true,
          sources: {},
        },
        "ffzy"
      )
    ).toEqual({
      enabledAll: false,
      sources: {
        ffzy: false,
      },
    });
  });

  it("re-enables enabledAll when every explicit source is turned back on", () => {
    expect(
      toggleVideoSourceSelection(
        {
          enabledAll: false,
          sources: {
            ffzy: true,
            dbzy: false,
          },
        },
        "dbzy"
      )
    ).toEqual({
      enabledAll: true,
      sources: {
        ffzy: true,
        dbzy: true,
      },
    });
  });

  it("loads resources together with profiles and active profile state", async () => {
    await useSourceStore.getState().loadResources();

    expect(useSourceStore.getState().resources).toEqual([
      { key: "dbzy_tv", api: "https://dbzy.tv/api", name: "豆瓣资源" },
    ]);
    expect(useSourceStore.getState().profiles).toHaveLength(2);
    expect(useSourceStore.getState().activeProfileId).toBe("builtin-luna");
  });

  it("refreshes resources after switching the active profile", async () => {
    await useSourceStore.getState().switchProfile("imported-1");

    expect(useSourceStore.getState().activeProfileId).toBe("imported-1");
    expect(useSourceStore.getState().resources).toEqual([
      { key: "ffzyapi_com", api: "https://ffzy.tv/api", name: "非凡资源" },
    ]);
  });
});
