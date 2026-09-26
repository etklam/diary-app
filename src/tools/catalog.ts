export type ToolSlug =
  | 'position-sizing'
  | 'financial-freedom'
  | 'relative-value'
  | 'seasonality'
  | 'etf'
  | 'market-rotation'
  | 'sec-filings';

export type ToolLocale = 'en' | 'zh-TW' | 'zh-CN';

export type PublicTool = {
  slug: ToolSlug;
  category: 'calculator' | 'research';
  name: Record<ToolLocale, string>;
  purpose: Record<ToolLocale, string>;
};

// Mirrors the public tools registry in diary-v3. Native availability is shown
// by the directory UI so the source catalog cannot be mistaken for shipped work.
export const publicTools: readonly PublicTool[] = [
  {
    slug: 'position-sizing', category: 'calculator',
    name: { en: 'Position sizing', 'zh-TW': '部位計算', 'zh-CN': '仓位计算' },
    purpose: {
      en: 'Split a planned position into whole-share batches with reserved cash.',
      'zh-TW': '把預計部位分成整股批次，並先保留現金。',
      'zh-CN': '把预计部位分成整股批次，并先保留现金。',
    },
  },
  {
    slug: 'financial-freedom', category: 'calculator',
    name: { en: 'Financial freedom', 'zh-TW': '財務自由', 'zh-CN': '财务自由' },
    purpose: {
      en: 'Estimate the target amount and the years it still takes.',
      'zh-TW': '估算目標金額，以及還需要的年數。',
      'zh-CN': '估算目标金额，以及还需要的年数。',
    },
  },
  {
    slug: 'relative-value', category: 'research',
    name: { en: 'Relative value', 'zh-TW': '相對價值', 'zh-CN': '相对价值' },
    purpose: {
      en: 'Compare two prices with an explicit ratio, scenarios and history.',
      'zh-TW': '以明確比率比較兩個價格，附情境與歷史。',
      'zh-CN': '以明确比率比较两个价格，附情景与历史。',
    },
  },
  {
    slug: 'seasonality', category: 'research',
    name: { en: 'Seasonality', 'zh-TW': '季節性', 'zh-CN': '季节性' },
    purpose: {
      en: 'S&P 500 monthly average returns, a fixed reference since 1950.',
      'zh-TW': 'S&P 500 月度平均回報，1950 年起的固定參考。',
      'zh-CN': 'S&P 500 月度平均回报，1950 年起的固定参考。',
    },
  },
  {
    slug: 'etf', category: 'research',
    name: { en: 'ETF research', 'zh-TW': 'ETF 研究', 'zh-CN': 'ETF 研究' },
    purpose: {
      en: 'Read risk, fund details and relative returns with their data dates.',
      'zh-TW': '連同資料日期閱讀風險、基金資料及相對回報。',
      'zh-CN': '连同数据日期阅读风险、基金资料及相对回报。',
    },
  },
  {
    slug: 'market-rotation', category: 'research',
    name: { en: 'Market rotation', 'zh-TW': '市場輪動', 'zh-CN': '市场轮动' },
    purpose: {
      en: 'Read the latest market relative-strength snapshot by scope.',
      'zh-TW': '按範圍閱讀最新的市場相對強弱快照。',
      'zh-CN': '按范围阅读最新的市场相对强弱快照。',
    },
  },
  {
    slug: 'sec-filings', category: 'research',
    name: { en: 'SEC filings', 'zh-TW': 'SEC 申報', 'zh-CN': 'SEC 申报' },
    purpose: {
      en: 'Search companies and read or download their SEC filings.',
      'zh-TW': '搜尋公司，閱讀或下載其 SEC 申報文件。',
      'zh-CN': '搜索公司，阅读或下载其 SEC 申报文件。',
    },
  },
];

export function toolBySlug(slug: string | undefined): PublicTool | undefined {
  return publicTools.find(tool => tool.slug === slug);
}
