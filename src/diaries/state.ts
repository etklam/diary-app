import type { DiaryResponse } from '@diary/contracts';
import type { DiarySummary } from '@diary/contracts/diary-summary';
import { ReadError, type DiaryReadScope, type ReadIssue } from './access';
import { normalizeQuery, type DiscoveryInput } from './query';

type Phase = 'initial' | 'refresh' | 'more' | 'idle';
export type TimelineState = { rows: DiarySummary[]; page: number; total: number | null; totalPages: number | null; invalid: boolean; hasMore: boolean; phase: Phase; issue: ReadIssue | null; failed: Exclude<Phase, 'idle'> | null };

export function createTimelineState(scope: DiaryReadScope, options: { mode?: 'timeline' | 'library' } = {}) {
  const mode = options.mode ?? 'timeline';
  const empty: TimelineState = { rows: [], page: 0, total: null, totalPages: null, invalid: false, hasMore: false, phase: 'initial', issue: null, failed: null };
  let state = empty;
  let query = normalizeQuery({});
  let timer: ReturnType<typeof setTimeout> | undefined;
  let abort: AbortController | undefined;
  let failedPage = 1;
  let version = 0;
  const listeners = new Set<() => void>();
  const emit = (next: TimelineState) => { state = next; listeners.forEach(listener => listener()); };
  const load = async (phase: Exclude<Phase, 'idle'>, targetPage = 1) => {
    if (!scope.isCurrent() || state.invalid) return;
    if (phase === 'more' && (state.phase !== 'idle' || !state.hasMore)) return;
    const expected = ++version;
    abort?.abort(); const controller = new AbortController(); abort = controller;
    const page = phase === 'more' ? state.page + 1 : targetPage;
    emit({ ...state, phase, issue: null, failed: null });
    try {
      let result = await scope.summary(page, query, controller.signal);
      if (expected !== version || !scope.isCurrent()) return;
      if (mode === 'library' && phase === 'refresh' && result.pagination.totalPages > 0 && page > result.pagination.totalPages) {
        result = await scope.summary(result.pagination.totalPages, query, controller.signal);
        if (expected !== version || !scope.isCurrent()) return;
      }
      const rows = new Map((phase === 'more' ? state.rows : []).map(row => [row.id, row]));
      result.data.forEach(row => rows.set(row.id, row));
      emit({ rows: [...rows.values()], page: mode === 'library' && result.pagination.totalPages === 0 ? 1 : result.pagination.page,
        total: result.pagination.total, totalPages: result.pagination.totalPages, invalid: false,
        hasMore: result.data.length > 0 && result.pagination.page < result.pagination.totalPages,
        phase: 'idle', issue: null, failed: null });
    } catch (error) {
      if (expected !== version || !scope.isCurrent()) return;
      failedPage = page;
      emit({ ...state, phase: 'idle', issue: error instanceof ReadError ? error.issue : 'network', failed: phase });
    }
  };
  const refresh = async () => {
    if (!scope.isCurrent() || state.invalid) return;
    const requestedPages = mode === 'library' ? [Math.max(1, state.page)] : Array.from({ length: Math.max(1, state.page) }, (_, index) => index + 1);
    const expected = ++version;
    abort?.abort(); const controller = new AbortController(); abort = controller;
    failedPage = requestedPages[0]!;
    emit({ ...state, phase: 'refresh', issue: null, failed: null });
    try {
      const results = await Promise.all(requestedPages.map(page => scope.summary(page, query, controller.signal)));
      if (expected !== version || !scope.isCurrent()) return;
      const first = results[0]!;
      let canonicalPages = results;
      if (mode === 'library' && first.pagination.totalPages > 0 && requestedPages[0]! > first.pagination.totalPages) {
        canonicalPages = [await scope.summary(first.pagination.totalPages, query, controller.signal)];
        if (expected !== version || !scope.isCurrent()) return;
      }
      const totalPages = canonicalPages[0]!.pagination.totalPages;
      const usable = canonicalPages.filter(result => result.pagination.page <= Math.max(1, totalPages));
      const rows = new Map<string, DiarySummary>();
      usable.forEach(result => result.data.forEach(row => rows.set(row.id, row)));
      const page = totalPages === 0 ? 1 : Math.min(usable.at(-1)?.pagination.page ?? 1, totalPages);
      emit({ rows: [...rows.values()], page, total: usable[0]?.pagination.total ?? first.pagination.total, totalPages,
        invalid: false, hasMore: rows.size > 0 && page < totalPages, phase: 'idle', issue: null, failed: null });
    } catch (error) {
      if (expected === version && scope.isCurrent()) emit({ ...state, phase: 'idle', issue: error instanceof ReadError ? error.issue : 'network', failed: 'refresh' });
    }
  };
  return {
    getSnapshot: () => state,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    load: () => load('initial'), refresh, more: () => load('more'),
    goToPage(page: number) {
      if (!Number.isInteger(page) || page < 1 || state.phase !== 'idle' || state.invalid
        || (state.totalPages !== null && (state.totalPages === 0 || page > state.totalPages))) return;
      void load('refresh', page);
    },
    retry: () => state.failed === 'refresh'
      ? mode === 'library' ? load('refresh', failedPage) : refresh()
      : load(state.failed ?? 'initial', failedPage),
    setQuery(input: DiscoveryInput, debounce = false) {
      clearTimeout(timer); ++version; abort?.abort();
      try { query = normalizeQuery(input); }
      catch { emit({ ...empty, phase: 'idle', invalid: true }); return; }
      emit({ ...empty });
      if (debounce) timer = setTimeout(() => { void load('initial'); }, 300);
      else void load('initial');
    },
    cancel: () => { ++version; clearTimeout(timer); abort?.abort(); },
  };
}

export type DetailState = { diary: DiaryResponse | null; loading: boolean; issue: ReadIssue | null; savedRefresh: boolean };
export function createDetailState(scope: DiaryReadScope) {
  let state: DetailState = { diary: null, loading: true, issue: null, savedRefresh: false };
  let initialMutation: number | null = null;
  let version = 0;
  const listeners = new Set<() => void>();
  const emit = (next: DetailState) => { state = next; listeners.forEach(listener => listener()); };
  return {
    getSnapshot: () => state,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    cancel: () => { ++version; },
    async load(id: string, mutation = 0) {
      initialMutation ??= mutation;
      const savedRefresh = mutation > initialMutation;
      const expected = ++version;
      emit({ diary: null, loading: true, issue: null, savedRefresh });
      try {
        const diary = await scope.detail(id);
        if (expected === version && scope.isCurrent()) emit({ diary, loading: false, issue: null, savedRefresh });
      } catch (error) {
        if (expected === version && scope.isCurrent()) emit({ diary: null, loading: false, issue: error instanceof ReadError ? error.issue : 'network', savedRefresh });
      }
    },
  };
}
