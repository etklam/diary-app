import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApiClient } from '@diary/api-client';
import { createAuthLifecycle } from '../../src/auth/lifecycle';
import { createDiaryAccess, type DiaryReadScope, type ReviewGroups, type SummaryPage } from '../../src/diaries/access';
import { createCalendarState, createReviewState } from '../../src/diaries/discovery-state';
import { createTimelineState } from '../../src/diaries/state';
import { normalizeQuery } from '../../src/diaries/query';
import { firstWeekday, monthRange, shiftMonth } from '../../src/diaries/dates';
import { deferred, session, user } from './fixtures';

const id = '9223372036854775806';
const empty = (): ReviewGroups => ({ counts: { overdue: 0, today: 0, upcoming: 0, unscheduled: 0, completed: 0 }, overdue: [], today: [], upcoming: [], unscheduled: [], completed: [] });
const summary = (title = 'Synthetic', page = 1): SummaryPage => ({ data: [{ id, title, date: '2024-02-29', excerpt: '', tags: [], stockSymbols: [], createdVia: 'WEB', reviewStatus: 'none', reviewDueAt: null, reviewOutcome: null, transactionCount: 0, alertCount: 0 }], pagination: { page, limit: 20, total: 40, totalPages: 2 } });
function scope(overrides: Partial<DiaryReadScope> = {}): DiaryReadScope {
  return { ownerId: '1', isCurrent: () => true, summary: async () => summary(),
    detail: vi.fn(), activity: async (dateFrom, dateTo) => ({ dateFrom, dateTo, data: [] }), reviews: async () => empty(), ...overrides };
}
afterEach(() => vi.useRealTimers());
describe('discovery queries and Timeline controller', () => {
  it('normalizes blank fields and symbols through the shared contract; rejects invalid ranges and unsupported filters', () => {
    expect(normalizeQuery({ search: '  ', symbol: ' syn ', dateFrom: '' })).toEqual({ symbol: 'SYN', sortBy: 'date-desc' });
    expect(() => normalizeQuery({ dateFrom: '2023-02-29' })).toThrow();
    expect(() => normalizeQuery({ dateFrom: '2024-03-01', dateTo: '2024-02-29' })).toThrow();
    expect(() => normalizeQuery({ reviewStatus: 'completed' })).toThrow();
    expect(() => normalizeQuery({ tag: 'unsupported' } as never)).toThrow();
  });
  it('debounces search, immediately invalidates old results, and clear/reset/filter edits cancel the timer', async () => {
    vi.useFakeTimers(); const read = vi.fn(async () => summary());
    const model = createTimelineState(scope({ summary: read })); await model.load();
    model.setQuery({ search: 'a' }, true); model.setQuery({ search: 'ab' }, true);
    expect(model.getSnapshot().rows).toEqual([]);
    await vi.advanceTimersByTimeAsync(299); expect(read).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1); expect(read).toHaveBeenCalledTimes(2);
    expect(read.mock.calls.at(-1)).toEqual([1, { search: 'ab', sortBy: 'date-desc' }, expect.any(AbortSignal)]);
    model.setQuery({ search: 'late' }, true); model.setQuery({ search: '', symbol: 'syn' });
    await vi.advanceTimersByTimeAsync(300); expect(read).toHaveBeenCalledTimes(3);
    model.setQuery({}); await vi.advanceTimersByTimeAsync(1);
    expect(read.mock.calls.at(-1)).toEqual([1, { sortBy: 'date-desc' }, expect.any(AbortSignal)]);
    model.setQuery({ dateFrom: 'invalid' }); expect(model.getSnapshot()).toMatchObject({ invalid: true, rows: [], total: null });
    await model.refresh(); expect(read).toHaveBeenCalledTimes(4); model.cancel();
  });
  it('old queries and refresh/page races cannot merge into the current query; duplicate pages are suppressed', async () => {
    const old = deferred<SummaryPage>(); const next = deferred<SummaryPage>();
    const read = vi.fn().mockImplementationOnce(() => old.promise).mockResolvedValueOnce(summary('new')).mockImplementationOnce(() => next.promise).mockResolvedValueOnce(summary('refreshed'));
    const model = createTimelineState(scope({ summary: read })); const initial = model.load();
    model.setQuery({ search: 'new' }); await vi.waitFor(() => expect(model.getSnapshot().rows[0]?.title).toBe('new'));
    old.resolve(summary('old')); await initial;
    const more = model.more(); await model.more(); expect(read).toHaveBeenCalledTimes(3);
    await model.refresh(); next.resolve(summary('obsolete page', 2)); await more;
    expect(model.getSnapshot().rows.map(row => row.title)).toEqual(['refreshed']);
    expect(model.getSnapshot().rows[0].id).toBe(id);
  });
});
describe('monthly civil Calendar', () => {
  it('handles leap years, century rules, weekdays and month/year boundaries without timezone round trips', () => {
    expect(monthRange('2024-02').dateTo).toBe('2024-02-29'); expect(monthRange('2100-02').days).toBe(28);
    expect(monthRange('2000-02').days).toBe(29); expect(firstWeekday('2024-02')).toBe(4);
    expect(shiftMonth('2024-12', 1)).toBe('2025-01'); expect(shiftMonth('2024-01', -1)).toBe('2023-12');
  });
  it('distinguishes unknown/failed activity from a confirmed empty month and preserves selected day on refresh', async () => {
    const read = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue({ data: [], dateFrom: '2024-02-01', dateTo: '2024-02-29' });
    const model = createCalendarState(scope({ activity: read }), '2024-02-29'); await model.load();
    expect(model.getSnapshot()).toMatchObject({ activity: null, issue: 'network', selected: '2024-02-29' });
    await model.load(); expect(model.getSnapshot().activity?.data).toEqual([]); expect(model.getSnapshot().selected).toBe('2024-02-29');
  });
  it('ignores an old month and a previous owner', async () => {
    const old = deferred<Awaited<ReturnType<DiaryReadScope['activity']>>>(); let current = true;
    const read = vi.fn().mockImplementationOnce(() => old.promise).mockResolvedValue({ data: [], dateFrom: '2024-03-01', dateTo: '2024-03-31' });
    const model = createCalendarState(scope({ activity: read, isCurrent: () => current }), '2024-02-29'); const first = model.load();
    model.month('2024-03'); await vi.waitFor(() => expect(model.getSnapshot().activity?.dateFrom).toBe('2024-03-01'));
    current = false; old.resolve({ data: [], dateFrom: '2024-02-01', dateTo: '2024-02-29' }); await first;
    expect(model.getSnapshot().activity?.dateFrom).toBe('2024-03-01');
  });
});
describe('server Review groups', () => {
  const item = (value: string) => ({ targetType: 'diary' as const, id: value, title: 'Synthetic', date: '2024-02-29', thesis: null, risk: null, reviewDueAt: null, reviewStatus: 'pending' as const, reviewedAt: null, reviewOutcome: null, stockSymbols: ['SYN'] });
  it('retains server counts across shared page slices, deduplicates string IDs, and does not infer empty groups', async () => {
    const first = empty(); first.counts.overdue = 21; first.counts.today = 1; first.overdue = [item(id)]; first.today = [item('2')];
    const second = empty(); second.counts = first.counts; second.overdue = [item(id), item('3')];
    const read = vi.fn().mockResolvedValueOnce(first).mockResolvedValueOnce(second);
    const model = createReviewState(scope({ reviews: read })); await model.load(); await model.more();
    expect(read.mock.calls.map(args => args[0])).toEqual([1, 2]);
    expect(model.getSnapshot().groups?.counts.overdue).toBe(21);
    expect(model.getSnapshot().groups?.today.map(row => row.id)).toEqual(['2']);
    expect(model.getSnapshot().groups?.overdue.map(row => row.id)).toEqual([id, '3']); expect(model.getSnapshot().more).toBe(false);
  });
  it('refresh wins over load-more, duplicate load-more is prevented, and late owner responses are ignored', async () => {
    const first = empty(); first.counts.upcoming = 21;
    const pending = deferred<ReviewGroups>(); let current = true;
    const read = vi.fn().mockResolvedValueOnce(first).mockImplementationOnce(() => pending.promise).mockResolvedValueOnce(empty());
    const model = createReviewState(scope({ reviews: read, isCurrent: () => current })); await model.load();
    const more = model.more(); await model.more(); await model.refresh();
    current = false; pending.resolve(first); await more;
    expect(model.getSnapshot().groups?.counts.upcoming).toBe(0); expect(read).toHaveBeenCalledTimes(3);
  });
  it('keeps page failures separate and moves an item only to its newly returned server group', async () => {
    const first = empty(); first.counts.overdue = 21; first.overdue = [item(id)];
    const next = empty(); next.counts.completed = 1; next.completed = [{ ...item(id), reviewStatus: 'reviewed' }];
    const read = vi.fn().mockResolvedValueOnce(first).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(next);
    const model = createReviewState(scope({ reviews: read })); await model.load(); await model.more();
    expect(model.getSnapshot()).toMatchObject({ page: 1, failed: 'more', issue: 'network' });
    expect(model.getSnapshot().groups?.overdue[0].id).toBe(id);
    await model.retry(); expect(model.getSnapshot().groups?.overdue).toEqual([]);
    expect(model.getSnapshot().groups?.completed[0].id).toBe(id);
  });
});

