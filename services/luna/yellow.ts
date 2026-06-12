// services/luna/yellow.ts
// 内容过滤 - 过滤成人内容

// 成人内容关键词列表
const YELLOW_WORDS = [
  '伦理片',
  'AV',
  '三级',
  '色情',
  '成人',
  '18+',
  'R18',
  '无码',
  '有码',
  '步兵',
  '骑兵',
  '番号',
  '女优',
  '男优',
  'S1',
  'SOD',
  'MOODYZ',
  'PRESTIGE',
  'kawaii',
  'FALENO',
  'Madonna',
  'Attackers',
  'SOPHIE',
  'OPPAI',
  'E-BODY',
  'kira☆kira',
  'S1 NO.1 STYLE',
  '一本道',
  '东京热',
  '加勒比',
  '91制片厂',
  '香蕉影视',
];

/**
 * 检查是否为成人内容
 */
export function isYellowContent(text: string): boolean {
  if (!text) return false;

  const lowerText = text.toLowerCase();
  return YELLOW_WORDS.some(word =>
    lowerText.includes(word.toLowerCase())
  );
}

/**
 * 过滤搜索结果中的成人内容
 */
export function filterYellowContent<T extends { title: string; type_name?: string }>(
  items: T[],
  enabled: boolean = true
): T[] {
  if (!enabled) return items;

  return items.filter(item => {
    const textToCheck = `${item.title} ${item.type_name || ''}`;
    return !isYellowContent(textToCheck);
  });
}

/**
 * 获取过滤关键词列表 (用于设置页面显示)
 */
export function getYellowWords(): string[] {
  return [...YELLOW_WORDS];
}
