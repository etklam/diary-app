import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { diaryReviewResponseSchema } from '@diary/contracts/review';
import { createApiClient, createNativeSession, NO_AUTOMATIC_SESSION_RETRY_HEADER } from '@diary/api-client';
import { createAuthLifecycle } from '../../src/auth/lifecycle';
import { createDiaryAccess } from '../../src/diaries/access';
import { createReviewApi } from '../../src/reviews/api';
import { createReviewManager } from '../../src/reviews/manager';
import { createReviewController, type ReviewController } from '../../src/reviews/controller';
import { openReviewRepository } from '../../src/reviews/repository';
import { baselineFor, fieldsFor, payloadFor, type ServerReview } from '../../src/reviews/model';
import type { ReviewApi } from '../../src/reviews/api';
import { openDraftRepository, type DraftDatabase } from '../../src/quick/repository';
import { newDraft } from '../../src/quick/model';
import { deferred, session } from './fixtures';

export const id = '9223372036854775806';
export const serverReview = (patch: Partial<ServerReview> = {}): ServerReview => diaryReviewResponseSchema.parse({ id, title: 'Synthetic review', date: '2024-02-29',
  content: 'Original diary', tags: [], thesis: 'Thesis', risk: 'Risk', execution: 'Execution', reviewDueAt: null, reviewStatus: 'none', reviewedAt: null,
  reviewOutcome: null, reviewSummary: null, reviewLearning: null, reviewAdjustment: null, transactions: [], tradePlans: [], ...patch });
export const sql = (db: DatabaseSync): DraftDatabase => ({ execAsync: async query => { db.exec(query); },
  runAsync: async (query, ...args) => db.prepare(query).run(...args),
  getFirstAsync: async <T>(query: string, ...args: (string | number | null)[]) => (db.prepare(query).get(...args) as T) ?? null });
const controllers: ReviewController[] = [];
afterEach(() => { controllers.forEach(controller => controller.invalidate()); controllers.length = 0; vi.useRealTimers(); });
async function setup(overrides: Partial<ReviewApi> = {}) {
  const db = new DatabaseSync(':memory:'); const repo = await openReviewRepository(sql(db));
  const api: ReviewApi = { ownerId: '1', isCurrent: () => true, read: vi.fn(async () => serverReview()),
    write: vi.fn(async payload => ({ ok: true as const, review: serverReview({ ...payload, reviewStatus: 'reviewed', reviewedAt: '2026-09-20T01:02:03.000Z' }) })), changed: vi.fn(), ...overrides };
  const create = () => {
    const controller = createReviewController({ scope: 'test:origin', diaryId: id, api, repository: Promise.resolve(repo), attemptId: () => 'attempt-1' });
    controllers.push(controller); return controller;
  };
  const model = create(); await model.start();
  return { db, repo, api, model, create };
}
const edits = { reviewOutcome: 'INTACT' as const, reviewSummary: 'Synthetic reflection' };

