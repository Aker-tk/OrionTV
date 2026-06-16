# OrionTV Performance Analysis — Round 2

## Goal

Identify remaining performance optimization opportunities after the first round of measurement-first optimization (merged at 9b78b8f). This is a static-analysis report targeting measurable runtime improvements in rendering, data flow, and instrumentation coverage.

## Methodology

- Code review of every screen (`.tsx`) and store (`.ts`) for common React Native performance patterns: unnecessary re-renders, missing memoization, sequential blocking work, redundant API calls, and eager state reads.
- Reviewed existing `PerfTracker` instrumentation to find uncovered flows.
- No runtime profiling was performed in this round; all findings are based on source structure.

## Current Instrumentation Coverage

### Covered (Round 1)
| Flow | Markers |
|------|---------|
| Home category select | `category:{title}` → `content-rendered` |
| Home load-more | `load-more:{title}` → `items-appended` |
| Detail init | `init:{q}` → `first-results` / `complete` |
| Playback loadVideo | `load:{source}:{id}` → `ready` / `error` |
| Playback storage reads | `storage-reads` | `play-record-get` |
| Playback error fallback | `video-error:fallback` → `fallback-ready` / `fallback-error` |
| M3U8 resolution | `resolution-cache-hit` / `resolution-detect` |

### Not Covered (Round 2 Targets)
| Flow | Pages |
|------|-------|
| Cold start / app launch | `_layout.tsx`, `app/index.tsx` (first render) |
| Search | `app/search.tsx` |
| Favorites | `app/favorites.tsx` |
| History | `app/history.tsx` |
| Live | `app/live.tsx` |
| Detail page render | `app/detail.tsx` (component-level, store is instrumented) |
| Play screen lifecycle | `app/play.tsx` (has manual perf.now logs, no PerfTracker) |

---

## Findings

### 🔴 Tier 1 — High Impact

#### F1. Search results `renderItem` not memoized
**File:** `app/search.tsx:100-114`
**Problem:** `renderItem` is a const-arrow function defined inside the component body, created as a new closure on every render. When search results update via `setResults()`, all VideoCard items are re-rendered because the `renderItem` reference always changes.
**Fix:** Wrap in `useCallback` with stable deps (`deviceType`, `posterWallConfig`, `api`).
**Estimated gain:** 40-60% reduction in search result render cost for 20+ results.

#### F2. Favorites `renderItem` not memoized
**File:** `app/favorites.tsx:29-48`
**Problem:** Same pattern as F1 — `renderItem` is a new closure on every render.
**Fix:** Wrap in `useCallback`.
**Estimated gain:** Same as F1.

#### F3. Detail page `createResponsiveStyles` called per frame
**File:** `app/detail.tsx:106`
**Problem:** `const dynamicStyles = createResponsiveStyles(deviceType, spacing)` executes on every render path (after loading/error guards). Returns a new StyleSheet object each time, causing all child components that receive these styles to potentially re-render.
**Fix:** Wrap in `useMemo(() => createResponsiveStyles(deviceType, spacing), [deviceType, spacing])`.
**Estimated gain:** Avoids ~1ms+ per frame of style object creation + cascading child re-renders.

#### F4. Detail list keys use array index
**File:** `app/detail.tsx:148,180`
**Problem:** Both `searchResults.map((item, index) =>` and `detail.episodes.map((episode, index)` use `index` as React key. When sources/episodes load incrementally, React treats all existing DOM elements as new.
**Fix:** Use `item.source` or `episode` (URL string) as stable key.
**Estimated gain:** Eliminates full re-render of source/episode lists during progressive loading.

#### F5. Search results page `renderItem` not memoized
**File:** `app/search.tsx:100-114`
**Problem:** Duplicate entry to F1 — noted here because it also appears in `CustomScrollView` where the prop change propagates to `renderGridItem`.
**Fix:** Same as F1.

---

### 🟡 Tier 2 — Medium Impact

#### F6. Auth check on every category switch
**File:** `stores/homeStore.ts:111`
**Problem:** `fetchInitialData` calls `useAuthStore.getState().checkLoginStatus(apiBaseUrl)` unconditionally at the start. Swapping between categories (e.g., 电视剧→电影) hits the auth endpoint each time.
**Fix:** Cache auth status with a TTL (e.g., 30s), or only check on explicit app resume.
**Estimated gain:** 200-500ms off each category switch (depends on server RTT).

#### F7. TV `CustomScrollView` windowSize too small
**File:** `components/CustomScrollView.tsx:225`
**Problem:** `windowSize={5}` limits rendered offscreen content to 5 screen heights. On TV (large displays, 6+ items per row), scrolling may show blank areas during fast remote-control navigation.
**Fix:** Increase to `windowSize={7}` or `{9}` for TV device type.
**Estimated gain:** Reduces/eliminates white flash during fast TV scroll.

