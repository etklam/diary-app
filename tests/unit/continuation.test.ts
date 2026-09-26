import { describe, expect, it } from 'vitest';
import { nativeContinuation, safeContinuation } from '../../src/navigation/continuation';

describe('safe private continuation routes', () => {
  it('preserves implemented private feature destinations after authentication', () => {
    expect(safeContinuation('/watchlist')).toBe('/watchlist');
    expect(safeContinuation('/discipline')).toBe('/discipline');
    expect(safeContinuation('/partners')).toBe('/partners');
    expect(safeContinuation('/etf-watchlist')).toBe('/etf-watchlist');
    expect(safeContinuation('/etf-watchlist?symbol=spy')).toBe('/etf-watchlist?symbol=SPY');
    expect(safeContinuation('/stocks/AAPL')).toBe('/stocks/AAPL');
    expect(safeContinuation('/stocks/brk.b')).toBe('/stocks/BRK.B');
    expect(nativeContinuation('diaryapp://discipline')).toBe('/discipline');
  });

  it('rejects unknown or parameter-injected private routes', () => {
    expect(safeContinuation('/discipline?deleteAll=true')).toBeNull();
    expect(safeContinuation('/stocks/AAPL?owner=other')).toBeNull();
    expect(safeContinuation('/stocks/../security')).toBeNull();
    expect(safeContinuation('/etf-watchlist?symbol=SPY&mutation=remove')).toBeNull();
    expect(safeContinuation('https://example.test/discipline')).toBeNull();
  });
});
