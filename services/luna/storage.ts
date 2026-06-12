// services/luna/storage.ts
// AsyncStorage 存储实现 - 本地数据持久化

import AsyncStorage from '@react-native-async-storage/async-storage';
import { PlayRecord, Favorite } from './types';

// 存储键名
const STORAGE_KEYS = {
  PLAY_RECORDS: '@lunatv_play_records',
  FAVORITES: '@lunatv_favorites',
  SEARCH_HISTORY: '@lunatv_search_history',
  USER_CONFIG: '@lunatv_user_config',
  AUTH_TOKEN: '@lunatv_auth_token',
};

/**
 * 播放记录管理
 */
export const playRecordsStorage = {
  /**
   * 获取所有播放记录
   */
  async getAll(): Promise<Record<string, PlayRecord>> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.PLAY_RECORDS);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  },

  /**
   * 获取单个播放记录
   */
  async get(key: string): Promise<PlayRecord | null> {
    try {
      const records = await this.getAll();
      return records[key] || null;
    } catch {
      return null;
    }
  },

  /**
   * 保存播放记录
   */
  async save(key: string, record: PlayRecord): Promise<void> {
    try {
      const records = await this.getAll();
      records[key] = { ...record, save_time: Date.now() };
      await AsyncStorage.setItem(STORAGE_KEYS.PLAY_RECORDS, JSON.stringify(records));
    } catch (error) {
      console.error('Failed to save play record:', error);
    }
  },

  /**
   * 删除播放记录
   */
  async remove(key: string): Promise<void> {
    try {
      const records = await this.getAll();
      delete records[key];
      await AsyncStorage.setItem(STORAGE_KEYS.PLAY_RECORDS, JSON.stringify(records));
    } catch (error) {
      console.error('Failed to remove play record:', error);
    }
  },

  /**
   * 清空所有播放记录
   */
  async clear(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEYS.PLAY_RECORDS);
  },

  /**
   * 获取最近的播放记录
   */
  async getRecent(limit: number = 10): Promise<PlayRecord[]> {
    try {
      const records = await this.getAll();
      const sorted = Object.values(records).sort((a, b) => b.save_time - a.save_time);
      return sorted.slice(0, limit);
    } catch {
      return [];
    }
  },
};

/**
 * 收藏管理
 */
export const favoritesStorage = {
  /**
   * 获取所有收藏
   */
  async getAll(): Promise<Record<string, Favorite>> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.FAVORITES);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  },

  /**
   * 获取单个收藏
   */
  async get(key: string): Promise<Favorite | null> {
    try {
      const favorites = await this.getAll();
      return favorites[key] || null;
    } catch {
      return null;
    }
  },

  /**
   * 添加收藏
   */
  async add(key: string, favorite: Favorite): Promise<void> {
    try {
      const favorites = await this.getAll();
      favorites[key] = { ...favorite, save_time: Date.now() };
      await AsyncStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favorites));
    } catch (error) {
      console.error('Failed to add favorite:', error);
    }
  },

  /**
   * 删除收藏
   */
  async remove(key: string): Promise<void> {
    try {
      const favorites = await this.getAll();
      delete favorites[key];
      await AsyncStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favorites));
    } catch (error) {
      console.error('Failed to remove favorite:', error);
    }
  },

  /**
   * 清空所有收藏
   */
  async clear(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEYS.FAVORITES);
  },

  /**
   * 检查是否已收藏
   */
  async isFavorite(key: string): Promise<boolean> {
    try {
      const favorites = await this.getAll();
      return !!favorites[key];
    } catch {
      return false;
    }
  },
};

/**
 * 搜索历史管理
 */
export const searchHistoryStorage = {
  /**
   * 获取所有搜索历史
   */
  async getAll(): Promise<string[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.SEARCH_HISTORY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  /**
   * 添加搜索历史
   */
  async add(keyword: string): Promise<void> {
    try {
      const history = await this.getAll();
      const newHistory = [keyword, ...history.filter(k => k !== keyword)].slice(0, 50);
      await AsyncStorage.setItem(STORAGE_KEYS.SEARCH_HISTORY, JSON.stringify(newHistory));
    } catch (error) {
      console.error('Failed to add search history:', error);
    }
  },

  /**
   * 删除搜索历史
   */
  async remove(keyword: string): Promise<void> {
    try {
      const history = await this.getAll();
      const newHistory = history.filter(k => k !== keyword);
      await AsyncStorage.setItem(STORAGE_KEYS.SEARCH_HISTORY, JSON.stringify(newHistory));
    } catch (error) {
      console.error('Failed to remove search history:', error);
    }
  },

  /**
   * 清空搜索历史
   */
  async clear(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEYS.SEARCH_HISTORY);
  },
};

/**
 * 认证令牌管理
 */
export const authStorage = {
  /**
   * 获取认证令牌
   */
  async getToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    } catch {
      return null;
    }
  },

  /**
   * 设置认证令牌
   */
  async setToken(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
    } catch (error) {
      console.error('Failed to save auth token:', error);
    }
  },

  /**
   * 清除认证令牌
   */
  async clearToken(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
  },
};

/**
 * 清除所有数据
 */
export async function clearAllData(): Promise<void> {
  await Promise.all([
    AsyncStorage.removeItem(STORAGE_KEYS.PLAY_RECORDS),
    AsyncStorage.removeItem(STORAGE_KEYS.FAVORITES),
    AsyncStorage.removeItem(STORAGE_KEYS.SEARCH_HISTORY),
    AsyncStorage.removeItem(STORAGE_KEYS.USER_CONFIG),
    AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN),
  ]);
}
