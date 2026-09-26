import { describe, expect, it, vi } from 'vitest';
import type { NativeSessionStorage } from '@diary/api-client';
import { diaryResponseSchema } from '@diary/contracts';
import { diarySummaryListResponseSchema, type DiarySummary } from '@diary/contracts/diary-summary';
import { createAuthRuntime } from '../../src/auth/runtime';
import { createAuthLifecycle } from '../../src/auth/lifecycle';
import { createDiaryAccess, ReadError, StaleRead, type DiaryReadScope, type SummaryPage } from '../../src/diaries/access';
import { createDetailState, createTimelineState } from '../../src/diaries/state';
import { civilDate, instantDate } from '../../src/diaries/dates';
import { deferred, session, user } from './fixtures';

const largeId = '9223372036854775806';
function row(id = largeId): DiarySummary {
  return { id, date: '2026-01-01', title: 'Synthetic journal', excerpt: 'A bounded excerpt', tags: ['test'], stockSymbols: ['SYN'], createdVia: 'WEB', reviewStatus: 'none', reviewDueAt: null, reviewOutcome: null, transactionCount: 0, alertCount: 0 };
}
function page(ids = [largeId], current = 1, totalPages = 1): SummaryPage {
  return { data: ids.map(id => row(id)), pagination: { page: current, limit: 20, total: ids.length * totalPages, totalPages } };
}
function detail(id = largeId, owner = '1') {
  return diaryResponseSchema.parse({ id, userId: owner, title: 'Synthetic journal', date: '2026-01-01', content: 'Line one\nLine two', tags: [], tagsString: null, stockSymbols: [], createdVia: 'WEB', createdByLabel: null, createdAt: '2026-01-01T00:30:00.000Z', updatedAt: '2026-01-01T00:30:00.000Z' });
}
function scope(overrides: Partial<DiaryReadScope> = {}): DiaryReadScope {
  return { review: vi.fn(), ownerId: '1', isCurrent: () => true, summary: async () => page(), activity: async (dateFrom, dateTo) => ({ data: [], dateFrom, dateTo }), reviews: async () => ({ counts: { overdue: 0, today: 0, upcoming: 0, unscheduled: 0, completed: 0 }, overdue: [], today: [], upcoming: [], unscheduled: [], completed: [] }), detail: async id => detail(id), byDate: async () => null, ...overrides };
}

describe('Timeline state', () => {
  it('parses bounded responses and keeps int64 IDs as strings', () => {
    expect(diarySummaryListResponseSchema.parse(page()).data[0].id).toBe(largeId);
    expect(diarySummaryListResponseSchema.safeParse({ ...page(), data: [{ ...row(), id: 42 }] }).success).toBe(false);
    expect(diarySummaryListResponseSchema.safeParse({ ...page(), data: [{ ...row(), content: 'full body' }] }).success).toBe(false);
  });
  it('loads initially, merges pages without duplicate IDs and stops at the end', async () => {
    const summary = vi.fn().mockResolvedValueOnce(page(['1', '2'], 1, 2)).mockResolvedValueOnce(page(['2', '3'], 2, 2));
    const model = createTimelineState(scope({ summary }));
    expect(model.getSnapshot().phase).toBe('initial');
    await model.load();
    expect(model.getSnapshot()).toMatchObject({ page: 1, phase: 'idle', hasMore: true });
    await model.more();
    expect(model.getSnapshot().rows.map(item => item.id)).toEqual(['1', '2', '3']);
    expect(model.getSnapshot().hasMore).toBe(false);
    await model.more();
    expect(summary).toHaveBeenCalledTimes(2);
  });
  it('refresh replaces rows and ignores an older in-flight next page', async () => {
    const pending = deferred<SummaryPage>();
    const summary = vi.fn().mockResolvedValueOnce(page(['1'], 1, 3)).mockImplementationOnce(() => pending.promise).mockResolvedValueOnce(page(['4']));
    const model = createTimelineState(scope({ summary }));
    await model.load();
    const more = model.more();
    await model.refresh();
    pending.resolve(page(['2'], 2, 3));
    await more;
    expect(model.getSnapshot().rows.map(item => item.id)).toEqual(['4']);
    expect(model.getSnapshot().page).toBe(1);
  });
  it('keeps rows on refresh failure and retries the failed operation', async () => {
    const summary = vi.fn().mockResolvedValueOnce(page()).mockRejectedValueOnce(new ReadError('network')).mockResolvedValueOnce(page(['2']));
    const model = createTimelineState(scope({ summary }));
    await model.load(); await model.refresh();
    expect(model.getSnapshot()).toMatchObject({ issue: 'network', failed: 'refresh', rows: [row()] });
    await model.retry();
    expect(model.getSnapshot().rows[0].id).toBe('2');
    expect(summary.mock.calls.map(args => args[0])).toEqual([1, 1, 1]);
  });
  it('ignores late results after owner invalidation or unmount', async () => {
    const pending = deferred<SummaryPage>();
    let current = true;
    const model = createTimelineState(scope({ summary: () => pending.promise, isCurrent: () => current }));
    const load = model.load(); current = false;
    pending.resolve(page()); await load;
    expect(model.getSnapshot().rows).toEqual([]);
    const other = createTimelineState(scope());
    const canceled = other.load(); other.cancel(); await canceled;
    expect(other.getSnapshot().rows).toEqual([]);
  });
  it('does not advance past a failed page and prevents concurrent load-more', async () => {
    const pending = deferred<SummaryPage>();
    const summary = vi.fn().mockResolvedValueOnce(page(['1'], 1, 2)).mockImplementationOnce(() => pending.promise).mockResolvedValueOnce(page(['2'], 2, 2));
    const model = createTimelineState(scope({ summary }));
    await model.load(); const first = model.more(); await model.more();
    expect(summary).toHaveBeenCalledTimes(2);
    pending.reject(new ReadError('server')); await first;
    expect(model.getSnapshot().page).toBe(1);
    await model.retry();
    expect(summary.mock.calls.map(args => args[0])).toEqual([1, 2, 2]);
  });
  it('represents an empty successful result', async () => {
    const model = createTimelineState(scope({ summary: async () => page([], 1, 0) }));
    await model.load();
    expect(model.getSnapshot()).toMatchObject({ phase: 'idle', rows: [], issue: null, hasMore: false });
  });
});