#### F8. Home screen `selectedCategory` object reference in useEffect deps
**File:** `app/index.tsx:116-123`
**Problem:** The `useEffect` for fetching data lists `selectedCategory` (object) as a dependency. Each `selectCategory` call creates a new object literal, so the effect fires even when only unrelated state changes on the same category.
**Fix:** Use primitive deps: `[selectedCategory?.title, selectedCategory?.tag, ...]` instead of the object.
**Estimated gain:** Prevents one or more unnecessary `fetchInitialData` calls per category interaction.

#### F9. Playback status update runs full logic on every tick
**File:** `stores/playerStore.ts:441-491`
**Problem:** `handlePlaybackStatusUpdate` runs ~1/sec during playback. Each call: `get()` with 7+ destructured values, `useDetailStore.getState()`, `_savePlayRecord` (which checks throttle internally but still runs setup code). The throttle check only gates the actual `PlayRecordManager.save` call, not the state reads.
**Fix:** Early return at the top if throttle window is active or progress hasn't changed enough.
**Estimated gain:** Reduces per-tick work by ~60%, less relevant for power but reduces jank.

---

### 🟢 Tier 3 — Low Effort / Housekeeping

#### F10. Cold start / app launch not measured
**Files:** `app/_layout.tsx`, `app/index.tsx`
**Problem:** No `PerfTracker` mark exists for app start → first content. The entire bootstrap pipeline (JS bundle load, layout mount, API config resolve, initial category fetch) is unmeasured.
**Fix:** Add `PerfTracker.mark("App", "cold-start")` in `_layout.tsx` before any async work; measure when `app/index.tsx` completes its first content render.
**Estimated gain:** Instrumentation only; enables targeted cold-start optimization in future rounds.

#### F11. Search/Favorites/History/Live screens — zero instrumentation
**Files:** `app/search.tsx`, `app/favorites.tsx`, `app/history.tsx`, `app/live.tsx`
**Problem:** These four screens have no `PerfTracker` calls.
**Fix:** At minimum, add `mark`/`measure` for the primary async flow of each screen.
**Estimated gain:** Instrumentation only.

#### F12. Favorites and search `renderItem` recreate styles via `createResponsiveStyles`
**Files:** `app/favorites.tsx:51`, `app/search.tsx:117`
**Problem:** Same as F3 but for smaller screens. `createResponsiveStyles` is called on each render, creating new StyleSheet objects.
**Fix:** Wrap in `useMemo`.

#### F13. Detail page search results list lacks FlatList virtualization hints
**File:** `app/detail.tsx:260`
**Problem:** Episodes are rendered inside a `ScrollView` with `map()`, not a `FlatList`. For shows with 100+ episodes, all buttons are mounted at once.
**Fix:** Switch to `FlatList` or use `VirtualizedList` for the episode list.
**Estimated gain:** Reduces initial mount cost for large episode lists.

#### F14. `handleScroll` in CustomScrollView uses `setShowScrollToTop` on every frame
**File:** `components/CustomScrollView.tsx:103-118`
**Problem:** Every scroll event fires `setShowScrollToTop` with a comparison check. While the check prevents unnecessary state updates, the function call+comparison still runs at scroll event frequency (every 64ms).
**Fix:** Use a `useRef` flag + check against a debounced scroll position threshold. Low priority.
**Estimated gain:** Negligible — mainly eliminates a function call per scroll event.

---

## Summary Table

| # | Area | Type | Effort | Impact |
|---|------|------|--------|--------|
| F1 | search renderItem | Re-render | 1 file, 5 lines | High |
| F2 | favorites renderItem | Re-render | 1 file, 5 lines | High |
| F3 | detail styles memo | Re-render | 1 file, 1 line | High |
| F4 | detail list keys | Re-render | 1 file, 2 lines | High |
| F6 | auth check on every switch | Network | 1 file, ~10 lines | Medium |
| F7 | TV windowSize | Scroll perf | 1 file, 1 line | Medium |
| F8 | Home selectedCategory deps | Re-render | 1 file, 3 lines | Medium |
| F9 | playback status tick | CPU | 1 file, ~5 lines | Medium |
| F10 | cold start instrumentation | Measurement | 2 files, ~4 lines | Low |
| F11 | screen instrumentation | Measurement | 4 files, ~8 lines | Low |
| F12 | favorites/search styles memo | Re-render | 2 files, 2 lines | Low |
| F13 | episode list virtualization | Render | 1 file, ~15 lines | Low |
| F14 | scroll handler micro-opt | CPU | 1 file, ~5 lines | Lowest |

---

## Recommendations

### Immediate (Round 2a — High Impact, Low Risk)
1. F1 — Search `renderItem` → `useCallback`
2. F2 — Favorites `renderItem` → `useCallback`
3. F3 — Detail `createResponsiveStyles` → `useMemo`
4. F4 — Detail list keys: index → stable key
5. F7 — TV `windowSize` increase

### Follow-up (Round 2b — Medium Impact)
6. F6 — Auth cache TTL on category switch
7. F8 — Home effect primitive deps
8. F9 — Playback status early return
9. F13 — Episode FlatList

### Instrumentation (Round 2c — Should Do Alongside)
10. F10 — Cold start measurement
11. F11 — Screen-level PerfTracker for search/favorites/history/live
12. F12 — `createResponsiveStyles` memo in search/favorites