describe('actual owner-bound discovery access', () => {
  async function application(transport: typeof fetch) {
    let stored = session();
    const lifecycle = createAuthLifecycle({ storage: { get: () => stored, set: () => {}, clear: () => {} }, runtime: {
      login: async () => { stored = session('2', 'b'); return stored; }, logout: async () => {}, verifyCurrentUser: async () => ({ ok: true, user: user(stored.user.id) }),
    } });
    const access = createDiaryAccess(createApiClient({ baseUrl: 'http://localhost', fetch: transport }), lifecycle); await lifecycle.bootstrap();
    return { access, lifecycle };
  }
  it('uses bounded summary/activity and target=diary review routes; rejects incomplete activity', async () => {
    const requests: URL[] = [];
    const app = await application(async input => {
      const url = new URL((input as Request).url); requests.push(url);
      return Response.json(url.pathname.endsWith('activity') ? { dateFrom: '2024-02-01', dateTo: '2024-02-28', data: [] } : url.pathname.endsWith('reviews') ? empty() : summary());
    });
    const reads = app.access.getScope()!;
    await reads.summary(1, normalizeQuery({ search: 'needle', symbol: 'syn' })); await reads.reviews(2);
    await expect(reads.activity('2024-02-01', '2024-02-29')).rejects.toMatchObject({ issue: 'invalid-response' });
    expect(requests[0].searchParams.get('search')).toBe('needle'); expect(requests[0].pathname).toBe('/api/diaries/summary');
    expect(requests[1].searchParams.get('target')).toBe('diary'); expect(requests[1].searchParams.get('limit')).toBe('20');
  });
  it.each(['search', 'calendar', 'review'])('owner switch invalidates pending %s reads synchronously', async surface => {
    const pending = deferred<Response>(); const app = await application(() => pending.promise); const old = app.access.getScope()!;
    const request = surface === 'search' ? old.summary(1) : surface === 'calendar' ? old.activity('2024-02-01', '2024-02-29') : old.reviews(1);
    await app.lifecycle.logout(); await app.lifecycle.login({ email: 'b@example.test', password: 'synthetic' });
    pending.resolve(Response.json({})); await expect(request).rejects.toThrow(); expect(old.isCurrent()).toBe(false);
    expect(app.access.getScope()?.ownerId).toBe('2');
    const change = vi.fn(); app.access.subscribeMutations(change); app.access.changed(old); expect(change).not.toHaveBeenCalled();
    app.access.changed(app.access.getScope()!); expect(change).toHaveBeenCalledOnce();
  });
  it('the shared confirmed-save signal refreshes all mounted read controllers without losing Calendar selection', async () => {
    let reads = 0;
    const app = await application(async input => {
      reads++;
      const path = new URL((input as Request).url).pathname;
      return Response.json(path.endsWith('activity') ? { data: [], dateFrom: '2024-02-01', dateTo: '2024-02-29' } : path.endsWith('reviews') ? empty() : summary());
    });
    const current = app.access.getScope()!;
    const timeline = createTimelineState(current), calendar = createCalendarState(current, '2024-02-29'), review = createReviewState(current);
    await Promise.all([timeline.load(), calendar.load(), review.load()]);
    const stop = app.access.subscribeMutations(() => { void timeline.refresh(); void calendar.load(); void review.refresh(); });
    app.access.changed(current);
    await vi.waitFor(() => expect(reads).toBe(6));
    expect(calendar.getSnapshot().selected).toBe('2024-02-29');
    stop(); timeline.cancel(); calendar.cancel(); review.cancel();
  });
});
