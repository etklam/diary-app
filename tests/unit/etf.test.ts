import { describe, expect, it, vi } from 'vitest';
import { etfProfileSchema } from '@diary/contracts/etf-profile';
import type { EtfWatchlistItem, EtfWatchlistRow } from '../../src/tools/etf-data';
import { EtfFailure, etfResearchService, etfWatchlistService, type EtfProfile, type EtfResearchService, type EtfWatchlistService } from '../../src/tools/etf-data';
import { createEtfResearchManager, type EtfQuery } from '../../src/tools/etf-research-manager';
import { createEtfWatchlistManager } from '../../src/tools/etf-watchlist-manager';

const profile = etfProfileSchema.parse({
  symbol: 'SPY', benchmark: 'QQQ', period: '3m',
  quote: { symbol: 'SPY', regularMarketPrice: 101, previousClose: null, change: null, changePercent: null, currency: 'USD', marketState: null, lastUpdateTime: null },
  risk: { high52w: 110, low52w: 80, distanceToHighPct: -8.18, distanceToLowPct: 26.25, volatility20d: null, volatility60d: 12, volatility252d: 18, maxDrawdown1y: -15, volumeSpikeRatio: 1.1, observations: 260, asOf: '2026-09-25' },
  valuation: { aum: 1_000_000_000, expenseRatioPct: 0.1, pe: null, pb: 4, dividendYieldPct: 1.2, currency: 'USD' },
  rs: { symbolReturnPct: 5, benchmarkReturnPct: 3, relativeReturnPct: 2, trend: 'outperforming', from: '2026-06-25', to: '2026-09-25' },
  meta: { fetchedAt: '2026-09-26T00:00:00.000Z', asOf: '2026-09-25T00:00:00.000Z', isStale: true, status: 'partial', sources: { 'risk.high52w': { source: 'yahoo', fetchedAt: '2026-09-25T00:00:00.000Z', isStale: true } } },
});
const createdItem: EtfWatchlistItem = { id: '2', symbol: 'SPY', name: 'SPDR S&P 500 ETF Trust', sortOrder: 0 };
const item: EtfWatchlistRow = { ...createdItem, latestPrice: null, latestDate: null };
const query: EtfQuery = { symbol: 'SPY', benchmark: 'QQQ', period: '3m' };
const deferred = <T,>() => { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done; }); return { promise, resolve }; };
const ok = (data: unknown) => ({ response: new Response(null, { status: 200 }), data });

function fakeResearch(overrides: Partial<EtfResearchService> = {}) {
  return { read: vi.fn(async () => profile), ...overrides } as EtfResearchService;
}
function fakeWatchlist(overrides: Partial<EtfWatchlistService> = {}) {
  return { read: vi.fn(async () => []), add: vi.fn(async () => item), remove: vi.fn(async () => {}), ...overrides } as EtfWatchlistService;
}

describe('ETF public research and private Watchlist', () => {
  it('reads the single public profile contract and retains source nulls, dates and partial state', async () => {
    const get = vi.fn(async () => ok(profile));
    const service = etfResearchService({ GET: get } as never);
    const result = await service.read(query, new AbortController().signal);
    expect(get).toHaveBeenCalledWith('/api/etf/{symbol}/profile', expect.objectContaining({
      params: { path: { symbol: 'SPY' }, query: { benchmark: 'QQQ', period: '3m' } },
    }));
    expect(result).toMatchObject({ meta: { status: 'partial', isStale: true }, risk: { volatility20d: null }, valuation: { pe: null } });
    expect(result.quote?.previousClose).toBeNull();
  });

  it('discards a late profile response after the requested symbol changes', async () => {
    const earlier = deferred<EtfProfile>();
    const service = fakeResearch({ read: vi.fn((request: EtfQuery) => request.symbol === 'SPY' ? earlier.promise : Promise.resolve({ ...profile, symbol: 'QQQ' })) });
    const manager = createEtfResearchManager(service, query);
    manager.open(query);
    manager.open({ ...query, symbol: 'QQQ' });
    earlier.resolve(profile);
    await vi.waitFor(() => expect(manager.getSnapshot().data?.symbol).toBe('QQQ'));
    expect(manager.getSnapshot()).toMatchObject({ request: { symbol: 'QQQ' }, loading: false, error: null });
    manager.dispose();
  });

  it('sends Watchlist mutations once with retry suppression and checks owner scope after responses', async () => {
    let current = true;
    const post = vi.fn(async (_path: string, _options?: unknown) => ok(createdItem));
    const remove = vi.fn(async (_path: string, _options?: unknown) => ok({ success: true }));
    const get = vi.fn(async (_path: string, _options?: unknown) => ok([item]));
    const service = etfWatchlistService({ GET: get, POST: post, DELETE: remove } as never, { isCurrent: () => current });
    expect(await service.add('spy', new AbortController().signal)).toEqual(createdItem);
    expect(post.mock.calls[0]?.[1]).toMatchObject({ body: { symbol: 'SPY' }, headers: { 'x-diary-no-automatic-session-retry': '1' } });
    await service.remove(item.id, new AbortController().signal);
    expect(remove.mock.calls[0]?.[1]).toHaveProperty('headers.x-diary-no-automatic-session-retry', '1');
    current = false;
    await expect(service.read(new AbortController().signal)).rejects.toMatchObject({ kind: 'stale' } satisfies Partial<EtfFailure>);
  });

  it('locks writes after an uncertain result until the user refreshes the list', async () => {
    const add = vi.fn().mockRejectedValueOnce(new EtfFailure('uncertain')).mockResolvedValue(createdItem);
    const service = fakeWatchlist({ add });
    const manager = createEtfWatchlistManager(service, () => true);
    await manager.refresh();
    expect(await manager.add('spy')).toBe(false);
    expect(manager.getSnapshot()).toMatchObject({ mutationUncertain: true, error: { kind: 'uncertain' } });
    expect(await manager.add('QQQ')).toBe(false);
    expect(add).toHaveBeenCalledTimes(1);
    await manager.refresh();
    expect(manager.getSnapshot().mutationUncertain).toBe(false);
    expect(await manager.add('qqq')).toBe(true);
    expect(add.mock.calls[1]?.[0]).toBe('QQQ');
    manager.dispose();
  });

  it('does not publish list responses after the verified owner scope expires', async () => {
    const pending = deferred<import('../../src/tools/etf-data').EtfWatchlistRow[]>();
    const manager = createEtfWatchlistManager(fakeWatchlist({ read: vi.fn(() => pending.promise) }), () => true);
    const refresh = manager.refresh();
    manager.dispose();
    pending.resolve([item]);
    await refresh;
    expect(manager.getSnapshot().items).toBeNull();
  });
});
