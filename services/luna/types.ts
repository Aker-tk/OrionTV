// services/luna/types.ts
// LunaTV 核心数据类型定义

export interface SearchResult {
  id: string;
  title: string;
  poster: string;
  episodes: string[];
  episodes_titles?: string[];
  source: string;
  source_name: string;
  class?: string;
  year: string;
  desc?: string;
  type_name?: string;
  douban_id?: string;
}

export interface VideoDetail {
  id: string;
  title: string;
  poster: string;
  source: string;
  source_name: string;
  desc?: string;
  type?: string;
  year?: string;
  area?: string;
  director?: string;
  actor?: string;
  remarks?: string;
  episodes?: EpisodeGroup[];
}

export interface EpisodeGroup {
  name: string;
  episodes: Episode[];
}

export interface Episode {
  title: string;
  url: string;
}

export interface ApiSite {
  key: string;
  api: string;
  name: string;
  detail?: string;
}

export interface SourceProfile {
  id: string;
  name: string;
  type: 'builtin' | 'imported';
  sites: ApiSite[];
  importedAt?: number;
}

export interface DoubanItem {
  id: string;
  title: string;
  poster: string;
  rate?: string;
  year?: string;
}

export interface DoubanResponse {
  code: number;
  message: string;
  list: DoubanItem[];
}

export interface PlayRecord {
  title: string;
  source_name: string;
  cover: string;
  index: number;
  total_episodes: number;
  play_time: number;
  total_time: number;
  save_time: number;
  year: string;
  search_title?: string;
}

export interface Favorite {
  cover: string;
  title: string;
  source_name: string;
  total_episodes: number;
  search_title: string;
  year: string;
  save_time?: number;
  origin?: string;
}

export interface AppConfig {
  sourceProfiles: SourceProfile[];
  activeSourceProfileId: string;
  customCategories: CustomCategory[];
  siteName: string;
  searchMaxPage: number;
  doubanProxyType: string;
  disableYellowFilter: boolean;
}

export interface CustomCategory {
  name: string;
  type: string;
  query: string;
}
