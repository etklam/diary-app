import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { describe, expect, it, vi } from 'vitest';
import { createApiClient, createNativeSession } from '@diary/api-client';
import { diaryResponseSchema, type NativeSession } from '@diary/contracts';
import { createAuthLifecycle } from '../../src/auth/lifecycle';
import { createDiaryAccess } from '../../src/diaries/access';
import { createReviewApi } from '../../src/reviews/api';
import { createReviewController } from '../../src/reviews/controller';
import { openReviewRepository } from '../../src/reviews/repository';
import type { DraftDatabase } from '../../src/quick/repository';

describe.runIf(process.env.DIARY_DISPOSABLE_TEST_ENV === '1')('P1C-2A disposable review API', () => {
  it('completes and edits only review fields, rejects invalid/cross-owner writes, and never replays uncertain PATCH', async () => {
    const baseUrl = process.env.DIARY_API_BASE_URL!;
    expect(['localhost', '127.0.0.1', '[::1]']).toContain(new URL(baseUrl).hostname);
    const scenario = randomUUID();
    const transport: typeof fetch = (input, init) => {
      const request = new Request(input, init); request.headers.set('x-e2e-test-id', scenario); return fetch(request);
    };
    const register = async (label: string) => {
      const credentials = { email: `review-${label}-${randomUUID().slice(0, 8)}@example.test`, password: `Synthetic-${randomUUID()}` };
      const registered = await transport(`${baseUrl}/api/auth/register`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(credentials) });
      expect(registered.status).toBe(200);
      let saved: NativeSession | null = null;
      const storage = { get: () => saved, set: (value: NativeSession) => { saved = value; }, clear: () => { saved = null; } };
      const native = createNativeSession({ baseUrl, storage, fetch: transport }); const login = await native.login(credentials);
      const api = createApiClient({ baseUrl, fetch: native.fetch });
      const lifecycle = createAuthLifecycle({ storage, runtime: { login: native.login, logout: native.logout, verifyCurrentUser: async () => ({ ok: true, user: login.user }) } });
      await lifecycle.bootstrap(); const access = createDiaryAccess(api, lifecycle);
      return { api, access, native, credentials, ownerId: login.user.id };
    };
    const a = await register('a'), b = await register('b');
    const db = new DatabaseSync(':memory:');
    const adapter: DraftDatabase = { execAsync: async query => { db.exec(query); }, runAsync: async (query, ...args) => db.prepare(query).run(...args),
      getFirstAsync: async <T>(query: string, ...args: (string | number | null)[]) => (db.prepare(query).get(...args) as T) ?? null };
    const repo = await openReviewRepository(adapter);
    const control = async (mode?: string) => (await fetch(`http://127.0.0.1:3102/${mode ? `?mode=${mode}` : ''}`)).json();
    let id: string | null = null;
    try {
      const created = await a.api.POST('/api/diaries', { body: { date: '2024-02-29', title: 'Synthetic review acceptance', content: 'Original diary must remain intact', tags: ['review-fixture'], stockSymbols: ['SYN'], thesis: 'Synthetic thesis', risk: 'Synthetic risk', execution: 'Synthetic execution', reviewDueAt: '2020-01-01T00:00:00.000Z' } });
      const original = diaryResponseSchema.parse(created.data); id = original.id;
      const scope = a.access.getScope()!; const reviewApi = createReviewApi(a.api, scope, id, () => a.access.changed(scope));
      const create = () => createReviewController({ scope: baseUrl, diaryId: id!, api: reviewApi, repository: Promise.resolve(repo), attemptId: randomUUID });
      const originalDetail = await scope.detail(id);
      const initial = await reviewApi.read(); expect(initial.reviewStatus).toBe('pending'); expect(initial.reviewOutcome).toBeNull();
      const before = await scope.reviews(1);
      const model = create(); await model.start(); model.edit({ reviewOutcome: 'PARTIAL', reviewSummary: '  Summary one  ', reviewLearning: 'Learning retained', reviewAdjustment: 'Adjustment retained' }); await model.flush();
      expect((await reviewApi.read()).reviewStatus).toBe('pending'); await model.submit(); expect(model.getSnapshot().confirmed).toBe(true);
      const completed = await reviewApi.read(); expect(completed.reviewSummary).toBe('Summary one'); expect(completed.reviewStatus).toBe('reviewed'); expect(completed.reviewedAt).not.toBeNull();
      const queue = await scope.reviews(1); expect(queue.counts.overdue).toBe(before.counts.overdue - 1); expect(queue.counts.completed).toBe(before.counts.completed + 1); expect(queue.completed.some(item => item.id === id)).toBe(true);
      const edit = create(); await edit.start(); edit.edit({ reviewSummary: 'Updated summary' }); await edit.submit(); expect(edit.getSnapshot().confirmed).toBe(true);
      const updated = await reviewApi.read(); expect(updated.reviewLearning).toBe('Learning retained'); expect(updated.reviewAdjustment).toBe('Adjustment retained'); expect(updated.reviewedAt! > completed.reviewedAt!).toBe(true);
      const detail = await scope.detail(id); for (const key of ['content', 'tags', 'stockSymbols', 'thesis', 'risk', 'execution', 'transactions', 'tradePlans'] as const) expect(detail[key]).toEqual(originalDetail[key]);
      expect(detail.updatedAt).toBe(updated.reviewedAt);
      const invalid = await a.api.PATCH('/api/diaries/{id}/review', { params: { path: { id } }, body: { reviewOutcome: 'UNCLEAR', reviewSummary: ' \n ' } });
      expect(invalid.response.status).toBe(400); expect(invalid.error).toMatchObject({ data: { code: 'SYS_VALIDATION_ERROR' } }); expect(await reviewApi.read()).toEqual(updated);
      const foreign = await b.api.PATCH('/api/diaries/{id}/review', { params: { path: { id } }, body: { reviewOutcome: 'INTACT', reviewSummary: 'Forbidden' } }); expect(foreign.response.status).toBe(404); expect(foreign.error).toMatchObject({ data: { code: 'DIARY_NOT_FOUND' } });
      expect((await b.api.GET('/api/diaries/{id}/review', { params: { path: { id } } })).response.status).toBe(404);
      if (process.env.DIARY_FAULT_PROXY === '1') {
        for (const mode of ['committed502', 'committed503', 'committed504', 'drop', 'delayed']) {
          await control('normal'); const attempt = create(); await attempt.start(); attempt.edit({ reviewSummary: `Synthetic ${mode}` });
          const snapshot = await control(mode); await attempt.submit(); expect(attempt.getSnapshot().draft?.attempt).not.toBeNull();
          await attempt.check(); await attempt.submit();
          if (mode === 'delayed') {
            expect((await reviewApi.read()).reviewSummary).not.toBe(`Synthetic ${mode}`);
            await control('release'); await vi.waitFor(async () => expect((await control()).patchCommits).toBe(snapshot.patchCommits + 1));
          }
          attempt.invalidate(); const restored = create(); await restored.start(); await restored.check(); await restored.submit();
          const after = await control(); expect(after.patches).toBe(snapshot.patches + 1); expect(after.forwardedPatches).toBe(snapshot.forwardedPatches + 1); expect(after.patchCommits).toBe(snapshot.patchCommits + 1);
          expect(restored.getSnapshot().confirmed).toBe(false); expect(restored.getSnapshot().draft?.attempt).not.toBeNull();
          await restored.discard(); await control('normal');
        }
        // An identical pre-existing payload is still not an operation receipt.
        const same = create(); await same.start(); const snapshot = await control('delayed'); await same.submit(); await same.check(); await same.submit();
        expect(same.getSnapshot().confirmed).toBe(false); expect((await control()).patches).toBe(snapshot.patches + 1);
        await control('release'); await vi.waitFor(async () => expect((await control()).patchCommits).toBe(snapshot.patchCommits + 1)); await same.discard(); await control('normal');
      }
      if (process.env.DIARY_KEEP_FIXTURES === '1') {
        await mkdir('.expo', { recursive: true }); await writeFile('.expo/p1c2a-fixtures.json', JSON.stringify({ a: a.credentials, b: b.credentials, id, ownerA: a.ownerId, ownerB: b.ownerId }));
      }
    } finally {
      if (process.env.DIARY_FAULT_PROXY === '1') await control('normal');
      if (id && process.env.DIARY_KEEP_FIXTURES !== '1') await a.api.DELETE('/api/diaries/{id}', { params: { path: { id } } });
      await a.native.logout(); await b.native.logout(); db.close();
    }
  }, 90000);
});