describe('review authoring controller', () => {
  it('initializes without selecting a new outcome or creating a dirty record; all autosaves remain local', async () => {
    vi.useFakeTimers(); const { model, repo, api } = await setup();
    expect(model.getSnapshot().draft?.fields.reviewOutcome).toBeNull();
    await model.flush(); expect(await repo.hasAny('test:origin', '1')).toBe(false);
    model.edit(edits); await vi.advanceTimersByTimeAsync(401); await model.flush();
    expect((await repo.load('test:origin', '1', id))?.fields).toMatchObject(edits);
    expect(api.write).not.toHaveBeenCalled();
  });
  it('requires outcome, meaningful reflection and limits all three fields', () => {
    const fields = fieldsFor(serverReview());
    expect(() => payloadFor(fields)).toThrow();
    expect(() => payloadFor({ ...fields, reviewOutcome: 'UNCLEAR', reviewLearning: ' \n ' })).toThrow();
    for (const key of ['reviewSummary', 'reviewLearning', 'reviewAdjustment']) expect(() => payloadFor({ ...fields, ...edits, [key]: 'x'.repeat(10001) })).toThrow();
    expect(payloadFor({ ...fields, ...edits, reviewSummary: 'x'.repeat(10000) }).reviewSummary).toHaveLength(10000);
  });
  it('initializes every existing reflection and submits a complete payload preserving unchanged fields', async () => {
    const original = serverReview({ reviewOutcome: 'PARTIAL', reviewStatus: 'reviewed', reviewedAt: '2026-01-01T00:00:00.000Z', reviewSummary: 'Old summary', reviewLearning: 'Keep learning', reviewAdjustment: 'Keep adjustment' });
    const { model, api, repo } = await setup({ read: vi.fn(async () => original) });
    model.edit({ reviewSummary: 'Updated summary' }); await model.submit();
    expect(api.write).toHaveBeenCalledWith({ reviewOutcome: 'PARTIAL', reviewSummary: 'Updated summary', reviewLearning: 'Keep learning', reviewAdjustment: 'Keep adjustment' });
    expect(model.getSnapshot().confirmed).toBe(true); expect(api.changed).toHaveBeenCalledTimes(1);
    expect(await repo.load('test:origin', '1', id)).toBeNull(); await model.submit(); await model.check(); expect(api.write).toHaveBeenCalledTimes(1); expect(api.changed).toHaveBeenCalledTimes(1);
  });
  it('prevents double submission synchronously and conflicting edits', async () => {
    const pending = deferred<ServerReview>(); const { model, api } = await setup();
    model.edit(edits); api.read = () => pending.promise;
    const first = model.submit(); const second = model.submit(); model.edit({ reviewSummary: 'Wrong' });
    pending.resolve(serverReview()); await Promise.all([first, second]);
    expect(api.write).toHaveBeenCalledTimes(1); expect(model.getSnapshot().draft?.fields.reviewSummary).toBe(edits.reviewSummary);
  });
  it('does not dispatch when draft or pending-attempt persistence fails', async () => {
    const { model, api, repo } = await setup(); model.edit(edits);
    const save = vi.spyOn(repo, 'save').mockRejectedValue(new Error('disk'));
    await model.submit(); expect(api.write).not.toHaveBeenCalled(); expect(model.getSnapshot().persistence).toBe('error');
    save.mockRestore(); await model.flush(); vi.spyOn(repo, 'save').mockRejectedValue(new Error('disk'));
    await model.submit(); expect(api.write).not.toHaveBeenCalled();
  });
  it.each([[400, 'SYS_VALIDATION_ERROR'], [401, 'AUTH_UNAUTHORIZED'], [404, 'DIARY_NOT_FOUND']])('retains edits after proven route rejection %s', async (status, code) => {
    const { model, api } = await setup({ write: vi.fn(async () => ({ ok: false as const, status: Number(status), code: String(code) })) });
    model.edit(edits); await model.submit(); expect(model.getSnapshot().draft?.attempt).toBeNull(); expect(api.changed).not.toHaveBeenCalled();
  });
  it.each([502, 503, 504, 401, 400])('keeps unknown response %s locked through reads and restart', async status => {
    const { model, api, create, repo } = await setup({ write: vi.fn(async () => ({ ok: false as const, status, code: null })) });
    model.edit(edits); await model.submit(); await model.check(); await model.submit();
    const record = await repo.load('test:origin', '1', id); expect(record?.attempt?.payload.reviewSummary).toBe(edits.reviewSummary);
    model.invalidate(); const restored = create(); await restored.start(); await restored.check(); await restored.submit();
    expect(restored.getSnapshot().restored).toBe(true); expect(restored.getSnapshot().draft?.attempt).not.toBeNull(); expect(api.write).toHaveBeenCalledTimes(1);
  });
  it('never treats matching pre-existing reflections as receipt for a delayed PATCH', async () => {
    const original = serverReview({ ...edits, reviewStatus: 'reviewed', reviewedAt: '2026-01-01T00:00:00.000Z' });
    const { model, api } = await setup({ read: vi.fn(async () => original), write: vi.fn(async () => { throw new Error('timeout'); }) });
    await model.submit(); await model.check(); await model.submit();
    expect(model.getSnapshot().draft?.attempt).not.toBeNull(); expect(model.getSnapshot().confirmed).toBe(false); expect(api.write).toHaveBeenCalledTimes(1);
    api.read = async () => ({ ...original, reviewedAt: '2026-09-20T00:00:00.000Z' });
    await model.check(); await model.submit(); expect(api.write).toHaveBeenCalledTimes(1);
  });
  it('detects stale edits and requires explicit baseline adoption, preserving local fields', async () => {
    const { model, api } = await setup(); model.edit(edits);
    api.read = async () => serverReview({ reviewSummary: 'Remote change' });
    await model.submit(); expect(api.write).not.toHaveBeenCalled(); expect(model.getSnapshot().conflict).toBe(true);
    await model.adoptServerBaseline(); expect(model.getSnapshot().draft?.fields.reviewSummary).toBe(edits.reviewSummary);
    await model.submit(); expect(api.write).toHaveBeenCalledTimes(1);
  });
  it('late restore reads never replace local typing', async () => {
    const { model, api, create } = await setup(); model.edit(edits); await model.flush(); model.invalidate();
    const pending = deferred<ServerReview>(); api.read = () => pending.promise;
    const restored = create(); const started = restored.start(); await vi.waitFor(() => expect(restored.getSnapshot().ready).toBe(true));
    restored.edit({ reviewLearning: 'Latest local edit' }); pending.resolve(serverReview({ reviewLearning: 'Remote edit' })); await started;
    expect(restored.getSnapshot().draft?.fields.reviewLearning).toBe('Latest local edit'); expect(restored.getSnapshot().conflict).toBe(true);
  });
  it('cancels supported reads on invalidation without cancelling or replaying a mutation', async () => {
    const { model, api } = await setup(); const pending = deferred<ServerReview>(); let signal: AbortSignal | undefined;
    api.read = requested => { signal = requested; return pending.promise; };
    const checked = model.check(); model.invalidate(); expect(signal?.aborted).toBe(true);
    pending.resolve(serverReview()); await checked; expect(api.write).not.toHaveBeenCalled();
  });
  it('serializes autosave and discard without resurrection', async () => {
    vi.useFakeTimers(); const { model, repo } = await setup(); model.edit(edits); const save = model.flush(); const discard = model.discard();
    await Promise.all([save, discard]); await vi.advanceTimersByTimeAsync(1000); expect(await repo.hasAny('test:origin', '1')).toBe(false);
  });
  it('keeps durable confirmation when cleanup fails; restart cleans without a PATCH', async () => {
    const { model, repo, api, create } = await setup(); model.edit(edits);
    const remove = vi.spyOn(repo, 'remove').mockRejectedValue(new Error('disk')); await model.submit();
    expect((await repo.load('test:origin', '1', id))?.confirmed).not.toBeNull(); model.invalidate(); remove.mockRestore();
    const restored = create(); await restored.start(); expect(restored.getSnapshot().confirmed).toBe(true); expect(api.write).toHaveBeenCalledTimes(1); expect(api.changed).toHaveBeenCalledTimes(1);
  });
  it('does not publish or clean up a late prior-owner write response', async () => {
    let current = true; const pending = deferred<Awaited<ReturnType<ReviewApi['write']>>>();
    const { model, api, repo } = await setup({ isCurrent: () => current, write: vi.fn(() => pending.promise) });
    model.edit(edits); const submitted = model.submit(); await vi.waitFor(() => expect(api.write).toHaveBeenCalledTimes(1));
    current = false; model.invalidate(); pending.resolve({ ok: true, review: serverReview({ ...edits, reviewStatus: 'reviewed', reviewedAt: '2026-09-20T00:00:00.000Z' }) }); await submitted;
    expect(api.changed).not.toHaveBeenCalled(); expect((await repo.load('test:origin', '1', id))?.attempt).not.toBeNull();
  });
});