describe('detail and date semantics', () => {
  it('refreshes an already mounted Detail after mutation and keeps saved/read failure distinct', async () => {
    let fail = false;
    const read = vi.fn(async () => { if (fail) throw new ReadError('server'); return detail(); });
    const model = createDetailState(scope({ detail: read }));
    await model.load(largeId, 0); fail = true; await model.load(largeId, 1);
    expect(model.getSnapshot()).toMatchObject({ diary: null, issue: 'server', savedRefresh: true });
    fail = false; await model.load(largeId, 1); expect(model.getSnapshot().diary?.id).toBe(largeId);
    expect(read).toHaveBeenCalledTimes(3);
  });

  it('clears the previous diary immediately and ignores a stale route response', async () => {
    const pending = deferred<ReturnType<typeof detail>>();
    const model = createDetailState(scope({ detail: vi.fn().mockResolvedValueOnce(detail('1')).mockImplementationOnce(() => pending.promise).mockResolvedValueOnce(detail('3')) }));
    await model.load('1');
    const old = model.load('2');
    expect(model.getSnapshot().diary).toBeNull();
    await model.load('3'); pending.resolve(detail('2')); await old;
    expect(model.getSnapshot().diary?.id).toBe('3');
  });
  it('maps a missing diary and retries ordinary failures', async () => {
    const model = createDetailState(scope({ detail: vi.fn().mockRejectedValueOnce(new ReadError('not-found')).mockRejectedValueOnce(new ReadError('network')).mockResolvedValueOnce(detail()) }));
    await model.load(largeId); expect(model.getSnapshot()).toEqual({ diary: null, loading: false, issue: 'not-found', savedRefresh: false });
    await model.load(largeId); expect(model.getSnapshot().issue).toBe('network');
    await model.load(largeId); expect(model.getSnapshot().diary?.id).toBe(largeId);
  });
  it('never timezone-converts a civil date but formats UTC metadata as an instant', () => {
    const formatter = vi.spyOn(Date.prototype, 'toLocaleString').mockReturnValue('2025-12-31 16:30');
    expect(civilDate(detail().date)).toBe('2026-01-01');
    expect(formatter).not.toHaveBeenCalled();
    expect(instantDate(detail().createdAt)).toBe('2025-12-31 16:30');
    expect(formatter).toHaveBeenCalledOnce(); formatter.mockRestore();
  });
});

async function application(read: (request: Request) => Promise<Response>) {
  let stored: ReturnType<typeof session> | null = session();
  const storage: NativeSessionStorage = { get: () => stored, set: next => { stored = next; }, clear: () => { stored = null; } };
  const requests: Request[] = [];
  const transport: typeof fetch = async (input, init) => {
    const request = new Request(input, init); requests.push(request);
    const path = new URL(request.url).pathname;
    if (path === '/api/auth/me') return Response.json({ ok: true, data: user(stored?.user.id ?? '1') });
    if (path === '/api/auth/native/logout') return Response.json({ ok: true });
    if (path === '/api/auth/native/login') return Response.json({ ok: true, data: session('2', 'b') });
    return read(request);
  };
  const runtime = createAuthRuntime({ baseUrl: 'http://localhost:3101', sessionStorageKey: 'test', appEnvironment: 'development' }, storage, transport);
  const lifecycle = createAuthLifecycle({ storage, runtime });
  const access = createDiaryAccess(runtime.api, lifecycle);
  await lifecycle.bootstrap();
  return { lifecycle, access, requests, stored: () => stored };
}

