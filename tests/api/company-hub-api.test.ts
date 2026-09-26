import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createApiClient, createNativeSession } from '@diary/api-client';
import { diaryResponseSchema } from '@diary/contracts';
import { companyHubResponseSchema } from '@diary/contracts/company-hub';

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

describe.runIf(enabled)('F3 disposable Company Hub API acceptance', () => {
  it('serves public quote/history to guests and separates private same-symbol context by owner', async () => {
    const sessions: ReturnType<typeof createNativeSession>[] = [];
    const diaries: Array<{ api: ReturnType<typeof createApiClient>; id: string }> = [];
    const register = async (label: string) => {
      const scenario = randomUUID();
      const transport = isolatedTransport(scenario);
      const credentials = { email: `company-hub-${label}-${randomUUID().slice(0, 8)}@example.test`, password: `Synthetic-${randomUUID()}` };
      const registered = await transport(`${baseUrl}/api/auth/register`, {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(credentials),
      });
      expect(registered.status).toBe(200);
      let stored: Awaited<ReturnType<ReturnType<typeof createNativeSession>['login']>> | null = null;
      const native = createNativeSession({ baseUrl: baseUrl!, fetch: transport,
        storage: { get: () => stored, set: value => { stored = value; }, clear: () => { stored = null; } } });
      sessions.push(native);
      await native.login(credentials);
      return { api: createApiClient({ baseUrl: baseUrl!, fetch: native.fetch }), transport };
    };
    const a = await register('a');
    const b = await register('b');
    const guestApi = createApiClient({ baseUrl: baseUrl!, fetch: isolatedTransport(randomUUID()) });
    try {
      const quote = await guestApi.GET('/api/market/quote/{symbol}', { params: { path: { symbol: 'SYN' } } });
      expect(quote.response.status).toBe(200);
      expect(quote.data).toMatchObject({ symbol: 'SYN', regularMarketPrice: 100, currency: 'USD' });
      expect(quote.response.headers.get('x-market-data-source')).toBeTruthy();
      expect(quote.response.headers.get('x-market-data-fetched-at')).toBeTruthy();
      const history = await guestApi.GET('/api/market/historical', { params: { query: { symbol: 'SYN', range: '1y' } } });
      expect(history.response.status).toBe(200);
      expect(history.data?.length).toBeGreaterThan(100);
      expect(history.response.headers.get('x-market-data-source')).toBeTruthy();

      for (const [owner, suffix] of [[a, 'Owner A private Diary'], [b, 'Owner B private Diary']] as const) {
        const created = await owner.api.POST('/api/diaries', { body: { date: suffix.startsWith('Owner A') ? '2020-03-01' : '2020-03-02',
          title: suffix, content: `Private research for ${suffix}`, stockSymbols: ['SYN'] } });
        expect(created.response.status).toBe(201);
        const diary = diaryResponseSchema.parse(created.data);
        diaries.push({ api: owner.api, id: diary.id });
      }
      const [hubA, hubB, guestHub] = await Promise.all([
        a.api.GET('/api/stocks/{symbol}/hub', { params: { path: { symbol: 'SYN' } } }),
        b.api.GET('/api/stocks/{symbol}/hub', { params: { path: { symbol: 'SYN' } } }),
        guestApi.GET('/api/stocks/{symbol}/hub', { params: { path: { symbol: 'SYN' } } }),
      ]);
      const dataA = companyHubResponseSchema.parse(hubA.data);
      const dataB = companyHubResponseSchema.parse(hubB.data);
      expect(hubA.response.status).toBe(200);
      expect(hubB.response.status).toBe(200);
      expect(dataA.relatedDiaries.map(row => row.title)).toContain('Owner A private Diary');
      expect(dataA.relatedDiaries.map(row => row.title)).not.toContain('Owner B private Diary');
      expect(dataB.relatedDiaries.map(row => row.title)).toContain('Owner B private Diary');
      expect(dataB.relatedDiaries.map(row => row.title)).not.toContain('Owner A private Diary');
      expect(guestHub.response.status).toBe(401);
      console.log('F3 live API: guest quote/history provenance, owner-only same-symbol Diaries, guest/private route separation: PASS');
    } finally {
      for (const diary of diaries) await diary.api.DELETE('/api/diaries/{id}', { params: { path: { id: diary.id } } });
      for (const session of sessions) await session.logout().catch(() => {});
    }
  }, 90000);
});
