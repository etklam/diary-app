import { describe, expect, it, vi } from 'vitest';
import type { CompanyHubResponse } from '@diary/contracts/company-hub';
import type { MarketHistorical, MarketQuote } from '@diary/contracts/market';
import { companyHubService, CompanyHubFailure, type CompanyHubService, type MarketRead } from '../../src/company-hub/service';
import { createCompanyHubManager } from '../../src/company-hub/manager';
import { accessibleChartRows, chartRows } from '../../src/company-hub/chart';

const quote: MarketQuote = {
  symbol: 'AAPL', regularMarketPrice: 100, previousClose: null, change: null, changePercent: null,
  currency: 'USD', marketState: null, lastUpdateTime: null,
};
const history: MarketHistorical = [{ timestamp: 1_759_075_200, close: 100 }];
const owner: CompanyHubResponse = {
  company: { id: '1', symbol: 'AAPL', name: 'Apple', currency: 'USD', watchStatus: 'WATCHING' },
  position: { state: 'held', quantity: 2, averageCost: 90, totalCost: 180, price: null, marketValue: null,
    concentrationPct: null, concentrationBasis: 'cost_basis', quoteStatus: 'missing' },
  thesis: null, latestReview: null, reviews: [], notes: [], evidence: [], relatedDiaries: [],
};
const read = <T>(data: T): MarketRead<T> => ({ data, source: 'cache', fetchedAt: '2026-09-26T00:00:00.000Z' });
const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
};

function fakeService(overrides: Partial<CompanyHubService> = {}) {
  return {
    quote: vi.fn(async () => read(quote)),
    history: vi.fn(async () => read(history)),
    owner: vi.fn(async () => owner),
    ...overrides,
  } as CompanyHubService;
}

describe('Company Hub reads', () => {
  it('retains nullable quote values and reads source provenance from response headers', async () => {
    const get = vi.fn(async (path: string, _options?: unknown) => path.includes('historical')
      ? { response: new Response(null, { status: 200, headers: { 'x-market-data-source': 'stale', 'x-market-data-fetched-at': '2026-09-25T12:00:00Z' } }), data: history }
      : { response: new Response(null, { status: 200, headers: { 'x-market-data-source': 'upstream', 'x-market-data-fetched-at': '2026-09-26T12:00:00Z' } }), data: quote });
    const api = { GET: get } as never;
    const service = companyHubService(api);
    const quoteResult = await service.quote('AAPL', new AbortController().signal);
    const historyResult = await service.history('AAPL', '1y', new AbortController().signal);
    expect(quoteResult).toMatchObject({ data: { previousClose: null, change: null, changePercent: null }, source: 'upstream' });
    expect(quoteResult.fetchedAt).toBe('2026-09-26T12:00:00.000Z');
    expect(historyResult.source).toBe('stale');
    expect(get.mock.calls.map(([path]) => path)).toEqual(['/api/market/quote/{symbol}', '/api/market/historical']);
    expect(get.mock.calls[1]?.[1]).toMatchObject({ params: { query: { symbol: 'AAPL', range: '1y' } } });
  });

  it('keeps the current symbol and independent panels when an older symbol responds late', async () => {
    const oldQuote = deferred<MarketRead<MarketQuote>>();
    const service = fakeService({
      quote: vi.fn((symbol: string) => symbol === 'AAPL' ? oldQuote.promise : Promise.resolve(read({ ...quote, symbol: 'MSFT' }))),
      history: vi.fn(async (symbol: string) => read([{ timestamp: 1_759_075_200, close: symbol === 'AAPL' ? 10 : 20 }])),
      owner: vi.fn(async () => owner),
    });
    const manager = createCompanyHubManager(service, () => true);
    manager.open('AAPL', '1y', true);
    manager.open('MSFT', '1y', true);
    oldQuote.resolve(read(quote));
    await vi.waitFor(() => expect(manager.getSnapshot().quote.value?.data.symbol).toBe('MSFT'));
    expect(manager.getSnapshot()).toMatchObject({ symbol: 'MSFT', history: { value: { data: [{ close: 20 }] }, error: null }, owner: { guest: true, value: null } });
    expect(service.owner).not.toHaveBeenCalled();
    manager.dispose();
  });

  it('keeps quote and private context visible when history fails, and ignores an older selected range', async () => {
    const oldHistory = deferred<MarketRead<MarketHistorical>>();
    const service = fakeService({
      history: vi.fn((_symbol: string, range: string) => range === '1y' ? oldHistory.promise : Promise.resolve(read([{ timestamp: 2, close: 12 }]))),
      owner: vi.fn(async () => owner),
    });
    const manager = createCompanyHubManager(service, () => true);
    manager.open('AAPL', '1y', false);
    manager.setRange('3mo');
    oldHistory.resolve(read([{ timestamp: 1, close: 11 }]));
    await vi.waitFor(() => expect(manager.getSnapshot().history.value?.data[0]?.close).toBe(12));
    await vi.waitFor(() => expect(manager.getSnapshot().owner.value).toEqual(owner));
    expect(manager.getSnapshot().history).toMatchObject({ loading: false, error: null, value: { data: [{ close: 12 }] } });
    expect(service.history).toHaveBeenCalledTimes(2);
    manager.dispose();

    const partial = createCompanyHubManager(fakeService({ history: vi.fn(async () => { throw new Error('controlled history outage'); }), owner: vi.fn(async () => owner) }), () => true);
    partial.open('AAPL', '1y', false);
    await vi.waitFor(() => expect(partial.getSnapshot().history.error?.kind).toBe('unavailable'));
    await vi.waitFor(() => expect(partial.getSnapshot().owner.value).toEqual(owner));
    expect(partial.getSnapshot().quote.value?.data.regularMarketPrice).toBe(100);
    expect(partial.getSnapshot().owner.value?.position.marketValue).toBeNull();
    partial.dispose();
  });

  it('loads no personal endpoint for guests and refuses a private read after owner scope expires', async () => {
    let current = true;
    const get = vi.fn(async (_path: string, _options?: unknown) => ({ response: new Response(null, { status: 401 }), data: undefined }));
    const service = companyHubService({ GET: get } as never, { isCurrent: () => current });
    const manager = createCompanyHubManager(service, () => current);
    manager.open('AAPL', '1y', true);
    await vi.waitFor(() => expect(get).toHaveBeenCalledTimes(2));
    expect(get.mock.calls.some(([path]) => String(path).includes('/hub'))).toBe(false);
    manager.dispose();
    current = false;
    await expect(service.owner('AAPL', new AbortController().signal)).rejects.toMatchObject({ kind: 'stale' } satisfies Partial<CompanyHubFailure>);
  });

  it('bounds all-history chart work and provides accessible representative values including endpoints', () => {
    const longHistory: MarketHistorical = Array.from({ length: 12_000 }, (_, index) => ({ timestamp: index, close: index + 1 }));
    const plotted = chartRows(longHistory);
    const accessible = accessibleChartRows(longHistory);
    expect(plotted).toHaveLength(64);
    expect(accessible).toHaveLength(6);
    expect(plotted[0]).toEqual(longHistory[0]);
    expect(plotted.at(-1)).toEqual(longHistory.at(-1));
    expect(accessible[0]).toEqual(longHistory[0]);
    expect(accessible.at(-1)).toEqual(longHistory.at(-1));
  });
});
