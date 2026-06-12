import { create } from "zustand";
import { useSettingsStore } from "@/stores/settingsStore";
import { lunaConfig, ApiSite, SourceProfile } from "@/services/luna";
import { toggleVideoSourceSelection } from "./sourceStoreUtils";

interface SourceState {
  resources: ApiSite[];
  profiles: SourceProfile[];
  activeProfileId: string | null;
  loadResources: () => Promise<void>;
  loadProfiles: () => Promise<void>;
  switchProfile: (profileId: string) => Promise<void>;
  removeProfile: (profileId: string) => Promise<void>;
  importProfileFromJson: (fileName: string, rawJson: string) => Promise<{ skippedCount: number }>;
  toggleResourceEnabled: (resourceKey: string) => void;
}

const useSourceStore = create<SourceState>((set, get) => ({
  resources: [],
  profiles: [],
  activeProfileId: null,
  loadResources: async () => {
    const [resources, config] = await Promise.all([
      lunaConfig.getApiSites(),
      lunaConfig.getConfig(),
    ]);
    set({
      resources,
      profiles: config.sourceProfiles,
      activeProfileId: config.activeSourceProfileId,
    });
  },
  loadProfiles: async () => {
    await get().loadResources();
  },
  switchProfile: async (profileId: string) => {
    const config = await lunaConfig.getConfig();
    await lunaConfig.updateConfig({
      sourceProfiles: config.sourceProfiles,
      activeSourceProfileId: profileId,
    });
    await get().loadResources();
  },
  removeProfile: async (profileId: string) => {
    await lunaConfig.removeSourceProfile(profileId);
    await get().loadResources();
  },
  importProfileFromJson: async (fileName: string, rawJson: string) => {
    const result = await lunaConfig.importSourceProfile(fileName, rawJson);
    await get().loadResources();
    return {
      skippedCount: result.skippedCount,
    };
  },
  toggleResourceEnabled: (resourceKey: string) => {
    const { videoSource, setVideoSource } = useSettingsStore.getState();
    setVideoSource(toggleVideoSourceSelection(videoSource, resourceKey));
  },
}));

export const useSources = () => useSourceStore((state) => state.resources);
export const useSourceProfiles = () => useSourceStore((state) => state.profiles);
export const useActiveSourceProfileId = () => useSourceStore((state) => state.activeProfileId);

export default useSourceStore;
