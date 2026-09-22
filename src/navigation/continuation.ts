// Only navigation context is accepted. No content, credentials, executable URLs or mutation flags.
export function safeContinuation(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 160) return null;
  if (['/timeline', '/library', '/calendar', '/review', '/overview', '/portfolio', '/research', '/more', '/account', '/preferences', '/security', '/diaries/quick'].includes(value)) return value;
  if (/^\/diaries\/[1-9]\d{0,18}$/.test(value) && BigInt(value.split('/').pop()!) <= 9223372036854775807n) return value;
  const review = /^\/diaries\/review\?id=([1-9]\d{0,18})$/.exec(value);
  if (review && BigInt(review[1]) <= 9223372036854775807n) return value;
  const quick = /^\/diaries\/quick\?date=(\d{4}-\d{2}-\d{2})$/.exec(value);
  if (quick) { const date = new Date(quick[1] + 'T12:00:00Z'); if (Number.isFinite(+date) && date.toISOString().slice(0, 10) === quick[1]) return value; }
  return null;
}
export function workspacePath(value?: string) { return value === 'calendar' ? '/calendar' : value === 'diaries' ? '/library' : '/timeline'; }

export function nativeContinuation(path: string): string | null {
  if (path.startsWith('/')) return safeContinuation(path);
  try {
    const url = new URL(path);
    if (!['diaryapp:', 'tradebasicbeta:'].includes(url.protocol) || url.username || url.password || url.port || url.hash) return null;
    return safeContinuation((url.hostname ? `/${url.hostname}` : '') + url.pathname + url.search);
  } catch { return null; }
}
