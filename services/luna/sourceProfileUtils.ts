import { ApiSite, SourceProfile } from "./types";

type LunaTvSourceEntry = {
  api?: unknown;
  detail?: unknown;
  name?: unknown;
};

type LunaTvConfig = {
  api_site?: Record<string, LunaTvSourceEntry>;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function normalizeProfileSiteKey(host: string): string {
  return host
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}

export function stripJsonExtension(fileName: string): string {
  return fileName.replace(/\.json$/i, "") || "导入的源";
}

export function normalizeSourceProfileImportUrl(rawUrl: string): string {
  const trimmedUrl = rawUrl.trim();

  try {
    const url = new URL(trimmedUrl);
    const pathSegments = url.pathname.split("/").filter(Boolean);
    const isGitHubBlobUrl =
      url.hostname === "github.com" &&
      pathSegments.length >= 5 &&
      pathSegments[2] === "blob";

    if (!isGitHubBlobUrl) {
      return trimmedUrl;
    }

    const [owner, repo, , branch, ...filePathSegments] = pathSegments;
    return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePathSegments.join("/")}`;
  } catch {
    return trimmedUrl;
  }
}

export function buildUniqueProfileName(baseName: string, profiles: SourceProfile[]): string {
  const trimmedBaseName = baseName.trim() || "导入的源";
  const existingNames = new Set(profiles.map((profile) => profile.name));

  if (!existingNames.has(trimmedBaseName)) {
    return trimmedBaseName;
  }

  let index = 2;
  let candidate = `${trimmedBaseName} (${index})`;
  while (existingNames.has(candidate)) {
    index += 1;
    candidate = `${trimmedBaseName} (${index})`;
  }

  return candidate;
}

export function parseLunaTvConfigJson(raw: string): { sites: ApiSite[]; skippedCount: number } {
  const parsed = JSON.parse(raw) as LunaTvConfig;
  if (!parsed?.api_site || typeof parsed.api_site !== "object" || Array.isArray(parsed.api_site)) {
    throw new Error("unsupported_lunatv_config");
  }

  const sitesByKey = new Map<string, ApiSite>();
  let skippedCount = 0;

  for (const [host, value] of Object.entries(parsed.api_site)) {
    if (
      !value ||
      typeof value !== "object" ||
      !isNonEmptyString(value.name) ||
      !isNonEmptyString(value.api)
    ) {
      skippedCount += 1;
      continue;
    }

    const key = normalizeProfileSiteKey(host);
    sitesByKey.set(key, {
      key,
      name: value.name.trim(),
      api: value.api.trim(),
      detail: isNonEmptyString(value.detail) ? value.detail.trim() : undefined,
    });
  }

  return {
    sites: [...sitesByKey.values()],
    skippedCount,
  };
}