describe('additive review storage', () => {
  it('fails closed on corrupt or wrong-owner records without deleting them', async () => {
    const db = new DatabaseSync(':memory:'); const repo = await openReviewRepository(sql(db));
    db.prepare('INSERT INTO review_drafts VALUES (?, ?, ?, ?)').run('scope', '1', id, '{broken');
    await expect(repo.load('scope', '1', id)).rejects.toThrow();
    expect(db.prepare('SELECT count(*) AS n FROM review_drafts').get()?.n).toBe(1); db.close();
  });
  it('preserves Quick and multiple Review drafts across reopen and owner/environment cleanup', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'review-synthetic-')); const filename = join(directory, 'draft.db'); let db = new DatabaseSync(filename);
    try {
      const quick = await openDraftRepository(sql(db)); const quickDraft = newDraft('scope', '1', 'Asia/Taipei'); await quick.save(quickDraft);
      let repo = await openReviewRepository(sql(db));
      const draft = { schema: 1 as const, scope: 'scope', ownerId: '1', diaryId: id, revision: 1, fields: { ...fieldsFor(serverReview()), ...edits }, baseline: baselineFor(serverReview()), attempt: null, confirmed: null };
      await repo.save(draft); await repo.save({ ...draft, diaryId: '2' }); await repo.save({ ...draft, ownerId: '2' }); await repo.save({ ...draft, scope: 'other-origin' });
      db.close(); db = new DatabaseSync(filename); repo = await openReviewRepository(sql(db));
      expect(await repo.load('scope', '1', id)).toEqual(draft); await repo.removeOwner('scope', '1');
      expect(await repo.hasAny('scope', '1')).toBe(false); expect(await repo.hasAny('scope', '2')).toBe(true); expect(await repo.hasAny('other-origin', '1')).toBe(true);
      expect(await (await openDraftRepository(sql(db))).load('scope', '1')).toEqual(quickDraft);
    } finally { db.close(); rmSync(directory, { recursive: true }); }
  });
});

