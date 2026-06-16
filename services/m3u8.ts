import { PerfTracker } from '@/utils/PerfTracker';

interface CacheEntry {
  resolution: string | null;
  timestamp: number;
}

const resolutionCache: { [url: string]: CacheEntry } = {};
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const getResolutionFromM3U8 = async (
  url: string,
  signal?: AbortSignal
): Promise<string | null> => {
  // 1. Check cache first
  const cachedEntry = resolutionCache[url];
  if (cachedEntry && Date.now() - cachedEntry.timestamp < CACHE_DURATION) {
    PerfTracker.time("M3U8", "resolution-cache-hit", () => null, cachedEntry.resolution ?? "unknown");
    return cachedEntry.resolution;
  }

  const urlPath = url.split(/[?#]/)[0];
  if (!urlPath.toLowerCase().endsWith(".m3u8")) {
    return null;
  }

  try {
    return await PerfTracker.timeAsync("M3U8", "resolution-detect", async () => {
      const response = await fetch(url, { signal });
      if (!response.ok) {
        return null;
      }

      const playlist = await response.text();
      const lines = playlist.split("\n");
      let highestResolution = 0;
      let resolutionString: string | null = null;

      for (const line of lines) {
        if (line.startsWith("#EXT-X-STREAM-INF")) {
          const resolutionMatch = line.match(/RESOLUTION=(\d+)x(\d+)/);
          if (resolutionMatch) {
            const height = parseInt(resolutionMatch[2], 10);
            if (height > highestResolution) {
              highestResolution = height;
              resolutionString = `${height}p`;
            }
          }
        }
      }

      // 2. Store result in cache
      resolutionCache[url] = {
        resolution: resolutionString,
        timestamp: Date.now(),
      };

      return resolutionString;
    });
  } catch (error) {
    if ((error as Error).name === "AbortError") {
      throw error;
    }

    return null;
  }
};
