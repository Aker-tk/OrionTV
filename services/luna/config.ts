// services/luna/config.ts
// 配置管理 - 管理 API 源列表和应用配置

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  BUILTIN_LUNA_PROFILE_ID,
  BUILTIN_LUNA_PROFILE_NAME,
  BUILTIN_SOURCE_PROFILES,
} from './builtinProfiles';
import {
  buildUniqueProfileName,
  parseLunaTvConfigJson,
  stripJsonExtension,
} from './sourceProfileUtils';
import { ApiSite, AppConfig, CustomCategory, SourceProfile } from './types';

type LegacyStoredConfig = Omit<AppConfig, 'sourceProfiles' | 'activeSourceProfileId'> & {
  apiSites?: ApiSite[];
};

const MIGRATED_LEGACY_PROFILE_ID = 'migrated-legacy';
const MIGRATED_LEGACY_PROFILE_NAME = '迁移的旧版源';

// 存储键名
const CONFIG_STORAGE_KEY = '@lunatv_config';

// 默认配置
const DEFAULT_CONFIG: AppConfig = {
  sourceProfiles: BUILTIN_SOURCE_PROFILES,
  activeSourceProfileId: BUILTIN_LUNA_PROFILE_ID,
  customCategories: [],
  siteName: 'LunaTV',
  searchMaxPage: 3,
  doubanProxyType: 'cmliussss-cdn-ali',
  disableYellowFilter: false,
};

const cloneApiSites = (apiSites: ApiSite[]): ApiSite[] => apiSites.map(site => ({ ...site }));

const cloneSourceProfiles = (profiles: SourceProfile[]): SourceProfile[] =>
  profiles.map(profile => ({
    ...profile,
    sites: cloneApiSites(profile.sites),
  }));

const createDefaultConfig = (): AppConfig => ({
  ...DEFAULT_CONFIG,
  sourceProfiles: cloneSourceProfiles(BUILTIN_SOURCE_PROFILES),
});

const createBuiltinProfile = (apiSites: ApiSite[]): SourceProfile => ({
  id: BUILTIN_LUNA_PROFILE_ID,
  name: BUILTIN_LUNA_PROFILE_NAME,
  type: 'builtin',
  sites: cloneApiSites(apiSites),
});

const createImportedProfile = (apiSites: ApiSite[], importedAt: number): SourceProfile => ({
  id: MIGRATED_LEGACY_PROFILE_ID,
  name: MIGRATED_LEGACY_PROFILE_NAME,
  type: 'imported',
  importedAt,
  sites: cloneApiSites(apiSites),
});

const hasValidLegacyApiSites = (apiSites: ApiSite[] | undefined): apiSites is ApiSite[] =>
  Array.isArray(apiSites) && apiSites.length > 0;

const cloneConfig = (config: AppConfig): AppConfig => ({
  ...config,
  sourceProfiles: cloneSourceProfiles(config.sourceProfiles),
});

const getActiveProfile = (config: AppConfig): SourceProfile => {
  const activeProfile = config.sourceProfiles.find(profile => profile.id === config.activeSourceProfileId);
  if (activeProfile) {
    return activeProfile;
  }

  return config.sourceProfiles[0] ?? createBuiltinProfile([]);
};

const normalizeStoredConfig = (storedConfig: Partial<AppConfig> | LegacyStoredConfig): AppConfig => {
  const defaultConfig = createDefaultConfig();
  const hasSourceProfiles =
    Array.isArray((storedConfig as Partial<AppConfig>).sourceProfiles) &&
    (storedConfig as Partial<AppConfig>).sourceProfiles!.length > 0;

  if (hasSourceProfiles) {
    return {
      ...defaultConfig,
      ...storedConfig,
      sourceProfiles: cloneSourceProfiles((storedConfig as Partial<AppConfig>).sourceProfiles!),
      activeSourceProfileId:
        (storedConfig as Partial<AppConfig>).activeSourceProfileId || defaultConfig.activeSourceProfileId,
    };
  }

  const legacyConfig = storedConfig as LegacyStoredConfig;

  if (!hasValidLegacyApiSites(legacyConfig.apiSites)) {
    return {
      ...defaultConfig,
      customCategories: legacyConfig.customCategories ?? defaultConfig.customCategories,
      siteName: legacyConfig.siteName ?? defaultConfig.siteName,
      searchMaxPage: legacyConfig.searchMaxPage ?? defaultConfig.searchMaxPage,
      doubanProxyType: legacyConfig.doubanProxyType ?? defaultConfig.doubanProxyType,
      disableYellowFilter: legacyConfig.disableYellowFilter ?? defaultConfig.disableYellowFilter,
    };
  }

  return {
    ...defaultConfig,
    customCategories: legacyConfig.customCategories ?? defaultConfig.customCategories,
    siteName: legacyConfig.siteName ?? defaultConfig.siteName,
    searchMaxPage: legacyConfig.searchMaxPage ?? defaultConfig.searchMaxPage,
    doubanProxyType: legacyConfig.doubanProxyType ?? defaultConfig.doubanProxyType,
    disableYellowFilter: legacyConfig.disableYellowFilter ?? defaultConfig.disableYellowFilter,
    sourceProfiles: [
      ...defaultConfig.sourceProfiles,
      createImportedProfile(legacyConfig.apiSites, Date.now()),
    ],
    activeSourceProfileId: MIGRATED_LEGACY_PROFILE_ID,
  };
};

export class LunaConfig {
  private static instance: LunaConfig;
  private config: AppConfig | null = null;

  private constructor() {}

