import type { Locale } from '@/preferences/model';

const sourceFallbacks: Record<string, Record<Locale, string>> = {
  '寫日記是提升交易心態的最好方法': {
    en: 'Writing a journal is one of the best ways to improve your trading mindset.',
    'zh-TW': '寫日記是提升交易心態的最好方法',
    'zh-CN': '写日记是提升交易心态的最好方法',
  },
  '明天又是新的一天，持續寫日記吧': {
    en: 'Tomorrow is a new day. Keep writing your journal.',
    'zh-TW': '明天又是新的一天，持續寫日記吧',
    'zh-CN': '明天又是新的一天，持续写日记吧',
  },
  '明天見': { en: 'See you tomorrow.', 'zh-TW': '明天見', 'zh-CN': '明天见' },
};

export function localizeDisciplineDraw(draw: { content: string; isCustom: boolean }, locale: Locale) {
  if (draw.isCustom) return draw.content;
  return sourceFallbacks[draw.content]?.[locale] ?? draw.content;
}
