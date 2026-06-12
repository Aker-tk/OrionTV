// services/luna/douban.ts
// 豆瓣数据获取 - 使用稳定图片代理避免设备侧直连崩溃

import { DoubanItem, DoubanResponse } from './types';

// 豆瓣 API 基础 URL
const DOUBAN_API = {
  search: 'https://movie.douban.com/j/search_subjects',
  categories: 'https://m.douban.com/rexxar/api/v2/subject/recent_hot',
  recommends: 'https://m.douban.com/rexxar/api/v2',
  top250: 'https://movie.douban.com/top250',
};

// 获取请求头
function getHeaders(): Record<string, string> {
  return {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    'Referer': 'https://movie.douban.com/',
  };
}

/**
 * 处理图片 URL
 */
function processImageUrl(url: string): string {
  return url;
}

/**
 * 获取豆瓣标签列表
 */
export async function getDoubanData(
  type: 'movie' | 'tv',
  tag: string,
  pageSize: number = 16,
  pageStart: number = 0
): Promise<DoubanResponse> {
  try {
    const url = `${DOUBAN_API.search}?type=${type}&tag=${encodeURIComponent(tag)}&sort=recommend&page_limit=${pageSize}&page_start=${pageStart}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      headers: getHeaders(),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Douban API error: ${response.status}`);
    }

    const data = await response.json();

    // 处理图片 URL
    const list = (data.subjects || []).map((item: any) => ({
      id: item.id,
      title: item.title,
      poster: processImageUrl(item.cover),
      rate: item.rate,
      year: item.year,
    }));

    return {
      code: 0,
      message: 'success',
      list,
    };
  } catch (error: any) {
    console.error('Douban fetch error:', error.message);
    return {
      code: -1,
      message: error.message,
      list: [],
    };
  }
}

/**
 * 获取豆瓣分类数据
 */
export async function getDoubanCategories(
  kind: 'movie' | 'tv',
  category?: string,
  start: number = 0,
  limit: number = 20
): Promise<DoubanResponse> {
  try {
    let url = `${DOUBAN_API.categories}/${kind}?start=${start}&limit=${limit}`;

    if (category) {
      url += `&category=${encodeURIComponent(category)}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      headers: getHeaders(),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Douban categories error: ${response.status}`);
    }

    const data = await response.json();
    const items = data.items || data.subjects || [];

    const list = items.map((item: any) => ({
      id: item.id || item.subject?.id || '',
      title: item.title || item.subject?.title || '',
      poster: processImageUrl(item.cover?.url || item.subject?.cover?.url || ''),
      rate: item.rating?.value?.toString() || item.subject?.rating?.value?.toString(),
      year: item.year || item.subject?.year || '',
    }));

    return {
      code: 0,
      message: 'success',
      list,
    };
  } catch (error: any) {
    console.error('Douban categories error:', error.message);
    return {
      code: -1,
      message: error.message,
      list: [],
    };
  }
}

/**
 * 获取豆瓣 Top250
 */
export async function getDoubanTop250(
  start: number = 0,
  limit: number = 25
): Promise<DoubanResponse> {
  try {
    const url = `${DOUBAN_API.top250}?start=${start}&filter=`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      headers: getHeaders(),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Douban top250 error: ${response.status}`);
    }

    const html = await response.text();

    // 使用正则提取数据
    const items: DoubanItem[] = [];
    const regex = /<div class="item">[\s\S]*?<img[^>]+src="([^"]+)"[\s\S]*?<span class="rating_num"[^>]*>([^<]*)<\/span>[\s\S]*?<div class="hd">[\s\S]*?<span class="title">([^<]*)<\/span>/g;

    let match;
    while ((match = regex.exec(html)) !== null && items.length < limit) {
      items.push({
        id: String(items.length + start + 1),
        title: match[3],
        poster: processImageUrl(match[1]),
        rate: match[2],
      });
    }

    return {
      code: 0,
      message: 'success',
      list: items,
    };
  } catch (error: any) {
    console.error('Douban top250 error:', error.message);
    return {
      code: -1,
      message: error.message,
      list: [],
    };
  }
}

/**
 * 获取豆瓣推荐
 */
export async function getDoubanRecommends(
  kind: 'movie' | 'tv',
  tags: string[] = [],
  start: number = 0,
  limit: number = 20
): Promise<DoubanResponse> {
  try {
    const selectedCategories = JSON.stringify({});
    const tagsParam = tags.length > 0 ? tags.join(',') : '';
    
    let url = `${DOUBAN_API.recommends}/${kind}/recommend?start=${start}&limit=${limit}`;
    if (tagsParam) {
      url += `&tags=${encodeURIComponent(tagsParam)}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      headers: getHeaders(),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Douban recommends error: ${response.status}`);
    }

    const data = await response.json();
    const items = data.items || data.subjects || [];

    const list = items.map((item: any) => ({
      id: item.id || item.subject?.id || '',
      title: item.title || item.subject?.title || '',
      poster: processImageUrl(item.cover?.url || item.subject?.cover?.url || ''),
      rate: item.rating?.value?.toString() || item.subject?.rating?.value?.toString(),
      year: item.year || item.subject?.year || '',
    }));

    return {
      code: 0,
      message: 'success',
      list,
    };
  } catch (error: any) {
    console.error('Douban recommends error:', error.message);
    return {
      code: -1,
      message: error.message,
      list: [],
    };
  }
}
