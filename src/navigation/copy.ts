// F0 follows the device locale. Account preference integration belongs to F1.
const copy: Record<string, readonly [string, string]> = {
  Home: ['總覽', '总览'], Assets: ['資產', '资产'], Tools: ['研究', '研究'],
  Overview: ['總覽', '总览'], Diary: ['日記', '日记'], Portfolio: ['投資組合', '投资组合'], Research: ['研究', '研究'], More: ['更多', '更多'],
  Timeline: ['時間軸', '时间轴'], Calendar: ['月曆', '日历'], Review: ['回顧', '回顾'], Account: ['帳戶', '账户'],
  'Diary Review': ['日記回顧', '日记回顾'], 'Full Diary and transactions': ['完整日記與交易', '完整日记与交易'],
  'Trade Plans': ['交易計劃', '交易计划'], 'Daily workspace': ['每日工作區', '每日工作区'],
  'Holdings and exposure': ['持倉與風險曝險', '持仓与风险敞口'], 'Performance and exports': ['績效與匯出', '绩效与导出'],
  'Watchlist and Company Hub': ['觀察清單與公司研究', '观察清单与公司研究'], 'Notes, Evidence and Thesis': ['筆記、證據與投資論點', '笔记、证据与投资论点'],
  'ETF, Market State and Rotation': ['ETF、市場狀態與輪動', 'ETF、市场状态与轮动'],
  'Sizing, FIRE, Relative Value and Seasonality': ['倉位、財務自由、相對價值與季節性', '仓位、财务自由、相对价值与季节性'],
  'SEC filings and downloads': ['SEC 文件與下載', 'SEC 文件与下载'], 'Account and support': ['帳戶與支援', '账户与支持'],
  'Reminders and price alerts': ['提醒與價格警報', '提醒与价格警报'], Discipline: ['交易紀律', '交易纪律'],
  'Partners and API keys': ['夥伴與 API 金鑰', '伙伴与 API 密钥'], 'Articles and Guide': ['文章與指南', '文章与指南'],
  'Publishing, users and market administration': ['發佈、用戶與市場管理', '发布、用户与市场管理'],
  'Not available in this build.': ['此版本尚未提供。', '此版本尚未提供。'],
  'Continue your journal. Your complete daily workspace is being built.': ['繼續記錄日記。完整每日工作區正在開發中。', '继续记录日记。完整每日工作区正在开发中。'],
  'Portfolio tools are not available yet. No balances or results are shown here.': ['投資組合工具尚未提供。此處不顯示餘額或績效。', '投资组合工具尚未提供。此处不显示余额或绩效。'],
  'Research tools are being added to the app.': ['研究工具正在加入應用程式。', '研究工具正在加入应用。'],
  'Manage your account and find support.': ['管理帳戶及尋找支援。', '管理账户及寻找支持。'],
  'Quick Diary': ['快速日記', '快速日记'], '+ Quick': ['＋速記', '＋速记'], 'Opening…': ['開啟中…', '打开中…'],
  'Retry Quick': ['重試速記', '重试速记'], 'Could not open draft. Retry Quick Diary': ['無法開啟草稿。重試快速日記', '无法打开草稿。重试快速日记'],
};
export function shellText(text: string, locale = Intl.DateTimeFormat().resolvedOptions().locale) {
  if (!locale.toLowerCase().startsWith('zh')) return text;
  return copy[text]?.[/hans|cn|sg/i.test(locale) ? 1 : 0] ?? text;
}
