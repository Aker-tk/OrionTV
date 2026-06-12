// services/luna/search.ts
// 多源视频搜索核心逻辑

import { ApiSite, SearchResult } from './types';
import { lunaConfig } from './config';

// 搜索缓存 (10分钟过期)
const searchCache = new Map<string, { results: SearchResult[]; timestamp: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10 分钟

/**
 * 解析 vod_play_url 格式
 * 格式: "源1$$$源2" -> 每个源: "标题1$url1#标题2$url2"
 */
function parsePlayUrl(vodPlayUrl: string): { title: string; url: string }[] {
  if (!vodPlayUrl) return [];

  const episodes: { title: string; url: string }[] = [];
  const sources = vodPlayUrl.split('$$$');

  // 取第一个源 (通常是主源)
  if (sources.length > 0) {
    const source = sources[0];
    const episodeList = source.split('#');

    for (const episode of episodeList) {
      const parts = episode.split('$');
      if (parts.length === 2) {
        const [title, url] = parts;
        // 只保留 m3u8 链接
        if (url && url.includes('.m3u8')) {
          episodes.push({ title: title.trim(), url });
        }
      }
    }
  }

  return episodes;
}

/**
 * 从单个源搜索
 */
async function searchFromSource(
  site: ApiSite,
  query: string,
  timeout: number = 15000
): Promise<SearchResult[]> {
  const results: SearchResult[] = [];

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const url = `${site.api}?ac=videolist&wd=${encodeURIComponent(query)}`;
    const response = await fetch(url, {
      headers: lunaConfig.getSearchHeaders(),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`Search failed for ${site.name}: ${response.status}`);
      return [];
    }

    const data = await response.json();
    const list = data.list || [];

    for (const item of list) {
      const episodes = parsePlayUrl(item.vod_play_url || '');

      if (episodes.length > 0) {
        results.push({
          id: String(item.vod_id),
          title: item.vod_name || '',
          poster: item.vod_pic || '',
          episodes: episodes.map(e => e.url),
          episodes_titles: episodes.map(e => e.title),
          source: site.key,
          source_name: site.name,
          class: item.vod_class || '',
          year: item.vod_year || '',
          desc: cleanHtmlTags(item.vod_content || ''),
          type_name: item.type_name || '',
          douban_id: item.vod_douban_id || '',
        });
      }
    }
  } catch (error: any) {
    if (error.name !== 'AbortError') {
      console.warn(`Search error for ${site.name}:`, error.message);
    }
  }

  return results;
}

/**
 * 清除 HTML 标签
 */
function cleanHtmlTags(html: string): string {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .trim();
}

/**
 * 获取缓存的搜索结果
 */
function getCachedResults(query: string): SearchResult[] | null {
  const cached = searchCache.get(query);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.results;
  }
  searchCache.delete(query);
  return null;
}

/**
 * 设置搜索缓存
 */
function setCacheResults(query: string, results: SearchResult[]): void {
  // 限制缓存大小
  if (searchCache.size > 100) {
    const firstKey = searchCache.keys().next().value;
    if (firstKey) searchCache.delete(firstKey);
  }
  searchCache.set(query, { results, timestamp: Date.now() });
}

/**
 * 多源搜索 (核心函数)
 * 并发搜索所有启用的 API 源，聚合结果
 */
export async function searchVideos(
  query: string,
  maxPages?: number
): Promise<SearchResult[]> {
  // 检查缓存
  const cachedResults = getCachedResults(query);
  if (cachedResults) {
    return cachedResults;
  }

  const sites = await lunaConfig.getApiSites();
  const searchMaxPage = maxPages || await lunaConfig.getSearchMaxPage();
  const allResults: SearchResult[] = [];

  // 并发搜索所有源
  const searchPromises = sites.map(async (site) => {
    const siteResults: SearchResult[] = [];

    for (let page = 1; page <= searchMaxPage; page++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        let url = `${site.api}?ac=videolist&wd=${encodeURIComponent(query)}`;
        if (page > 1) {
          url += `&pg=${page}`;
        }

        const response = await fetch(url, {
          headers: lunaConfig.getSearchHeaders(),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) break;

        const data = await response.json();
        const list = data.list || [];

        if (list.length === 0) break;

        for (const item of list) {
          const episodes = parsePlayUrl(item.vod_play_url || '');

          if (episodes.length > 0) {
            siteResults.push({
              id: String(item.vod_id),
              title: item.vod_name || '',
              poster: item.vod_pic || '',
              episodes: episodes.map(e => e.url),
              episodes_titles: episodes.map(e => e.title),
              source: site.key,
              source_name: site.name,
              class: item.vod_class || '',
              year: item.vod_year || '',
              desc: cleanHtmlTags(item.vod_content || ''),
              type_name: item.type_name || '',
              douban_id: item.vod_douban_id || '',
            });
          }
        }
      } catch (error) {
        break;
      }
    }

    return siteResults;
  });

  const results = await Promise.allSettled(searchPromises);

  for (const result of results) {
    if (result.status === 'fulfilled') {
      allResults.push(...result.value);
    }
  }

  // 去重并合并
  const deduplicated = deduplicateResults(allResults);

  // 缓存结果
  setCacheResults(query, deduplicated);

  return deduplicated;
}

/**
 * 从单个源搜索
 */
export async function searchFromSingleSource(
  sourceKey: string,
  query: string
): Promise<SearchResult[]> {
  const sites = await lunaConfig.getApiSites();
  const site = sites.find(s => s.key === sourceKey);

  if (!site) {
    console.warn(`Source not found: ${sourceKey}`);
    return [];
  }

  return searchFromSource(site, query);
}

/**
 * 按标题去重并合并结果
 */
export function deduplicateResults(results: SearchResult[]): SearchResult[] {
  const map = new Map<string, SearchResult>();

  for (const result of results) {
    const key = `${result.title}_${result.year}`;
    if (!map.has(key)) {
      map.set(key, result);
    } else {
      // 合并不同源的结果
      const existing = map.get(key)!;
      if (existing.source !== result.source) {
        existing.episodes = [...existing.episodes, ...result.episodes];
        existing.episodes_titles = [
          ...(existing.episodes_titles || []),
          ...(result.episodes_titles || []),
        ];
      }
    }
  }

  return Array.from(map.values());
}

/**
 * 清除搜索缓存
 */
export function clearSearchCache(): void {
  searchCache.clear();
}
