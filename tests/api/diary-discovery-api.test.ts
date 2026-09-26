import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createApiClient, createNativeSession } from '@diary/api-client';
import { diaryResponseSchema, type NativeSession } from '@diary/contracts';
import { createAuthLifecycle } from '../../src/auth/lifecycle';
import { createDiaryAccess } from '../../src/diaries/access';
import { normalizeQuery } from '../../src/diaries/query';

describe.runIf(process.env.DIARY_DISPOSABLE_TEST_ENV === '1')('F2 Library, Timeline and Calendar live API acceptance', () => {
  it('uses canonical filters, sorts, bounded pages and month-boundary civil dates with owner isolation', async () => {
    const baseUrl = process.env.DIARY_API_BASE_URL!;
    expect(['localhost', '127.0.0.1', '[::1]']).toContain(new URL(baseUrl).hostname);
    const scenario = randomUUID();
    const rawId = scenario.replaceAll('-', '');
    const testIp = `fd00:${rawId.slice(0, 4)}:${rawId.slice(4, 8)}:${rawId.slice(8, 12)}::1`;
    const transport: typeof fetch = (input, init) => {
      const request = new Request(input, init);
      request.headers.set('x-e2e-test-id', scenario); request.headers.set('x-forwarded-for', testIp);
      return fetch(request);
    };
    const clients: ReturnType<typeof createNativeSession>[] = [];
    const createdIds = new Set<string>();
    const register = async (label: string) => {
      const credentials = { email: `f2-discovery-${label}-${randomUUID().slice(0, 8)}@example.test`, password: `Synthetic-${randomUUID()}` };
      const response = await transport(`${baseUrl}/api/auth/register`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(credentials) });
      expect(response.status).toBe(200);
      let stored: NativeSession | null = null;
      const storage = { get: () => stored, set: (next: NativeSession) => { stored = next; }, clear: () => { stored = null; } };
      const native = createNativeSession({ baseUrl, storage, fetch: transport }); clients.push(native);
      const login = await native.login(credentials);
      const api = createApiClient({ baseUrl, fetch: native.fetch });
      const lifecycle = createAuthLifecycle({ storage, runtime: { login: native.login, logout: native.logout,
        verifyCurrentUser: async () => ({ ok: true, user: login.user }) } });
      await lifecycle.bootstrap();
      const access = createDiaryAccess(api, lifecycle);
      return { api, scope: access.getScope()!, ownerId: login.user.id };
    };
    const a = await register('a'); const b = await register('b');
    try {
      const dates = ['2023-12-31', '2024-01-01', ...Array.from({ length: 29 }, (_, index) => {
        const date = new Date(Date.UTC(2024, 1, index + 1)); return date.toISOString().slice(0, 10);
      }), '2024-03-01'];
      for (let index = 0; index < dates.length; index++) {
        const date = dates[index]!;
        const marker = index === 0 ? 'Zulu acceptance' : index === 1 ? 'Alpha acceptance' : `Middle acceptance ${String(index).padStart(2, '0')}`;
        const created = await a.api.POST('/api/diaries', { body: {
          date, title: marker, content: `English posture note ${index}; 中文持倉反思 ${index}`,
        } });
        expect(created.response.status).toBe(201);
        createdIds.add(diaryResponseSchema.parse(created.data).id);
      }
      const first = await a.scope.summary(1, normalizeQuery({ limit: '10' }));
      const second = await a.scope.summary(2, normalizeQuery({ limit: '10' }));
      const third = await a.scope.summary(3, normalizeQuery({ limit: '10' }));
      expect(first.pagination).toEqual({ page: 1, limit: 10, total: 32, totalPages: 4 });
      expect([first.data.length, second.data.length, third.data.length]).toEqual([10, 10, 10]);
      expect(new Set([...first.data, ...second.data, ...third.data].map(row => row.id)).size).toBe(30);
      expect(first.data.every(row => !('content' in row))).toBe(true);

      const chinese = await a.scope.summary(1, normalizeQuery({ search: '持倉反思' }));
      const english = await a.scope.summary(1, normalizeQuery({ search: 'posture note' }));
      expect(chinese.pagination.total).toBe(32); expect(english.pagination.total).toBe(32);
      const alpha = await a.scope.summary(1, normalizeQuery({ sortBy: 'title-asc', limit: '50' }));
      const zulu = await a.scope.summary(1, normalizeQuery({ sortBy: 'title-desc', limit: '50' }));
      expect(alpha.pagination).toMatchObject({ limit: 50, totalPages: 1 });
      expect(alpha.data[0]?.title).toBe('Alpha acceptance'); expect(zulu.data[0]?.title).toBe('Zulu acceptance');
      const dateRange = await a.scope.summary(1, normalizeQuery({ dateFrom: '2024-02-28', dateTo: '2024-03-01', sortBy: 'date-asc' }));
      expect(dateRange.data.map(row => row.date)).toEqual(['2024-02-28', '2024-02-29', '2024-03-01']);
      const february = await a.scope.activity('2024-02-01', '2024-02-29');
      expect(february.dateTo).toBe('2024-02-29');
      expect(february.data.some(day => day.date === '2024-02-29')).toBe(true);
      expect(february.data.some(day => day.date.startsWith('2024-03'))).toBe(false);
      const december = await a.scope.activity('2023-12-01', '2023-12-31');
      expect(december.data.map(day => day.date)).toEqual(['2023-12-31']);
      expect((await b.scope.summary(1)).pagination.total).toBe(0);
      await expect(b.scope.detail([...createdIds][0]!)).rejects.toMatchObject({ issue: 'not-found' });
    } finally {
      for (const id of createdIds) await a.api.DELETE('/api/diaries/{id}', { params: { path: { id } } });
      for (const client of clients) await client.logout();
    }
  }, 90000);
});
