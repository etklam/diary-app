import { ReadError, reviewBuckets, type Activity, type DiaryReadScope, type ReadIssue, type ReviewGroups } from './access';
import { monthRange } from './dates';

export function createCalendarState(scope: DiaryReadScope, today: string) {
  let state: { month: string; selected: string; activity: Activity | null; loading: boolean; issue: ReadIssue | null } = {
    month: today.slice(0, 7), selected: today, activity: null, loading: true, issue: null,
  };
  let generation = 0;
  let abort: AbortController | undefined;
  const listeners = new Set<() => void>();
  const emit = (patch: Partial<typeof state>) => { state = { ...state, ...patch }; listeners.forEach(listener => listener()); };
  const load = async () => {
    if (!scope.isCurrent()) return;
    const expected = ++generation; abort?.abort(); abort = new AbortController();
    // Unknown activity must never render as confirmed empty, including during refresh.
    emit({ activity: null, loading: true, issue: null });
    try {
      const range = monthRange(state.month);
      const activity = await scope.activity(range.dateFrom, range.dateTo, abort.signal);
      if (expected === generation && scope.isCurrent()) emit({ activity, loading: false });
    } catch (error) {
      if (expected === generation && scope.isCurrent()) emit({ loading: false, issue: error instanceof ReadError ? error.issue : 'network' });
    }
  };
  return {
    getSnapshot: () => state,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    load,
    select: (selected: string) => { if (selected.startsWith(`${state.month}-`)) emit({ selected }); },
    month: (month: string, selected = `${month}-01`) => { monthRange(month); emit({ month, selected }); void load(); },
    cancel: () => { ++generation; abort?.abort(); },
  };
}

export function createReviewState(scope: DiaryReadScope) {
  let state: { groups: ReviewGroups | null; page: number; more: boolean; phase: 'initial' | 'refresh' | 'more' | 'idle'; issue: ReadIssue | null; failed: 'initial' | 'refresh' | 'more' } = {
    groups: null, page: 0, more: false, phase: 'initial', issue: null, failed: 'initial',
  };
  let generation = 0;
  let abort: AbortController | undefined;
  const listeners = new Set<() => void>();
  const emit = (patch: Partial<typeof state>) => { state = { ...state, ...patch }; listeners.forEach(listener => listener()); };
  const load = async (phase: 'initial' | 'refresh' | 'more') => {
    if (!scope.isCurrent() || (phase === 'more' && (state.phase !== 'idle' || !state.more))) return;
    const expected = ++generation; abort?.abort(); abort = new AbortController();
    const page = phase === 'more' ? state.page + 1 : 1;
    emit({ phase, issue: null, ...(phase === 'initial' ? { groups: null, page: 0, more: false } : {}) });
    try {
      const result = await scope.reviews(page, abort.signal);
      if (expected !== generation || !scope.isCurrent()) return;
      const groups = { ...result };
      const incomingIds = new Set(reviewBuckets.flatMap(bucket => result[bucket].map(item => item.id)));
      // The installed API applies one shared page cursor to every bucket's ranked slice.
      // A bucket with no rows on this page can still have a nonzero authoritative count.
      for (const bucket of reviewBuckets) {
        const rows = new Map((phase === 'more' ? state.groups?.[bucket] ?? [] : []).filter(item => !incomingIds.has(item.id)).map(item => [item.id, item]));
        result[bucket].forEach(item => rows.set(item.id, item));
        groups[bucket] = [...rows.values()];
      }
      emit({ groups, page, phase: 'idle', more: reviewBuckets.some(bucket => page * 20 < result.counts[bucket]) });
    } catch (error) {
      if (expected === generation && scope.isCurrent()) emit({ phase: 'idle', failed: phase, issue: error instanceof ReadError ? error.issue : 'network' });
    }
  };
  return {
    getSnapshot: () => state,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    load: () => load('initial'), refresh: () => load('refresh'), more: () => load('more'), retry: () => load(state.failed),
    cancel: () => { ++generation; abort?.abort(); },
  };
}
