import type { createApiClient } from '@diary/api-client';
import { diaryResponseSchema } from '@diary/contracts';
import { diarySummaryListResponseSchema } from '@diary/contracts/diary-summary';

import type { AuthLifecycle } from '../auth/lifecycle';

export type ReadIssue = 'network' | 'server' | 'not-found' | 'session' | 'invalid-response';
export class ReadError extends Error {
  constructor(public readonly issue: ReadIssue) { super(issue); }
}
export class StaleRead extends Error {}
export type SummaryPage = ReturnType<typeof diarySummaryListResponseSchema.parse>;
export type DiaryReadScope = ReturnType<typeof createDiaryAccess>['getScope'] extends () => infer T ? NonNullable<T> : never;

// One capability per authenticated owner epoch. Logout invalidates it synchronously,
// even before React renders; a later login by the same owner gets a new capability.
export function createDiaryAccess(api: ReturnType<typeof createApiClient>, lifecycle: AuthLifecycle) {
  let owner: string | null = null;
  let generation = 0;
  const listeners = new Set<() => void>();
  let mutation = 0;
  const mutationListeners = new Set<() => void>();
  let scope: {
    ownerId: string;
    isCurrent(): boolean;
    summary(page: number): Promise<SummaryPage>;
    detail(id: string): Promise<ReturnType<typeof diaryResponseSchema.parse>>;
  } | null = null;

  const update = () => {
    const state = lifecycle.getState();
    const next = state.status === 'signed-in' || state.status === 'recoverable-error' ? state.user?.id ?? null : null;
    if (next === owner) return;
    owner = next;
    const epoch = ++generation;
    if (!next) { scope = null; listeners.forEach(listener => listener()); return; }
    const isCurrent = () => epoch === generation && owner === next;
    const check = () => { if (!isCurrent()) throw new StaleRead(); };
    const read = async <T>(request: () => Promise<{ response: Response; data?: unknown }>, parse: (value: unknown) => T, detail = false): Promise<T> => {
      check();
      try {
        const result = await request();
        check();
        if (result.response.status === 401) {
          await lifecycle.retryVerification();
          throw new ReadError('session');
        }
        if (result.response.status === 404 && detail) throw new ReadError('not-found');
        if (!result.response.ok) throw new ReadError('server');
        try { return parse(result.data); } catch { throw new ReadError('invalid-response'); }
      } catch (error) {
        check();
        if (error instanceof ReadError) throw error;
        throw new ReadError('network');
      }
    };
    scope = {
      ownerId: next,
      isCurrent,
      summary: page => read(
        () => api.GET('/api/diaries/summary', { params: { query: { page, limit: 20, sortBy: 'date-desc' } } }),
        value => diarySummaryListResponseSchema.parse(value),
      ),
      detail: id => {
        // Validate the serialized int64 without rounding it through Number.
        if (!/^[1-9]\d{0,18}$/.test(id) || BigInt(id) > 9223372036854775807n) return Promise.reject(new ReadError('not-found'));
        return read(() => api.GET('/api/diaries/{id}', { params: { path: { id } } }), value => {
          const diary = diaryResponseSchema.parse(value);
          if (diary.id !== id || diary.userId !== next) throw new Error('Unexpected diary identity');
          return diary;
        }, true);
      },
    };
    listeners.forEach(listener => listener());
  };
  const unsubscribe = lifecycle.subscribe(update);
  update();
  return {
    getMutation: () => mutation,
    subscribeMutations: (listener: () => void) => { mutationListeners.add(listener); return () => { mutationListeners.delete(listener); }; },
    changed(expected: NonNullable<typeof scope>) {
      if (scope !== expected || !expected.isCurrent()) return;
      ++mutation;
      mutationListeners.forEach(listener => listener());
    },
    getScope: () => scope,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    dispose: () => { unsubscribe(); ++generation; scope = null; listeners.forEach(listener => listener()); },
  };
}
