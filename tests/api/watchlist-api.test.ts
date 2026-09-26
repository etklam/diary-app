import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createApiClient, createNativeSession } from '@diary/api-client';
import { stockWatchlistService } from '../../src/watchlist/service';

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

async function createOwner(label: string) {
  const scenario = randomUUID();
  const transport = isolatedTransport(scenario);
  const credentials = { email: `watchlist-${label}-${scenario}@example.test`, password: 'SyntheticWatchlist2026' };
  const registered = await transport(`${baseUrl}/api/auth/register`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(credentials),
  });
  expect(registered.status).toBe(200);

  let stored: Awaited<ReturnType<ReturnType<typeof createNativeSession>['login']>> | null = null;
  const native = createNativeSession({
    baseUrl: baseUrl!, fetch: transport,
    storage: { get: () => stored, set: value => { stored = value; }, clear: () => { stored = null; } },
  });
  await native.login(credentials);
  const api = createApiClient({ baseUrl: baseUrl!, fetch: native.fetch });
  return { native, service: stockWatchlistService(api, { isCurrent: () => true }) };
}

describe.runIf(enabled)('F3 disposable Watchlist API acceptance', () => {
  it('round-trips normalized duplicates, ordering, archive/restore, no-data state and owner isolation', async () => {
    const owner = await createOwner('owner');
    const other = await createOwner('other');
    try {
      expect(await owner.service.read()).toEqual({ items: [] });
      expect(await other.service.read()).toEqual({ items: [] });

      const first = await owner.service.add({ symbol: ' aapl ' });
      expect(first).toMatchObject({ symbol: 'AAPL', status: 'WATCHING', sortOrder: 0 });
      const duplicate = await owner.service.add({ symbol: 'AAPL' });
      expect(duplicate).toEqual(first);
      const second = await owner.service.add({ symbol: 'msft' });
      await owner.service.update(first.id, { sortOrder: 7 });

      const ordered = await owner.service.read();
      expect(ordered.items.map(item => item.id)).toEqual([second.id, first.id]);
      expect(ordered.items.find(item => item.id === first.id)).toMatchObject({
        stock: { symbol: 'AAPL' }, recordCount: 0, latestRecord: null,
      });
      expect(await other.service.read()).toEqual({ items: [] });

      await owner.service.archive(first.id);
      expect((await owner.service.read()).items.map(item => item.id)).toEqual([second.id]);
      const restored = await owner.service.add({ symbol: 'aapl' });
      expect(restored).toMatchObject({ id: first.id, sortOrder: 7, status: 'WATCHING' });
      expect((await owner.service.read()).items).toHaveLength(2);
    } finally {
      await owner.native.logout().catch(() => {});
      await other.native.logout().catch(() => {});
    }
  });
});
