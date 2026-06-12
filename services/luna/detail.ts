// services/luna/detail.ts
// 视频详情获取逻辑

import { ApiSite, VideoDetail, Episode, EpisodeGroup } from './types';
import { lunaConfig } from './config';
import { searchVideos } from './search';

/**
 * 解析剧集分组
 * 格式: "源1$$$源2" -> 每个源: "标题1$url1#标题2$url2"
 */
function parseEpisodeGroups(vodPlayUrl: string): EpisodeGroup[] {
  if (!vodPlayUrl) return [];

  const groups: EpisodeGroup[] = [];
  const sources = vodPlayUrl.split('$$$');

  for (let i = 0; i < sources.length; i++) {
    const source = sources[i];
    const episodes: Episode[] = [];
    const episodeList = source.split('#');

    for (const episode of episodeList) {
      const parts = episode.split('$');
      if (parts.length === 2) {
        const [title, url] = parts;
        if (url && url.includes('.m3u8')) {
          episodes.push({ title: title.trim(), url });
        }
      }
    }

    if (episodes.length > 0) {
      groups.push({
        name: sources.length > 1 ? `源 ${i + 1}` : '默认',
        episodes,
      });
    }
  }

  return groups;
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
    .trim();
}

/**
 * 从 API 获取视频详情
 */
export async function getVideoDetail(
  source: string,
  id: string
): Promise<VideoDetail | null> {
  const sites = await lunaConfig.getApiSites();
  const site = sites.find(s => s.key === source);

  if (!site) {
    console.warn(`Source not found: ${source}`);
    return null;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const url = `${site.api}?ac=videolist&ids=${id}`;
    const response = await fetch(url, {
      headers: lunaConfig.getSearchHeaders(),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`Detail fetch failed: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const item = data.list?.[0];

    if (!item) return null;

    const episodeGroups = parseEpisodeGroups(item.vod_play_url || '');

    return {
      id: String(item.vod_id),
      title: item.vod_name || '',
      poster: item.vod_pic || '',
      source: site.key,
      source_name: site.name,
      desc: cleanHtmlTags(item.vod_content || ''),
      type: item.type_name || '',
      year: item.vod_year || '',
      area: item.vod_area || '',
      director: item.vod_director || '',
      actor: item.vod_actor || '',
      remarks: item.vod_remarks || '',
      episodes: episodeGroups,
    };
  } catch (error: any) {
    if (error.name !== 'AbortError') {
      console.error(`Detail fetch error:`, error.message);
    }
    return null;
  }
}

/**
 * 通过搜索获取视频详情 (备用方案)
 * 先搜索匹配标题，再获取详情
 */
export async function getVideoDetailBySearch(
  title: string,
  source: string
): Promise<VideoDetail | null> {
  const results = await searchVideos(title, 1);

  // 精确匹配标题
  const match = results.find(
    r => r.title === title && r.source === source
  );

  if (!match) return null;

  return getVideoDetail(match.source, match.id);
}

/**
 * 获取视频播放地址
 */
export async function getVideoPlayUrl(
  source: string,
  id: string,
  episodeIndex: number = 0
): Promise<string | null> {
  const detail = await getVideoDetail(source, id);

  if (!detail?.episodes || detail.episodes.length === 0) {
    return null;
  }

  const firstGroup = detail.episodes[0];
  if (episodeIndex >= firstGroup.episodes.length) {
    return null;
  }

  return firstGroup.episodes[episodeIndex].url;
}
