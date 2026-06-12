const DOUBAN_IMAGE_HOST_PATTERN = /^https?:\/\/img\d*\.doubanio\.com(\/.*)?$/i;
const DOUBAN_IMAGE_PROXY_BASE = "https://img.doubanio.cmliussss.net";

export type AppImageSource = {
  uri: string;
};

export function isDoubanImageUrl(url: string): boolean {
  return DOUBAN_IMAGE_HOST_PATTERN.test(url);
}

export function rewriteDoubanImageUrl(url: string): string {
  if (!url) return url;

  const match = url.match(DOUBAN_IMAGE_HOST_PATTERN);
  if (!match) {
    return url;
  }

  return `${DOUBAN_IMAGE_PROXY_BASE}${match[1] || ""}`;
}

export function buildImageSource(url: string): AppImageSource {
  return { uri: rewriteDoubanImageUrl(url) };
}