describe('owner-bound review access and session transport', () => {
  async function access(fetcher: typeof fetch) {
    let saved = session();
    let expired = false;
    const storage = { get: () => saved, set: vi.fn(), clear: vi.fn() };
    const lifecycle = createAuthLifecycle({ storage, runtime: { login: async () => { saved = session('2'); expired = false; return saved; }, logout: async () => {}, verifyCurrentUser: async () => expired ? { ok: false, status: 401, code: 'AUTH_UNAUTHORIZED' } : { ok: true, user: saved.user } } });
    await lifecycle.bootstrap();
    const api = createApiClient({ baseUrl: 'https://test.invalid', fetch: fetcher });
    const diaries = createDiaryAccess(api, lifecycle);
    return { api, diaries, lifecycle, expire: async () => { expired = true; await lifecycle.retryVerification(); } };
  }
  it('rejects mismatched response IDs and previous owner read responses', async () => {
    const pending = deferred<Response>(); let response: Promise<Response> = Promise.resolve(Response.json(serverReview({ id: '2' })));
    const { diaries, lifecycle } = await access(() => response); const scope = diaries.getScope()!;
    await expect(scope.review(id)).rejects.toMatchObject({ issue: 'invalid-response' });
    response = pending.promise; const read = scope.review(id); await lifecycle.logout(); pending.resolve(Response.json(serverReview()));
    await expect(read).rejects.toThrow(); expect(scope.isCurrent()).toBe(false);
  });
  it.each([401, 503])('marks PATCH single-attempt and does not refresh/replay status %s', async status => {
    const requests: Request[] = [];
    const native = createNativeSession({ baseUrl: 'https://test.invalid', storage: { get: () => session(), set: vi.fn(), clear: vi.fn() },
      fetch: async input => { const request = new Request(input); requests.push(request); return new Response('gateway', { status, headers: { 'retry-after': '0' } }); } });
    const { api, diaries } = await access(native.fetch);
    const review = createReviewApi(api, diaries.getScope()!, id, vi.fn());
    expect(await review.write({ ...edits })).toMatchObject({ ok: false, status });
    expect(requests).toHaveLength(1); expect(requests[0].method).toBe('PATCH'); expect(requests[0].headers.get(NO_AUTOMATIC_SESSION_RETRY_HEADER)).toBe('1');
  });
  it.each(['malformed', 'wrong-id', 'wrong-fields'])('treats %s success as unknown', async kind => {
    const value = kind === 'malformed' ? {} : serverReview({ ...edits, id: kind === 'wrong-id' ? '2' : id, reviewSummary: kind === 'wrong-fields' ? 'Wrong' : edits.reviewSummary, reviewStatus: 'reviewed', reviewedAt: '2026-01-01T00:00:00.000Z' });
    const { api, diaries } = await access(async () => Response.json(value));
    await expect(createReviewApi(api, diaries.getScope()!, id, vi.fn()).write(edits)).rejects.toThrow();
  });
  it('manager retains drafts on expiry and isolates another owner, including multiple diary drafts', async () => {
    const { api, diaries, lifecycle, expire } = await access(async input => Response.json(serverReview({ id: new URL(new Request(input).url).pathname.split('/')[3] })));
    const db = new DatabaseSync(':memory:'); const repo = await openReviewRepository(sql(db));
    const manager = createReviewManager({ api, diaries, scope: 'scope', repository: async () => repo, attemptId: () => 'attempt' });
    const a = manager.open(id)!; controllers.push(a); await vi.waitFor(() => expect(a.getSnapshot().ready).toBe(true)); a.edit(edits);
    const another = manager.open('2')!; controllers.push(another); await vi.waitFor(() => expect(another.getSnapshot().ready).toBe(true)); another.edit(edits);
    await manager.flush(); expect(await manager.hasAny()).toBe(true);
    // Owner invalidation retains encrypted rows; only explicit discardOwner removes them.
    await expire(); expect(lifecycle.getState().status).toBe('session-invalid'); expect(await repo.hasAny('scope', '1')).toBe(true);
    await lifecycle.login({ email: 'other@example.test', password: 'synthetic' }); expect(await manager.hasAny()).toBe(false);
    await manager.discardOwner(); expect(await repo.hasAny('scope', '1')).toBe(true);
    expect(a.getSnapshot().draft?.ownerId).toBe('1'); expect(diaries.getScope()?.ownerId).toBe('2');
  });
});
