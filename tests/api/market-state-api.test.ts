import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createApiClient } from '@diary/api-client';
import { marketStateHistoryResponseSchema, marketStateSnapshotSchema } from '@diary/contracts/market-state';

const baseUrl = process.env.DIARY_API_BASE_URL;
const enabled = process.env.DIARY_DISPOSABLE_TEST_ENV === '1' && !!baseUrl;

describe.runIf(enabled)('F5 public Market State API acceptance', () => {
  it('allows guest snapshot and history reads while retaining the absent-snapshot contract', async () => {
    const scenario = randomUUID();
    const id = scenario.replaceAll('-', '');
    const client = createApiClient({ baseUrl: baseUrl!, fetch: (input, init) => {
      const request = new Request(input, init);
      request.headers.set('x-e2e-test-id', scenario);
      request.headers.set('x-forwarded-for', `fd00:${id.slice(0, 4)}:${id.slice(4, 8)}:${id.slice(8, 12)}::1`);
      return fetch(request);
    } });
    const snapshot = await client.GET('/api/market/state/snapshot');
    expect(snapshot.response.status).toBeOneOf([200, 404]);
    expect(snapshot.response.headers.get('cache-control')).toBe('no-store');
    if (snapshot.response.status === 404) expect(snapshot.error).toMatchObject({ data: { code: 'SYS_NOT_FOUND' } });
    else expect(marketStateSnapshotSchema.parse(snapshot.data).marketState).toMatch(/^(risk_on|neutral|defensive|risk_off|unknown)$/);

    const history = await client.GET('/api/market/state/history', { params: { query: { days: 3 } } });
    expect(history.response.status).toBe(200);
    const rows = marketStateHistoryResponseSchema.parse(history.data);
    expect(rows.length).toBeLessThanOrEqual(3);
    expect(rows.map(row => row.date)).toEqual([...rows.map(row => row.date)].sort((left, right) => right.localeCompare(left)));
    console.log('F5 live API: unauthenticated persisted snapshot and newest-first market-state history: PASS');
  });
});
