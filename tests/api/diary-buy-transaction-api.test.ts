import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createApiClient, createNativeSession } from '@diary/api-client';
import { type NativeSession } from '@diary/contracts';
import { holdingsResponseSchema } from '@diary/contracts/ledger';
import { createAuthLifecycle } from '../../src/auth/lifecycle';
import { createDiaryAccess } from '../../src/diaries/access';
import { createDiaryEditorApi } from '../../src/diary-editor/api';
import { createDiaryEditorController } from '../../src/diary-editor/controller';
import { openAuthoringDraftRepository } from '../../src/drafts/repository';
import type { DraftDatabase } from '../../src/quick/repository';
import { localTradeValue } from '../../src/diary-editor/trade-time';

describe.runIf(process.env.DIARY_DISPOSABLE_TEST_ENV === '1')('BUY transaction API acceptance', () => {
  it('saves Diary and BUY atomically, canonicalizes decimals, and reads the saved transaction and holdings', async () => {
    const baseUrl = process.env.DIARY_API_BASE_URL!;
    expect(['localhost', '127.0.0.1', '[::1]']).toContain(new URL(baseUrl).hostname);
    const scenario = randomUUID();
    const rawId = scenario.replaceAll('-', '');
    const transport: typeof fetch = (input, init) => {
      const request = new Request(input, init);
      request.headers.set('x-e2e-test-id', scenario);
      request.headers.set('x-forwarded-for', `fd00:${rawId.slice(0, 4)}:${rawId.slice(4, 8)}:${rawId.slice(8, 12)}::1`);
      return fetch(request);
    };
    const credentials = { email: `diary-buy-${randomUUID().slice(0, 8)}@example.test`, password: `Synthetic-${randomUUID()}` };
    const registered = await transport(`${baseUrl}/api/auth/register`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(credentials) });
    expect(registered.status).toBe(200);
    let saved: NativeSession | null = null;
    const storage = { get: () => saved, set: (value: NativeSession) => { saved = value; }, clear: () => { saved = null; } };
    const native = createNativeSession({ baseUrl, storage, fetch: transport });
    const login = await native.login(credentials);
    const api = createApiClient({ baseUrl, fetch: native.fetch });
    const lifecycle = createAuthLifecycle({ storage, runtime: { login: native.login, logout: native.logout,
      verifyCurrentUser: async () => ({ ok: true, user: login.user }) } });
    await lifecycle.bootstrap();
    const access = createDiaryAccess(api, lifecycle);
    const scope = access.getScope()!;
    const editorApi = createDiaryEditorApi(api, scope, () => access.changed(scope));
    const otherCredentials = { email: `diary-buy-other-${randomUUID().slice(0, 8)}@example.test`, password: `Synthetic-${randomUUID()}` };
    const otherRegistration = await transport(`${baseUrl}/api/auth/register`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(otherCredentials) });
    expect(otherRegistration.status).toBe(200);
    let otherSaved: NativeSession | null = null;
    const otherStorage = { get: () => otherSaved, set: (value: NativeSession) => { otherSaved = value; }, clear: () => { otherSaved = null; } };
    const otherNative = createNativeSession({ baseUrl, storage: otherStorage, fetch: transport });
    const otherLogin = await otherNative.login(otherCredentials);
    const otherApi = createApiClient({ baseUrl, fetch: otherNative.fetch });
    const otherLifecycle = createAuthLifecycle({ storage: otherStorage, runtime: { login: otherNative.login, logout: otherNative.logout,
      verifyCurrentUser: async () => ({ ok: true, user: otherLogin.user }) } });
    await otherLifecycle.bootstrap();
    const otherAccess = createDiaryAccess(otherApi, otherLifecycle);
    const otherScope = otherAccess.getScope()!;
    const database = new DatabaseSync(':memory:');
    const adapter: DraftDatabase = { execAsync: async query => { database.exec(query); },
      runAsync: async (query, ...params) => database.prepare(query).run(...params),
      getFirstAsync: async <T>(query: string, ...params: (string | number | null)[]) => (database.prepare(query).get(...params) as T | undefined) ?? null };
    const repository = await openAuthoringDraftRepository(adapter);
    const date = '2021-04-05';
    const identity = { scope: baseUrl, ownerId: login.user.id, entityType: 'diary-editor', entityId: `new:${date}` };
    let createdId: string | null = null;
    try {
      const rejected = await api.POST('/api/diaries', { body: { date, title: 'Must roll back', content: 'Rejected trade',
        transactions: [{ symbol: 'BAD', type: 'BUY', quantity: '1.00001', price: '10', tradeDate: '2021-04-05T12:00:00.000Z' }] } as never });
      expect(rejected.response.status).toBe(400);
      expect(await scope.byDate(date)).toBeNull();

      const ledgerRejected = await api.POST('/api/diaries', { body: { date, title: 'Ledger rejection must roll back', content: 'BUY then oversell',
        transactions: [
          { symbol: 'BAD', type: 'BUY', quantity: '1', price: '10', tradeDate: '2021-04-05T12:00:00.000Z' },
          { symbol: 'BAD', type: 'SELL', quantity: '2', price: '10', tradeDate: '2021-04-05T13:00:00.000Z' },
        ] } as never });
      expect(ledgerRejected.response.status).toBe(400);
      expect(await scope.byDate(date)).toBeNull();
      expect(holdingsResponseSchema.parse((await api.GET('/api/stocks/holdings')).data).some(row => row.symbol === 'BAD')).toBe(false);

      const instant = '2021-04-05T12:30:45.678Z';
      const controller = createDiaryEditorController({ scope: baseUrl, identity, diaryId: null, initialDate: date, api: editorApi,
        repository: Promise.resolve(repository), attemptId: randomUUID });
      await controller.start();
      controller.edit({ title: 'Synthetic BUY diary', content: 'Atomic purchase and exact time', stockSymbols: '', tags: '',
        thesis: 'Plan', risk: '', execution: '', transactions: [{ key: 'new-buy', type: 'BUY', symbol: ' buytest ', quantity: '001.2500',
          price: '010.1000', tradeDate: localTradeValue(new Date(instant)), instant, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          notes: 'patient entry', strategy: 'breakout', emotion: 'confident' }] });
      await controller.save();
      createdId = controller.getSnapshot().confirmedId;
      expect(createdId).toBeTruthy();
      expect(controller.getSnapshot()).toMatchObject({ confirmedId: createdId, ledgerReadbackIssue: false,
        ledgerReadback: { transactions: [{ type: 'BUY', symbol: 'BUYTEST', quantity: '1.25', price: '10.1', tradeDate: instant,
          notes: 'patient entry', strategy: 'breakout', emotion: 'confident' }] } });

      const savedDiary = await scope.detail(createdId!);
      expect(savedDiary.transactions).toHaveLength(1);
      expect(savedDiary.transactions![0]).toMatchObject({ type: 'BUY', symbol: 'BUYTEST', quantity: '1.25', price: '10.1', tradeDate: instant });
      const holdings = holdingsResponseSchema.parse((await api.GET('/api/stocks/holdings')).data);
      expect(holdings).toContainEqual({ symbol: 'BUYTEST', quantity: '1.25', avgCost: '10.1', totalCost: '12.625' });
      expect(controller.getSnapshot().ledgerReadback?.holdings).toEqual(holdings);
      expect(controller.getSnapshot().ledgerReadback?.holdings).toContainEqual({ symbol: 'BUYTEST', quantity: '1.25', avgCost: '10.1', totalCost: '12.625' });
      await expect(otherScope.detail(createdId!)).rejects.toMatchObject({ issue: 'not-found' });
      expect(holdingsResponseSchema.parse((await otherApi.GET('/api/stocks/holdings')).data)).not.toContainEqual(
        expect.objectContaining({ symbol: 'BUYTEST' }));
      console.log('BUY live API: decimal/schema and ledger-invariant rejections left no Diary/holding, exact BUY readback and canonical holdings: PASS');
    } finally {
      if (createdId) await api.DELETE('/api/diaries/{id}', { params: { path: { id: createdId } } });
      await native.logout(); await otherNative.logout(); access.dispose(); otherAccess.dispose(); database.close();
    }
  }, 90000);
});