describe('shared native authenticated reads', () => {
  it('uses the bounded endpoint, bearer + omit, and preserves auth after network failure', async () => {
    let online = false;
    const app = await application(async () => { if (!online) throw new TypeError('offline'); return Response.json(page()); });
    const reads = app.access.getScope()!;
    await expect(reads.summary(1)).rejects.toMatchObject({ issue: 'network' });
    expect(app.lifecycle.getState().status).toBe('signed-in'); expect(app.stored()).not.toBeNull();
    online = true; expect((await reads.summary(1)).data[0].id).toBe(largeId);
    const request = app.requests.at(-1)!;
    expect(new URL(request.url).pathname).toBe('/api/diaries/summary');
    expect(new URL(request.url).searchParams.get('sortBy')).toBe('date-desc');
    expect(request.credentials).toBe('omit'); expect(request.headers.get('authorization')).toBe('Bearer access-a');
    expect(app.requests.some(r => /\/diaries\/\d/.test(r.url))).toBe(false);
  });
  it('invalidates both late success and late 401 from A without affecting B', async () => {
    for (const status of [200, 401]) {
      const pending = deferred<Response>();
      const app = await application(() => pending.promise);
      const old = app.access.getScope()!;
      const request = old.summary(1);
      // Allow the old request to reach the transport before switching accounts.
      await vi.waitFor(() => expect(app.requests.some(r => r.url.includes('/diaries/summary'))).toBe(true));
      await app.lifecycle.logout(); await app.lifecycle.login({ email: 'b@example.test', password: 'synthetic' });
      pending.resolve(Response.json(status === 200 ? page() : {}, { status }));
      await expect(request).rejects.toBeInstanceOf(StaleRead);
      expect(app.access.getScope()?.ownerId).toBe('2'); expect(app.stored()?.user.id).toBe('2');
      expect(old.isCurrent()).toBe(false);
      await expect(old.detail('1')).rejects.toBeInstanceOf(StaleRead);
    }
  });
  it('checks detail identity, rejects invalid IDs locally and handles 404', async () => {
    const app = await application(async request => new URL(request.url).pathname.endsWith('/4') ? Response.json({}, { status: 404 }) : Response.json(detail(largeId, '2')));
    const reads = app.access.getScope()!;
    await expect(reads.detail(largeId)).rejects.toMatchObject({ issue: 'invalid-response' });
    await expect(reads.detail('4')).rejects.toMatchObject({ issue: 'not-found' });
    const count = app.requests.length;
    for (const id of ['0', '-1', '1.5', '9223372036854775808']) await expect(reads.detail(id)).rejects.toMatchObject({ issue: 'not-found' });
    expect(app.requests).toHaveLength(count);
  });
  it('routes terminal 401 through the existing auth lifecycle', async () => {
    const app = await application(async () => Response.json({}, { status: 401 }));
    await expect(app.access.getScope()!.summary(1)).rejects.toBeInstanceOf(StaleRead);
    expect(app.stored()).toBeNull(); expect(app.access.getScope()).toBeNull();
    expect(app.lifecycle.getState().status).toBe('session-invalid');
  });
  it.each([404, 503])('keeps auth and reports a summary HTTP %i as a service failure', async status => {
    const app = await application(async () => Response.json({}, { status }));
    await expect(app.access.getScope()!.summary(1)).rejects.toMatchObject({ issue: 'server' });
    expect(app.lifecycle.getState().status).toBe('signed-in');
    expect(app.stored()).not.toBeNull();
  });
  it('notifies React subscribers when a scope becomes available and is invalidated', async () => {
    const app = await application(async () => Response.json(page()));
    const previous = app.access.getScope();
    const observed: (string | null)[] = [];
    const unsubscribe = app.access.subscribe(() => observed.push(app.access.getScope()?.ownerId ?? null));
    await app.lifecycle.logout();
    await app.lifecycle.login({ email: 'b@example.test', password: 'synthetic' });
    expect(observed).toEqual([null, '2']);
    expect(app.access.getScope()).not.toBe(previous);
    unsubscribe();
  });
  it('discards a late detail result after an account switch', async () => {
    const pending = deferred<Response>();
    const app = await application(() => pending.promise);
    const model = createDetailState(app.access.getScope()!);
    const loading = model.load(largeId);
    await vi.waitFor(() => expect(app.requests.some(r => r.url.includes(`/diaries/${largeId}`))).toBe(true));
    await app.lifecycle.logout(); await app.lifecycle.login({ email: 'b@example.test', password: 'synthetic' });
    pending.resolve(Response.json(detail())); await loading;
    expect(model.getSnapshot().diary).toBeNull();
  });
});
