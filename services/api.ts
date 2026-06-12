// services/api.ts
// 集成本地 LunaTV 逻辑的 API 接口

import AsyncStorage from "@react-native-async-storage/async-storage";
import { LOCAL_MODE_BASE_URL } from "@/utils/localMode";
import {
  lunaConfig,
  searchVideos as lunaSearchVideos,
  searchFromSingleSource,
  getVideoDetail as lunaGetVideoDetail,
  getDoubanData as lunaGetDoubanData,
  getDoubanCategories as lunaGetDoubanCategories,
  getDoubanTop250 as lunaGetDoubanTop250,
  playRecordsStorage,
  favoritesStorage,
  searchHistoryStorage,
  filterYellowContent,
  VideoDetail,
  DoubanResponse,
  ApiSite,
} from "./luna";
import { filterMatchingResults } from "./searchMatching";

// region: --- Interface Definitions ---
export interface DoubanItem {
  title: string;
  poster: string;
  rate?: string;
}

export interface DoubanResponseLegacy {
  code: number;
  message: string;
  list: DoubanItem[];
}

export interface VideoDetailLegacy {
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
}

export interface SearchResultLegacy {
  id: string;
  title: string;
  poster: string;
  episodes: string[];
  source: string;
  source_name: string;
  class?: string;
  year: string;
  desc?: string;
  type_name?: string;
}

export interface FavoriteLegacy {
  cover: string;
  title: string;
  source_name: string;
  total_episodes: number;
  search_title: string;
  year: string;
  save_time?: number;
}

export interface PlayRecordLegacy {
  title: string;
  source_name: string;
  cover: string;
  index: number;
  total_episodes: number;
  play_time: number;
  total_time: number;
  save_time: number;
  year: string;
}

export interface ApiSiteLegacy {
  key: string;
  api: string;
  name: string;
  detail?: string;
}

export type SearchResult = SearchResultLegacy;
export type PlayRecord = PlayRecordLegacy;
export type Favorite = FavoriteLegacy;

export interface ServerConfig {
  SiteName: string;
  StorageType: "localstorage" | "redis" | string;
}

export class API {
  public baseURL: string = LOCAL_MODE_BASE_URL;

  constructor(baseURL?: string) {
    if (baseURL) {
      this.baseURL = baseURL;
    }
  }

  public setBaseUrl(url: string) {
    this.baseURL = url;
  }

  /**
   * 登录 (本地模式简化为配置验证)
   */
  async login(username?: string | undefined, password?: string): Promise<{ ok: boolean }> {
    // 本地模式无需真正的登录，直接返回成功
    await AsyncStorage.setItem("authCookies", "local_mode");
    return { ok: true };
  }

  /**
   * 登出
   */
  async logout(): Promise<{ ok: boolean }> {
    await AsyncStorage.removeItem("authCookies");
    return { ok: true };
  }

  /**
   * 获取服务器配置
   */
  async getServerConfig(): Promise<ServerConfig> {
    const config = await lunaConfig.getConfig();
    return {
      SiteName: config.siteName,
      StorageType: "localstorage",
    };
  }

  /**
   * 获取收藏列表
   */
  async getFavorites(key?: string): Promise<Record<string, Favorite> | Favorite | null> {
    if (key) {
      const favorites = await favoritesStorage.getAll();
      return favorites[key] || null;
    }
    return await favoritesStorage.getAll();
  }

  /**
   * 添加收藏
   */
  async addFavorite(key: string, favorite: Omit<Favorite, "save_time">): Promise<{ success: boolean }> {
    await favoritesStorage.add(key, favorite as Favorite);
    return { success: true };
  }

  /**
   * 删除收藏
   */
  async deleteFavorite(key?: string): Promise<{ success: boolean }> {
    if (key) {
      await favoritesStorage.remove(key);
    } else {
      await favoritesStorage.clear();
    }
    return { success: true };
  }

  /**
   * 获取播放记录
   */
  async getPlayRecords(): Promise<Record<string, PlayRecord>> {
    return await playRecordsStorage.getAll();
  }

  /**
   * 保存播放记录
   */
  async savePlayRecord(key: string, record: Omit<PlayRecord, "save_time">): Promise<{ success: boolean }> {
    await playRecordsStorage.save(key, record as PlayRecord);
    return { success: true };
  }

  /**
   * 删除播放记录
   */
  async deletePlayRecord(key?: string): Promise<{ success: boolean }> {
    if (key) {
      await playRecordsStorage.remove(key);
    } else {
      await playRecordsStorage.clear();
    }
    return { success: true };
  }

  /**
   * 获取搜索历史
   */
  async getSearchHistory(): Promise<string[]> {
    return await searchHistoryStorage.getAll();
  }

  /**
   * 添加搜索历史
   */
  async addSearchHistory(keyword: string): Promise<string[]> {
    await searchHistoryStorage.add(keyword);
    return await searchHistoryStorage.getAll();
  }

  /**
   * 删除搜索历史
   */
  async deleteSearchHistory(keyword?: string): Promise<{ success: boolean }> {
    if (keyword) {
      await searchHistoryStorage.remove(keyword);
    } else {
      await searchHistoryStorage.clear();
    }
    return { success: true };
  }

  /**
   * 获取图片代理 URL
   */
  getImageProxyUrl(imageUrl: string): string {
    // 已经在 douban.ts 中处理了 CDN 代理，直接返回原 URL
    return imageUrl;
  }

  /**
   * 获取豆瓣数据
   */
  async getDoubanData(
    type: "movie" | "tv",
    tag: string,
    pageSize: number = 16,
    pageStart: number = 0
  ): Promise<DoubanResponseLegacy> {
    return await lunaGetDoubanData(type, tag, pageSize, pageStart);
  }

  /**
   * 获取豆瓣分类数据
   */
  async getDoubanCategories(
    kind: "movie" | "tv",
    category?: string,
    start: number = 0,
    limit: number = 20
  ): Promise<DoubanResponseLegacy> {
    return await lunaGetDoubanCategories(kind, category, start, limit);
  }

  /**
   * 获取豆瓣 Top250
   */
  async getDoubanTop250(
    start: number = 0,
    limit: number = 25
  ): Promise<DoubanResponseLegacy> {
    return await lunaGetDoubanTop250(start, limit);
  }

  /**
   * 搜索视频
   */
  async searchVideos(query: string): Promise<{ results: SearchResultLegacy[] }> {
    const results = await lunaSearchVideos(query);
    return { results };
  }

  /**
   * 从单个源搜索
   */
  async searchVideo(query: string, resourceId: string, signal?: AbortSignal): Promise<{ results: SearchResultLegacy[] }> {
    const results = await searchFromSingleSource(resourceId, query);
    return { results: filterMatchingResults(query, results) };
  }

  /**
   * 获取资源列表
   */
  async getResources(signal?: AbortSignal): Promise<ApiSiteLegacy[]> {
    return await lunaConfig.getApiSites();
  }

  /**
   * 获取视频详情
   */
  async getVideoDetail(source: string, id: string): Promise<VideoDetailLegacy> {
    const detail = await lunaGetVideoDetail(source, id);
    if (!detail) {
      throw new Error("Video not found");
    }
    return {
      id: detail.id,
      title: detail.title,
      poster: detail.poster,
      source: detail.source,
      source_name: detail.source_name,
      desc: detail.desc,
      type: detail.type,
      year: detail.year,
      area: detail.area,
      director: detail.director,
      actor: detail.actor,
      remarks: detail.remarks,
    };
  }
}

// 默认实例
export let api = new API();
