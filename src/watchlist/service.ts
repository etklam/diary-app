import { NO_AUTOMATIC_SESSION_RETRY_HEADER, type createApiClient } from '@diary/api-client';
import { apiErrorResponseSchema, deleteDiaryResponseSchema } from '@diary/contracts';
import {
  stockWatchlistCreateRequestSchema,
  stockWatchlistMutationResponseSchema,
  stockWatchlistResponseSchema,
  stockWatchlistUpdateRequestSchema,
} from '@diary/contracts/watchlist';
import type { DiaryReadScope } from '@/diaries/access';

type Api = ReturnType<typeof createApiClient>;
type Result = { response: Response; data?: unknown; error?: unknown };

export class WatchlistFailure extends Error {
  constructor(readonly kind: 'rejected' | 'uncertain' | 'session' | 'stale', readonly code?: string) {
    super(kind);
  }
}

export function stockWatchlistService(api: Api, scope: Pick<DiaryReadScope, 'isCurrent'>) {
  const check = () => { if (!scope.isCurrent()) throw new WatchlistFailure('stale'); };
  const run = async <T>(request: () => Promise<Result>, parse: (data: unknown) => T) => {
    check();
    try {
      const result = await request();
      check();
      if (!result.response.ok) {
        const failure = apiErrorResponseSchema.safeParse(result.error);
        const code = failure.success && failure.data.statusCode === result.response.status ? failure.data.data.code : undefined;
        if (result.response.status === 401) throw new WatchlistFailure('session', code);
        if (result.response.status >= 400 && result.response.status < 500 && code) throw new WatchlistFailure('rejected', code);
        throw new WatchlistFailure('uncertain', code);
      }
      try { return parse(result.data); } catch { throw new WatchlistFailure('uncertain'); }
    } catch (error) {
      check();
      if (error instanceof WatchlistFailure) throw error;
      throw new WatchlistFailure('uncertain');
    }
  };
  const noRetry = { [NO_AUTOMATIC_SESSION_RETRY_HEADER]: '1' };

  return {
    read(signal?: AbortSignal) {
      return run(() => api.GET('/api/stocks/watchlist', { signal }), data => stockWatchlistResponseSchema.parse(data));
    },
    add(input: unknown) {
      const body = stockWatchlistCreateRequestSchema.parse(input);
      return run(() => api.POST('/api/stocks/watchlist', { body, headers: noRetry }), data => {
        const result = stockWatchlistMutationResponseSchema.parse(data);
        if (result.symbol !== body.symbol || result.status !== 'WATCHING') throw new Error('Unexpected watchlist result');
        return result;
      });
    },
    update(id: string, input: unknown) {
      const body = stockWatchlistUpdateRequestSchema.parse(input);
      return run(() => api.PATCH('/api/stocks/watchlist/{id}', { params: { path: { id } }, body, headers: noRetry }), data => {
        const result = stockWatchlistMutationResponseSchema.parse(data);
        if (result.id !== id) throw new Error('Unexpected watchlist identity');
        return result;
      });
    },
    archive(id: string) {
      return run(() => api.DELETE('/api/stocks/watchlist/{id}', { params: { path: { id } }, headers: noRetry }), data => deleteDiaryResponseSchema.parse(data));
    },
  };
}

export type StockWatchlistService = ReturnType<typeof stockWatchlistService>;
