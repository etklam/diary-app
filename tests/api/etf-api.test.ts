import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createApiClient, createNativeSession } from '@diary/api-client';
import { etfProfileSchema } from '@diary/contracts/etf-profile';
import { etfWatchlistListSchema } from '@diary/contracts/etf';

const baseUrl = process.env.DIARY_API_BASE_URL;
const enabled = process.env.DIARY_DISPOSABLE_TEST_ENV === '1' && !!baseUrl;

function isolatedTransport(scenario: string): typeof fetch {
  const id = scenario.replaceAll('-', '');
  const clientIp = `fd00:${id.slice(0, 4)}:${id.slice(4, 8)}:${id.slice(8, 12)}::1`;
  return (input, init) => {
    const request = new Request(input, init);
    request.headers.set('x-e2e-test-id', scenario);
    request.headers.set('x-forwarded-for', clientIp);
    return fetch(request);
  };
}

describe.runIf(enabled)('F5 disposable ETF API acceptance', () => {
  it('serves guest research and isolates ETF Watchlist mutations from stock holdings and other owners', async () => {
    const sessions: ReturnType<typeof createNativeSession>[] = [];
    let watchId: string | null = null;
    const session = async (credentials: { email: string; password: string }, transport: typeof fetch) => {
      let stored: Awaited<ReturnType<ReturnType<typeof createNativeSession>['login']>> | null = null;
      const native = createNativeSession({ baseUrl: baseUrl!, fetch: transport,
        storage: { get: () => stored, set: value => { stored = value; }, clear: () => { stored = null; } } });
      sessions.push(native);
      const login = await native.login(credentials);
      return { api: createApiClient({ baseUrl: baseUrl!, fetch: native.fetch }), ownerId: login.user.id };
    };
    const register = async (label: string) => {
      const transport = isolatedTransport(randomUUID());
      const credentials = { email: `etf-${label}-${randomUUID().slice(0, 8)}@example.test`, password: `Synthetic-${randomUUID()}` };
      const registered = await transport(`${baseUrl}/api/auth/register`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(credentials) });
      expect(registered.status).toBe(200);
      return session(credentials, transport);
    };
    let ownerA: Awaited<ReturnType<typeof register>> | null = null;
    try {
      const adminTransport = isolatedTransport(randomUUID());
      const admin = await session({ email: 'etf-admin@example.test', password: 'synthetic-etf-admin-password' }, adminTransport);
      const seed = await admin.api.POST('/api/admin/etf/seed');
      expect(seed.response.status).toBe(200);
      expect(seed.data).toMatchObject({ success: true });
      ownerA = await register('a');
      const ownerB = await register('b');
      const guest = createApiClient({ baseUrl: baseUrl!, fetch: isolatedTransport(randomUUID()) });
      const publicRead = await guest.GET('/api/etf/{symbol}/profile', { params: { path: { symbol: 'spy' }, query: { benchmark: 'QQQ', period: '3m' } } });
      expect(publicRead.response.status).toBe(200);
      const profile = etfProfileSchema.parse(publicRead.data);
      expect(profile).toMatchObject({ symbol: 'SPY', benchmark: 'QQQ', period: '3m', meta: { status: 'partial' } });
      expect(profile.meta.fetchedAt).toMatch(/^202\d-/);
      expect(profile.meta.sources['quote.regularMarketPrice']).toMatchObject({ source: 'yahoo', isStale: false });
      expect(profile.meta.sources['quote.regularMarketPrice']?.fetchedAt).toMatch(/^202\d-/);
      expect(profile.quote?.previousClose).toBe(100);
      expect(profile.risk.observations).toBeGreaterThan(200);
      const unavailableRead = await guest.GET('/api/etf/{symbol}/profile', { params: { path: { symbol: 'UNKNOWN' }, query: { benchmark: 'SPY', period: '3m' } } });
      expect(unavailableRead.response.status).toBe(200);
      expect(etfProfileSchema.parse(unavailableRead.data)).toMatchObject({ symbol: 'UNKNOWN', quote: null, risk: { high52w: null }, meta: { status: 'unavailable' } });

      const holdingsBefore = await ownerA.api.GET('/api/stocks/holdings');
      expect(holdingsBefore.response.status).toBe(200);
      expect(etfWatchlistListSchema.parse((await ownerA.api.GET('/api/etf/watchlist')).data)).toEqual([]);
      const unknown = await ownerA.api.POST('/api/etf/watchlist', { body: { symbol: 'NO_SUCH_ETF' } });
      expect(unknown.response.status).toBe(404);

      const added = await ownerA.api.POST('/api/etf/watchlist', { body: { symbol: 'spy' } });
      expect(added.response.status).toBe(200);
      expect(added.data).toMatchObject({ symbol: 'SPY', sortOrder: 0 });
      watchId = String((added.data as { id: string }).id);
      const duplicate = await ownerA.api.POST('/api/etf/watchlist', { body: { symbol: 'SPY' } });
      expect(duplicate.response.status).toBe(409);

      const [listA, listB, holdingsAfter] = await Promise.all([
        ownerA.api.GET('/api/etf/watchlist'), ownerB.api.GET('/api/etf/watchlist'), ownerA.api.GET('/api/stocks/holdings'),
      ]);
      expect(etfWatchlistListSchema.parse(listA.data)).toHaveLength(1);
      expect(etfWatchlistListSchema.parse(listA.data)[0]).toMatchObject({ symbol: 'SPY', latestPrice: null, latestDate: null });
      expect(etfWatchlistListSchema.parse(listB.data)).toEqual([]);
      expect(holdingsAfter.data).toEqual(holdingsBefore.data);
      const removed = await ownerA.api.DELETE('/api/etf/watchlist/{id}', { params: { path: { id: watchId } } });
      expect(removed.response.status).toBe(200);
      watchId = null;
      expect(etfWatchlistListSchema.parse((await ownerA.api.GET('/api/etf/watchlist')).data)).toEqual([]);
      expect(etfWatchlistListSchema.parse((await ownerB.api.GET('/api/etf/watchlist')).data)).toEqual([]);
      console.log('F5 live API: guest partial profile, seeded catalog, owner-scoped Watchlist add/duplicate/remove, stock holdings unchanged: PASS');
    } finally {
      if (watchId && ownerA) await ownerA.api.DELETE('/api/etf/watchlist/{id}', { params: { path: { id: watchId } } });
      for (const native of sessions) await native.logout().catch(() => {});
    }
  }, 90000);
});