  static getInstance(): LunaConfig {
    if (!LunaConfig.instance) {
      LunaConfig.instance = new LunaConfig();
    }
    return LunaConfig.instance;
  }

  /**
   * 获取应用配置
   */
  async getConfig(): Promise<AppConfig> {
    if (this.config) return this.config;

    try {
      const stored = await AsyncStorage.getItem(CONFIG_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<AppConfig> | LegacyStoredConfig;
        this.config = normalizeStoredConfig(parsed);

        if (!('sourceProfiles' in parsed) || !('activeSourceProfileId' in parsed)) {
          await AsyncStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(this.config));
        }

        return cloneConfig(this.config);
      }
    } catch (error) {
      console.warn('Failed to load config from storage:', error);
    }

    this.config = createDefaultConfig();
    return cloneConfig(this.config);
  }

  /**
   * 更新应用配置
   */
  async updateConfig(updates: Partial<AppConfig>): Promise<void> {
    const current = await this.getConfig();
    this.config = normalizeStoredConfig({ ...current, ...updates });
    await AsyncStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(this.config));
  }

  /**
   * 获取所有 API 源
   */
  async getApiSites(): Promise<ApiSite[]> {
    const config = await this.getConfig();
    return cloneApiSites(getActiveProfile(config).sites);
  }

  async importSourceProfile(
    fileName: string,
    rawJson: string
  ): Promise<{ profile: SourceProfile; skippedCount: number }> {
    const { sites, skippedCount } = parseLunaTvConfigJson(rawJson);
    if (sites.length === 0) {
      throw new Error('empty_source_profile');
    }

    const current = await this.getConfig();
    const importedAt = Date.now();
    const profile: SourceProfile = {
      id: `imported-${importedAt}`,
      name: buildUniqueProfileName(stripJsonExtension(fileName), current.sourceProfiles),
      type: 'imported',
      importedAt,
      sites: cloneApiSites(sites),
    };

    await this.updateConfig({
      sourceProfiles: [...current.sourceProfiles, profile],
      activeSourceProfileId: profile.id,
    });

    return {
      profile: {
        ...profile,
        sites: cloneApiSites(profile.sites),
      },
      skippedCount,
    };
  }

  async removeSourceProfile(profileId: string): Promise<void> {
    const config = await this.getConfig();
    const profile = config.sourceProfiles.find((item) => item.id === profileId);
    if (!profile) {
      return;
    }

    if (profile.type === 'builtin') {
      throw new Error('builtin_profile_cannot_be_removed');
    }

    const sourceProfiles = config.sourceProfiles.filter((item) => item.id !== profileId);
    const activeSourceProfileId =
      config.activeSourceProfileId === profileId ? BUILTIN_LUNA_PROFILE_ID : config.activeSourceProfileId;

    await this.updateConfig({
      sourceProfiles,
      activeSourceProfileId,
    });
  }

  /**
   * 添加 API 源
   */
  async addApiSite(site: ApiSite): Promise<void> {
    const config = await this.getConfig();
    const activeProfile = getActiveProfile(config);
    const exists = activeProfile.sites.some(s => s.key === site.key);
    if (!exists) {
      const updatedProfiles = config.sourceProfiles.map(profile =>
        profile.id === activeProfile.id
          ? { ...profile, sites: [...profile.sites, site] }
          : profile
      );
      await this.updateConfig({ sourceProfiles: updatedProfiles });
    }
  }

  /**
   * 删除 API 源
   */
  async removeApiSite(key: string): Promise<void> {
    const config = await this.getConfig();
    const activeProfile = getActiveProfile(config);
    const updatedProfiles = config.sourceProfiles.map(profile =>
      profile.id === activeProfile.id
        ? { ...profile, sites: profile.sites.filter(site => site.key !== key) }
        : profile
    );
    await this.updateConfig({ sourceProfiles: updatedProfiles });
  }

  /**
   * 更新 API 源
   */
  async updateApiSite(key: string, updates: Partial<ApiSite>): Promise<void> {
    const config = await this.getConfig();
    const activeProfile = getActiveProfile(config);
    const updatedProfiles = config.sourceProfiles.map(profile =>
      profile.id === activeProfile.id
        ? {
            ...profile,
            sites: profile.sites.map(site => (site.key === key ? { ...site, ...updates } : site)),
          }
        : profile
    );
    await this.updateConfig({ sourceProfiles: updatedProfiles });
  }

  /**
   * 获取搜索请求头
   */
  getSearchHeaders(): Record<string, string> {
    return {
      'User-Agent':
        'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    };
  }

  /**
   * 获取最大搜索页数
   */
  async getSearchMaxPage(): Promise<number> {
    const config = await this.getConfig();
    return config.searchMaxPage;
  }

  /**
   * 获取自定义分类
   */
  async getCustomCategories(): Promise<CustomCategory[]> {
    const config = await this.getConfig();
    return config.customCategories;
  }

  /**
   * 添加自定义分类
   */
  async addCustomCategory(category: CustomCategory): Promise<void> {
    const config = await this.getConfig();
    const exists = config.customCategories.some(c => c.name === category.name);
    if (!exists) {
      await this.updateConfig({ customCategories: [...config.customCategories, category] });
    }
  }

  /**
   * 删除自定义分类
   */
  async removeCustomCategory(name: string): Promise<void> {
    const config = await this.getConfig();
    await this.updateConfig({
      customCategories: config.customCategories.filter(category => category.name !== name),
    });
  }

  /**
   * 重置为默认配置
   */
  async resetToDefault(): Promise<void> {
    this.config = createDefaultConfig();
    await AsyncStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(this.config));
  }
}

// 导出单例实例
export const lunaConfig = LunaConfig.getInstance();
