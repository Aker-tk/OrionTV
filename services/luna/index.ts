// services/luna/index.ts
// LunaTV 核心逻辑统一导出

// 配置管理
export { lunaConfig, LunaConfig } from './config';
export {
  buildUniqueProfileName,
  normalizeProfileSiteKey,
  parseLunaTvConfigJson,
  stripJsonExtension,
} from './sourceProfileUtils';

// 搜索功能
export { searchVideos, searchFromSingleSource, deduplicateResults, clearSearchCache } from './search';

// 详情获取
export { getVideoDetail, getVideoDetailBySearch, getVideoPlayUrl } from './detail';

// 豆瓣数据
export { getDoubanData, getDoubanCategories, getDoubanTop250, getDoubanRecommends } from './douban';

// 内容过滤
export { isYellowContent, filterYellowContent, getYellowWords } from './yellow';

// 工具函数
export { cleanHtmlTags, truncateText, formatTime, generateId, delay, debounce, throttle, processImageUrl, safeJsonParse, getNestedValue } from './utils';

// 存储
export { playRecordsStorage, favoritesStorage, searchHistoryStorage, authStorage, clearAllData } from './storage';

// 类型定义
export * from './types';
