export const LOCAL_MODE_BASE_URL = "local://lunatv";

export function isLocalModeApiBaseUrl(value?: string | null): boolean {
  return !value || !value.trim() || value.trim() === LOCAL_MODE_BASE_URL;
}

export function normalizeApiBaseUrl(value?: string | null): string {
  if (isLocalModeApiBaseUrl(value)) {
    return LOCAL_MODE_BASE_URL;
  }

  let normalized = value!.trim();
  if (normalized.endsWith("/")) {
    normalized = normalized.slice(0, -1);
  }

  if (!/^https?:\/\//i.test(normalized)) {
    const hostPart = normalized.split("/")[0];
    const isIpAddress = /^((\d{1,3}\.){3}\d{1,3})(:\d+)?$/.test(hostPart);
    const hasPort = /:\d+/.test(hostPart);
    normalized = `${isIpAddress || hasPort ? "http" : "https"}://${normalized}`;
  }

  return normalized;
}
