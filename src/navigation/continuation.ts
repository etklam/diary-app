// Only navigation context is accepted. No content, credentials, executable URLs or mutation flags.
import { stockSymbolSchema } from '@diary/contracts/watchlist';
import { etfSymbolSchema } from '@diary/contracts/etf';
import { decodeDisciplineShare } from '@diary/contracts/discipline-share';
import { canonicalArticleRoute } from '../articles/model';

const MAX_DISCIPLINE_SHARE_LINK = 131_072;

function disciplineShareContinuation(value: string): string | null {
  const match = /^\/discipline\/share\?import=([^&]+)$/.exec(value);
  if (!match || value.length > MAX_DISCIPLINE_SHARE_LINK) return null;
  try {
    const encoded = decodeURIComponent(match[1]!);
    decodeDisciplineShare(encoded);
    return `/discipline/share?import=${encodeURIComponent(encoded)}`;
  } catch { return null; }
}

export function safeContinuation(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  if (value.startsWith('/discipline/share?')) return disciplineShareContinuation(value);
  const article = canonicalArticleRoute(value);
  if (article) return article;
  if (value.length > 160) return null;
  if (value === '/alerts') return value;
  const secFiling = /^\/tools\/sec-filings\/(\d{1,10})\/(\d{10}-\d{2}-\d{6})$/.exec(value);
  if (secFiling) return `/tools/sec-filings/${secFiling[1]!.padStart(10, '0')}/${secFiling[2]}`;
  const company = /^\/stocks\/([A-Za-z0-9.]{1,32})$/.exec(value);
  if (company && stockSymbolSchema.safeParse(company[1]).success) return `/stocks/${company[1].toUpperCase()}`;
  if (['/timeline', '/library', '/calendar', '/review', '/overview', '/portfolio', '/research', '/more', '/account', '/preferences', '/security', '/diaries/quick', '/watchlist', '/etf-watchlist', '/discipline', '/partners', '/guide', '/about', '/trade-plans', '/trade-plans/new'].includes(value)) return value;
  const plan = /^\/trade-plans\/([1-9]\d{0,18})$/.exec(value);
  if (plan && BigInt(plan[1]) <= 9223372036854775807n) return value;
  const planDiary = /^\/trade-plans\/new\?diaryId=([1-9]\d{0,18})$/.exec(value);
  if (planDiary && BigInt(planDiary[1]) <= 9223372036854775807n) return value;
  const etfWatchlist = /^\/etf-watchlist\?symbol=([^&]{1,60})$/.exec(value);
  if (etfWatchlist) {
    try {
      const symbol = etfSymbolSchema.safeParse(decodeURIComponent(etfWatchlist[1]!));
      if (symbol.success) return `/etf-watchlist?symbol=${encodeURIComponent(symbol.data)}`;
    } catch { /* malformed percent escapes are not navigation context */ }
  }
  if (/^\/diaries\/[1-9]\d{0,18}$/.test(value) && BigInt(value.split('/').pop()!) <= 9223372036854775807n) return value;
  const review = /^\/diaries\/review\?id=([1-9]\d{0,18})$/.exec(value);
  if (review && BigInt(review[1]) <= 9223372036854775807n) return value;
  const quick = /^\/diaries\/quick\?date=(\d{4}-\d{2}-\d{2})$/.exec(value);
  if (quick) { const date = new Date(quick[1] + 'T12:00:00Z'); if (Number.isFinite(+date) && date.toISOString().slice(0, 10) === quick[1]) return value; }
  const editorDate = /^\/diaries\/editor\?date=(\d{4}-\d{2}-\d{2})$/.exec(value);
  if (editorDate) { const date = new Date(editorDate[1] + 'T12:00:00Z'); if (Number.isFinite(+date) && date.toISOString().slice(0, 10) === editorDate[1]) return value; }
  const editorId = /^\/diaries\/editor\?id=([1-9]\d{0,18})$/.exec(value);
  if (editorId && BigInt(editorId[1]) <= 9223372036854775807n) return value;
  return null;
}
export function workspacePath(value?: string) { return value === 'calendar' ? '/calendar' : value === 'diaries' ? '/library' : '/timeline'; }

export function nativeContinuation(path: string): string | null {
  if (path.startsWith('/')) return safeContinuation(path);
  try {
    const url = new URL(path);
    if (!['diaryapp:', 'tradebasicbeta:'].includes(url.protocol) || url.username || url.password || url.port || url.hash) return null;
    const route = (url.hostname ? `/${url.hostname}` : '') + url.pathname + url.search;
    return safeContinuation(route);
  } catch { return null; }
}
