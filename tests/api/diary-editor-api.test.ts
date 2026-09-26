import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createApiClient, createNativeSession } from '@diary/api-client';
import { diaryResponseSchema, type NativeSession } from '@diary/contracts';
import { createAuthLifecycle } from '../../src/auth/lifecycle';
import { createDiaryAccess } from '../../src/diaries/access';
import { createDiaryEditorApi } from '../../src/diary-editor/api';
import { createDiaryEditorController } from '../../src/diary-editor/controller';
import { editorDraftSchema } from '../../src/diary-editor/model';
import { openAuthoringDraftRepository } from '../../src/drafts/repository';
import type { DraftDatabase } from '../../src/quick/repository';

describe.runIf(process.env.DIARY_DISPOSABLE_TEST_ENV === '1')('P1F complete Diary editor API acceptance', () => {
  it('creates and updates explicit-date Diaries, preserves related records, clears content metadata, conflicts by day, and isolates owners', async () => {
    const baseUrl = process.env.DIARY_API_BASE_URL!;
    expect(['localhost', '127.0.0.1', '[::1]']).toContain(new URL(baseUrl).hostname);
    const scenario = randomUUID();
    const rawId = scenario.replaceAll('-', '');
    const ip = `fd00:${rawId.slice(0, 4)}:${rawId.slice(4, 8)}:${rawId.slice(8, 12)}::1`;
    const transport: typeof fetch = (input, init) => {
      const request = new Request(input, init); request.headers.set('x-e2e-test-id', scenario); request.headers.set('x-forwarded-for', ip); return fetch(request);
    };
    const sessions: ReturnType<typeof createNativeSession>[] = [];
    const register = async (label: string) => {
      const credentials = { email: `diary-editor-${label}-${randomUUID().slice(0, 8)}@example.test`, password: `Synthetic-${randomUUID()}` };
      const registered = await transport(`${baseUrl}/api/auth/register`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(credentials) });
      expect(registered.status).toBe(200);
      let saved: NativeSession | null = null;
      const storage = { get: () => saved, set: (value: NativeSession) => { saved = value; }, clear: () => { saved = null; } };
      const native = createNativeSession({ baseUrl, storage, fetch: transport }); sessions.push(native);
      const login = await native.login(credentials);
      const api = createApiClient({ baseUrl, fetch: native.fetch });
      const lifecycle = createAuthLifecycle({ storage, runtime: { login: native.login, logout: native.logout,
        verifyCurrentUser: async () => ({ ok: true, user: login.user }) } });
      await lifecycle.bootstrap();
      const access = createDiaryAccess(api, lifecycle);
      return { api, access, native, ownerId: login.user.id };
    };
    const a = await register('a'); const b = await register('b');
    const db = new DatabaseSync(':memory:');
    const adapter: DraftDatabase = { execAsync: async query => { db.exec(query); }, runAsync: async (query, ...params) => db.prepare(query).run(...params),
      getFirstAsync: async <T>(query: string, ...params: (string | number | null)[]) => (db.prepare(query).get(...params) as T | undefined) ?? null };
    const repository = await openAuthoringDraftRepository(adapter);
    const scope = a.access.getScope()!; const editorApi = createDiaryEditorApi(a.api, scope, () => a.access.changed(scope));
    const otherScope = b.access.getScope()!; const otherEditorApi = createDiaryEditorApi(b.api, otherScope, () => b.access.changed(otherScope));
    const cleanup = new Set<string>();
    const mkController = (id: string | null, date: string) => {
      const identity = { scope: baseUrl, ownerId: a.ownerId, entityType: 'diary-editor', entityId: id ? `diary:${id}` : `new:${date}` };
      return createDiaryEditorController({ scope: baseUrl, identity, diaryId: id, initialDate: date, api: editorApi,
        repository: Promise.resolve(repository), attemptId: randomUUID });
    };
    let createdId: string | null = null;
    try {
      const created = await a.api.POST('/api/diaries', { body: { date: '2020-02-01', title: 'Synthetic editor baseline', content: 'Original source body',
        tags: ['keep-tag'], stockSymbols: ['SYN'], thesis: 'Original thesis', risk: 'Original risk', execution: 'Original execution',
        transactions: [{ symbol: 'SYN', type: 'BUY', quantity: '1', price: '10', tradeDate: '2020-02-01T12:00:00.000Z' }],
        alerts: [{ message: 'Synthetic reminder', triggerAt: '2020-02-02T12:00:00.000Z' }] } });
      expect(created.response.status).toBe(201);
      const original = diaryResponseSchema.parse(created.data); cleanup.add(original.id);
      expect(original.transactions).toHaveLength(1); expect(original.alerts).toHaveLength(1);
      const review = await a.api.PATCH('/api/diaries/{id}/review', { params: { path: { id: original.id } },
        body: { reviewOutcome: 'PARTIAL', reviewSummary: 'Synthetic review', reviewLearning: 'Learning retained', reviewAdjustment: 'Adjustment retained' } });
      expect(review.response.status).toBe(200);
      const beforeUpdate = await scope.detail(original.id);

      const update = mkController(original.id, original.date); await update.start();
      update.edit({ title: 'Changed title', content: '# Updated Markdown\n\nExact body', tags: '', stockSymbols: '', thesis: '', risk: '', execution: '' });
      await update.save();
      expect(update.getSnapshot()).toMatchObject({ confirmedId: original.id, persistence: 'saved', refreshIssue: false });
      const latest = await scope.detail(original.id);
      expect(latest).toMatchObject({ title: 'Changed title', content: '# Updated Markdown\n\nExact body', tags: [], stockSymbols: [], thesis: null, risk: null, execution: null });
      expect(latest.transactions).toEqual(beforeUpdate.transactions); expect(latest.alerts).toEqual(beforeUpdate.alerts);
      for (const key of ['reviewDueAt', 'reviewStatus', 'reviewedAt', 'reviewOutcome', 'reviewSummary', 'reviewLearning', 'reviewAdjustment'] as const)
        expect(latest[key]).toEqual(beforeUpdate[key]);

      const duplicate = mkController(null, original.date); await duplicate.start();
      expect(duplicate.getSnapshot()).toMatchObject({ conflict: true, existingId: original.id });
      await duplicate.save(); expect(duplicate.getSnapshot().confirmedId).toBeNull();
      expect(await repository.load({ scope: baseUrl, ownerId: a.ownerId, entityType: 'diary-editor', entityId: `new:${original.date}` },
        { schemaVersion: 1, schema: editorDraftSchema })).toBeNull();

      const forbidden = await otherEditorApi.write('update', original.id, { date: original.date, title: 'Forbidden edit', content: 'No owner access', tags: [], stockSymbols: [], thesis: null, risk: null, execution: null });
      expect(forbidden).toMatchObject({ ok: false, status: 404, code: 'DIARY_NOT_FOUND' });
      expect((await scope.detail(original.id)).title).toBe('Changed title');

      const create = mkController(null, '2020-02-02'); await create.start();
      create.edit({ title: 'Synthetic complete diary', content: 'Complete body with **Markdown**', tags: 'created, complete', stockSymbols: 'syn', thesis: 'Thesis', risk: '', execution: 'Executed' });
      await create.save();
      createdId = create.getSnapshot().confirmedId; expect(createdId).toBeTruthy(); cleanup.add(createdId!);
      const final = await scope.detail(createdId!);
      expect(final).toMatchObject({ date: '2020-02-02', title: 'Synthetic complete diary', tags: ['created', 'complete'], stockSymbols: ['SYN'], thesis: 'Thesis', risk: null, execution: 'Executed' });
      expect(final.transactions ?? []).toEqual([]); expect(final.alerts ?? []).toEqual([]);

      const conflict = await a.api.POST('/api/diaries', { body: { date: original.date, title: 'Conflict must not append', content: 'Duplicate date' } });
      expect(conflict.response.status).toBe(409); expect(conflict.error).toMatchObject({ data: { code: 'DIARY_ALREADY_EXISTS' } });
      console.log('P1F live API: explicit-date create, update/clear, linked transaction and reminder preservation, duplicate-day rejection and owner privacy: PASS');
    } finally {
      for (const id of cleanup) await a.api.DELETE('/api/diaries/{id}', { params: { path: { id } } });
      for (const native of sessions) await native.logout(); db.close();
    }
  }, 90000);
});
