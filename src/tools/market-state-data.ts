import { type createApiClient } from '@diary/api-client';
import { apiErrorResponseSchema } from '@diary/contracts';
import { marketStateHistoryResponseSchema, marketStateSnapshotSchema, type MarketStateHistoryItem, type MarketStateSnapshot } from '@diary/contracts/market-state';

type Api = ReturnType<typeof createApiClient>;
type Result = { response: Response; data?: unknown; error?: unknown };
export type MarketStateFailureKind = 'missing' | 'rejected' | 'unavailable';

export class MarketStateFailure extends Error {
  constructor(readonly kind: MarketStateFailureKind, readonly code?: string) { super(kind); }
}

function errorCode(status: number, error: unknown) {
  const parsed = apiErrorResponseSchema.safeParse(error);
  return parsed.success && parsed.data.statusCode === status ? parsed.data.data.code : undefined;
}

function failure(status: number, error: unknown) {
  const code = errorCode(status, error);
  if (status === 404 && code === 'SYS_NOT_FOUND') return new MarketStateFailure('missing', code);
  if (status >= 400 && status < 500) return new MarketStateFailure('rejected', code);
  return new MarketStateFailure('unavailable', code);
}

export function marketStateService(api: Api) {
  async function snapshot(signal: AbortSignal): Promise<MarketStateSnapshot> {
    const result = await api.GET('/api/market/state/snapshot', { signal }) as Result;
    if (!result.response.ok) throw failure(result.response.status, result.error);
    const parsed = marketStateSnapshotSchema.safeParse(result.data);
    if (!parsed.success) throw new MarketStateFailure('unavailable', 'SYS_EXTERNAL_SERVICE_ERROR');
    return parsed.data;
  }

  async function history(signal: AbortSignal): Promise<MarketStateHistoryItem[]> {
    const result = await api.GET('/api/market/state/history', { params: { query: { days: 120 } }, signal }) as Result;
    if (!result.response.ok) throw failure(result.response.status, result.error);
    const parsed = marketStateHistoryResponseSchema.safeParse(result.data);
    if (!parsed.success) throw new MarketStateFailure('unavailable', 'SYS_EXTERNAL_SERVICE_ERROR');
    return parsed.data;
  }

  return { snapshot, history };
}

export type MarketStateService = ReturnType<typeof marketStateService>;
