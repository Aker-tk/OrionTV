import type { SearchResult } from "./api";

function normalizeTitle(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[：:]/g, "")
    .replace(/\s+/g, "")
    .replace(/[()[\]【】《》\-_.·,，!?！？'"“”‘’]/g, "");
}

export function isSearchResultMatch(query: string, title: string): boolean {
  const normalizedQuery = normalizeTitle(query);
  const normalizedTitle = normalizeTitle(title);

  if (!normalizedQuery || !normalizedTitle) {
    return false;
  }

  return (
    normalizedTitle === normalizedQuery ||
    normalizedTitle.includes(normalizedQuery) ||
    normalizedQuery.includes(normalizedTitle)
  );
}

export function filterMatchingResults<T extends Pick<SearchResult, "title">>(
  query: string,
  results: T[]
): T[] {
  return results.filter((item) => isSearchResultMatch(query, item.title));
}
