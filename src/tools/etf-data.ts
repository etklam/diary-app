import { NO_AUTOMATIC_SESSION_RETRY_HEADER, type createApiClient } from '@diary/api-client';
import { apiErrorResponseSchema } from '@diary/contracts';
import { etfProfileQuerySchema, etfProfileSchema } from '@diary/contracts/etf-profile';
import { etfSymbolSchema, etfWatchlistCreateSchema, etfWatchlistItemSchema, etfWatchlistListSchema } from '@diary/contracts/etf';
import type { z } from 'zod';
import type { DiaryReadScope } from '@/diaries/access';

type Api = ReturnType<typeof createApiClient>;
type RequestResult = { response: Response; data?: unknown; error?: unknown };
export type EtfWatchlistItem = z.infer<typeof etfWatchlistItemSchema>;
export type EtfWatchlistRow = z.infer<typeof etfWatchlistListSchema>[number];
export type EtfProfile = z.infer<typeof etfProfileSchema>;

export class EtfFailure extends Error {
  constructor(readonly kind: 'rejected' | 'unavailable' | 'session' | 'uncertain' | 'stale', readonly code?: string) { super(kind); }
}

function responseCode(status: number, error: unknown) {
  const parsed = apiErrorResponseSchema.safeParse(error);
  return parsed.success && parsed.data.statusCode === status ? parsed.data.data.code : undefined;
}

function classify(status: number, error: unknown): EtfFailure {
  const code = responseCode(status, error);
  if (status === 401) return new EtfFailure('session', code);
  if (status >= 400 && status < 500 && code) return new EtfFailure('rejected', code);
  return new EtfFailure(status >= 500 ? 'unavailable' : 'uncertain', code);
}

export function etfResearchService(api: Api) {
  return {
    async read(input: { symbol: string; benchmark: 'SPY' | 'QQQ'; period: '1m' | '3m' | '6m' | '1y' }, signal: AbortSignal): Promise<EtfProfile> {
      const parsedSymbol = etfSymbolSchema.safeParse(input.symbol);
      const parsedQuery = etfProfileQuerySchema.safeParse({ benchmark: input.benchmark, period: input.period });
      if (!parsedSymbol.success || !parsedQuery.success) throw new EtfFailure('rejected', 'SYS_VALIDATION_ERROR');
      const result = await api.GET('/api/etf/{symbol}/profile', { params: { path: { symbol: parsedSymbol.data }, query: parsedQuery.data }, signal });
      if (!result.response.ok) throw classify(result.response.status, result.error);
      const parsed = etfProfileSchema.safeParse(result.data);
      if (!parsed.success || parsed.data.symbol !== parsedSymbol.data || parsed.data.benchmark !== parsedQuery.data.benchmark || parsed.data.period !== parsedQuery.data.period) {
        throw new EtfFailure('unavailable', 'SYS_EXTERNAL_SERVICE_ERROR');
      }
      return parsed.data;
    },
  };
}

export function etfWatchlistService(api: Api, scope: Pick<DiaryReadScope, 'isCurrent'>) {
  const check = () => { if (!scope.isCurrent()) throw new EtfFailure('stale'); };
  const noRetry = { [NO_AUTOMATIC_SESSION_RETRY_HEADER]: '1' };
  async function run<T>(request: () => Promise<RequestResult>, parse: (data: unknown) => T): Promise<T> {
    check();
    try {
      const result = await request();
      check();
      if (!result.response.ok) throw classify(result.response.status, result.error);
      try { return parse(result.data); } catch { throw new EtfFailure('uncertain', 'SYS_EXTERNAL_SERVICE_ERROR'); }
    } catch (error) {
      check();
      if (error instanceof EtfFailure) throw error;
      throw new EtfFailure('uncertain');
    }
  }
  return {
    read(signal: AbortSignal): Promise<EtfWatchlistRow[]> {
      return run(() => api.GET('/api/etf/watchlist', { signal }), data => etfWatchlistListSchema.parse(data));
    },
    add(rawSymbol: string, signal: AbortSignal): Promise<EtfWatchlistItem> {
      const body = etfWatchlistCreateSchema.parse({ symbol: rawSymbol });
      return run(() => api.POST('/api/etf/watchlist', { body, signal, headers: noRetry }), data => {
        const item = etfWatchlistItemSchema.parse(data);
        if (item.symbol !== body.symbol) throw new Error('ETF Watchlist response did not match the request.');
        return item;
      });
    },
    remove(id: string, signal: AbortSignal): Promise<void> {
      return run(async () => {
        const result = await api.DELETE('/api/etf/watchlist/{id}', { params: { path: { id } }, signal, headers: noRetry });
        return { ...result, data: result.response.ok ? { success: true } : result.data };
      }, value => { if (value === null || typeof value !== 'object' || (value as { success?: unknown }).success !== true) throw new Error('Unexpected ETF Watchlist removal response.'); });
    },
  };
}

export type EtfResearchService = ReturnType<typeof etfResearchService>;
export type EtfWatchlistService = ReturnType<typeof etfWatchlistService>;
