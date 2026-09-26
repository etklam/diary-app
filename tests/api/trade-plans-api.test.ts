import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createApiClient, createNativeSession } from '@diary/api-client';
import { diaryResponseSchema, type NativeSession } from '@diary/contracts';
import { PlanFailure, tradePlanService } from '../../src/trade-plans/service';

const baseUrl = process.env.DIARY_API_BASE_URL;
const enabled = process.env.DIARY_DISPOSABLE_TEST_ENV === '1' && !!baseUrl;

describe.runIf(enabled)('F2 disposable Trade Plan API acceptance', () => {
  it('round-trips exact levels, lifecycle, filters and same-owner Diary linking', async () => {
    expect(['localhost', '127.0.0.1', '[::1]']).toContain(new URL(baseUrl!).hostname);
    const scenario = randomUUID(); const compact = scenario.replaceAll('-', '');
    const transport: typeof fetch = (input, init) => { const request = new Request(input, init); request.headers.set('x-e2e-test-id', scenario); request.headers.set('x-forwarded-for', `fd00:${compact.slice(0, 4)}:${compact.slice(4, 8)}:${compact.slice(8, 12)}::1`); return fetch(request); };
    async function owner(label: string) {
      const credentials = { email: `trade-plan-${label}-${randomUUID()}@example.test`, password: 'SyntheticPlan2026' };
      expect((await transport(`${baseUrl}/api/auth/register`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(credentials) })).status).toBe(200);
      let saved: NativeSession | null = null;
      const native = createNativeSession({ baseUrl: baseUrl!, fetch: transport, storage: { get: () => saved, set: value => { saved = value; }, clear: () => { saved = null; } } });
      const login = await native.login(credentials);
      const api = createApiClient({ baseUrl: baseUrl!, fetch: native.fetch });
      return { native, api, service: tradePlanService(api, { ownerId: login.user.id, isCurrent: () => true }) };
    }
    const a = await owner('a'); const b = await owner('b');
    let diaryId: string | null = null; let planId: string | null = null;
    try {
      const diaryResult = await a.api.POST('/api/diaries', { body: { date: '2020-02-18', title: 'Synthetic plan link', content: 'No personal data' } });
      expect(diaryResult.response.status).toBe(201);
      diaryId = diaryResponseSchema.parse(diaryResult.data).id;
      const body = { symbol: 'aapl', setupType: 'Synthetic setup', entryPrice: '123.123456', entryZoneLow: '120.000001', entryZoneHigh: '125.123456', stopLoss: '115.000001', targetPrice: '150.999999', maxPositionSize: '9007199254740991.01', invalidationCondition: 'Evidence changes', notes: 'Exact strings', status: 'draft' as const, diaryId };
      const created = await a.service.create(body); planId = created.id;
      expect(created).toMatchObject({ symbol: 'AAPL', entryPrice: body.entryPrice, maxPositionSize: body.maxPositionSize, diaryId, status: 'draft' });
      expect((await a.service.detail(planId)).diary?.id).toBe(diaryId);
      await expect(b.service.detail(planId)).rejects.toMatchObject({ kind: 'not-found' });
      await expect(b.service.update(planId, { ...body, symbol: 'MSFT' })).rejects.toMatchObject({ kind: 'rejected' });
      await expect(b.service.create({ ...body, symbol: 'MSFT' })).rejects.toMatchObject({ kind: 'rejected' });
      expect((await a.service.list({ page: 1, limit: 20, sortBy: 'symbol-asc', status: 'draft', symbol: 'AAPL' })).data.map(item => item.id)).toContain(planId);
      const active = await a.service.update(planId, { ...body, status: 'active' }); expect(active.status).toBe('active');
      const closed = await a.service.update(planId, { ...body, status: 'closed', diaryId: null }); expect(closed.diaryId).toBeNull();
      expect((await a.service.list({ page: 1, limit: 20, sortBy: 'updatedAt-desc', status: 'active' })).data.some(item => item.id === planId)).toBe(false);
      expect((await a.service.list({ page: 1, limit: 1, sortBy: 'createdAt-desc' })).pagination.limit).toBe(1);
      await a.service.remove(planId); planId = null;
    } finally {
      if (planId) await a.service.remove(planId).catch(() => {});
      if (diaryId) await a.api.DELETE('/api/diaries/{id}', { params: { path: { id: diaryId } } }).catch(() => {});
      await a.native.logout().catch(() => {}); await b.native.logout().catch(() => {});
    }
  }, 60_000);
});
