import { quickSnippets } from '@diary/domain';
import type { Locale } from '../preferences/model';
import type { QuickSnippetRecord } from './repository';

const copy: Record<string, Record<Locale, { name: string; content: string }>> = {
  'default-1': {
    en: { name: "Today's mood", content: "Today's mood:\n\nWhy:\n\nWhat I want to do:" },
    'zh-TW': { name: '今日心情', content: '今日心情：\n\n原因：\n\n想做的事：' },
    'zh-CN': { name: '今天心情', content: '今天心情：\n\n原因：\n\n想做的事：' },
  },
  'default-2': {
    en: { name: 'Three small things', content: '1.\n2.\n3.' },
    'zh-TW': { name: '三件小事', content: '1.\n2.\n3.' },
    'zh-CN': { name: '三件小事', content: '1.\n2.\n3.' },
  },
  'default-3': {
    en: { name: 'Learning notes', content: 'Today I learned:\n\nOpen questions:\n\nNext step:' },
    'zh-TW': { name: '學習紀錄', content: '今天學到：\n\n還有疑問：\n\n下一步：' },
    'zh-CN': { name: '学习记录', content: '今天学到：\n\n还有疑问：\n\n下一步：' },
  },
  'default-4': {
    en: { name: 'Trade review', content: 'Symbol:\n\nStrategy:\n\nResult and reflection:' },
    'zh-TW': { name: '交易回顧', content: '標的：\n\n策略：\n\n結果與反思：' },
    'zh-CN': { name: '交易回顾', content: '标的：\n\n策略：\n\n结果与反思：' },
  },
  'default-5': {
    en: { name: 'Idea notes', content: 'One-line idea:\n\nExplore it:\n\nNext step:' },
    'zh-TW': { name: '靈感紀錄', content: '靈感一句話：\n\n展開：\n\n下一步：' },
    'zh-CN': { name: '灵感记录', content: '灵感一句话：\n\n展开：\n\n下一步：' },
  },
  'default-6': {
    en: { name: 'To-do list', content: '-\n-\n-' },
    'zh-TW': { name: '待辦清單', content: '-\n-\n-' },
    'zh-CN': { name: '待办清单', content: '-\n-\n-' },
  },
};

export function localizedQuickSnippets(locale: Locale): QuickSnippetRecord[] {
  return quickSnippets.map(source => ({ id: source.id,
    ...(copy[source.id]?.[locale] ?? { name: source.name, content: source.content }) }));
}
