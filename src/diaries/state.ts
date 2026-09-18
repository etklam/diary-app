import type { DiaryResponse } from '@diary/contracts';
import type { DiarySummary } from '@diary/contracts/diary-summary';
import { ReadError, type DiaryReadScope, type ReadIssue } from './access';

type Phase = 'initial' | 'refresh' | 'more' | 'idle';
export type TimelineState = { rows: DiarySummary[]; page: number; hasMore: boolean; phase: Phase; issue: ReadIssue | null; failed: Exclude<Phase, 'idle'> | null };

export function createTimelineState(scope: DiaryReadScope) {
  let state: TimelineState = { rows: [], page: 0, hasMore: false, phase: 'initial', issue: null, failed: null };
  let version = 0;
  const listeners = new Set<() => void>();
  const emit = (next: TimelineState) => { state = next; listeners.forEach(listener => listener()); };
  const load = async (phase: Exclude<Phase, 'idle'>) => {
    if (!scope.isCurrent()) return;
    if (phase === 'more' && (state.phase !== 'idle' || !state.hasMore)) return;
    const expected = ++version;
    const page = phase === 'more' ? state.page + 1 : 1;
    emit({ ...state, phase, issue: null, failed: null });
    try {
      const result = await scope.summary(page);
      if (expected !== version || !scope.isCurrent()) return;
      const rows = new Map((phase === 'more' ? state.rows : []).map(row => [row.id, row]));
      result.data.forEach(row => rows.set(row.id, row));
      emit({ rows: [...rows.values()], page: result.pagination.page,
        hasMore: result.data.length > 0 && result.pagination.page < result.pagination.totalPages,
        phase: 'idle', issue: null, failed: null });
    } catch (error) {
      if (expected !== version || !scope.isCurrent()) return;
      emit({ ...state, phase: 'idle', issue: error instanceof ReadError ? error.issue : 'network', failed: phase });
    }
  };
  return {
    getSnapshot: () => state,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    load: () => load('initial'), refresh: () => load('refresh'), more: () => load('more'),
    retry: () => load(state.failed ?? 'initial'),
    cancel: () => { ++version; },
  };
}

export type DetailState = { diary: DiaryResponse | null; loading: boolean; issue: ReadIssue | null };
export function createDetailState(scope: DiaryReadScope) {
  let state: DetailState = { diary: null, loading: true, issue: null };
  let version = 0;
  const listeners = new Set<() => void>();
  const emit = (next: DetailState) => { state = next; listeners.forEach(listener => listener()); };
  return {
    getSnapshot: () => state,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    cancel: () => { ++version; },
    async load(id: string) {
      const expected = ++version;
      emit({ diary: null, loading: true, issue: null });
      try {
        const diary = await scope.detail(id);
        if (expected === version && scope.isCurrent()) emit({ diary, loading: false, issue: null });
      } catch (error) {
        if (expected === version && scope.isCurrent()) emit({ diary: null, loading: false, issue: error instanceof ReadError ? error.issue : 'network' });
      }
    },
  };
}
