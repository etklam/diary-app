import { diaryListQuerySchema, type DiaryListQuery } from '@diary/contracts/diary-list';

export type DiscoveryInput = Partial<Record<'search' | 'symbol' | 'dateFrom' | 'dateTo' | 'reviewStatus' | 'sortBy' | 'limit', string>>;
export type DiscoveryQuery = Omit<DiaryListQuery, 'page'>;
export function normalizeQuery(input: DiscoveryInput): DiscoveryQuery {
  const fields = Object.fromEntries(Object.entries(input).map(([key, value]) => [key, value?.trim()]).filter(([, value]) => value));
  if (typeof fields.symbol === 'string') fields.symbol = fields.symbol.toUpperCase();
  const { page: _page, ...query } = diaryListQuerySchema.parse(fields);
  return query;
}
