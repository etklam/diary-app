import { createApiClient } from '@diary/api-client';
import { companyHubResponseSchema, type CompanyHubResponse } from '@diary/contracts/company-hub';
import { marketHistoricalSchema, marketQuoteSchema, type MarketRange } from '@diary/contracts/market';
import type { DiaryReadScope } from '@/diaries/access';

type Api = ReturnType<typeof createApiClient>;
export type MarketSource = 'upstream' | 'cache' | 'stale';
export type MarketRead<T> = { data: T; source: MarketSource | null; fetchedAt: string | null };

export class CompanyHubFailure extends Error {
  constructor(readonly kind: 'unavailable' | 'session' | 'stale', readonly status?: number) { super(kind); }
}

export function companyHubService(api: Api, ownerScope?: Pick<DiaryReadScope, 'isCurrent'>) {
  async function read<T>(request: () => Promise<{ response: Response; data?: unknown }>, parse: (value: unknown) => T): Promise<MarketRead<T>> {
    try {
      const result = await request();
      if (result.response.status === 401) throw new CompanyHubFailure('session', 401);
      if (!result.response.ok) throw new CompanyHubFailure('unavailable', result.response.status);
      let data: T;
      try { data = parse(result.data); } catch { throw new CompanyHubFailure('unavailable', result.response.status); }
      const rawSource = result.response.headers.get('x-market-data-source');
      const source = rawSource === 'upstream' || rawSource === 'cache' || rawSource === 'stale' ? rawSource : null;
      const rawFetchedAt = result.response.headers.get('x-market-data-fetched-at');
      const fetchedAt = rawFetchedAt && Number.isFinite(Date.parse(rawFetchedAt)) ? new Date(rawFetchedAt).toISOString() : null;
      return { data, source, fetchedAt };
    } catch (error) {
      if (error instanceof CompanyHubFailure) throw error;
      throw new CompanyHubFailure('unavailable');
    }
  }

  return {
    quote(symbol: string, signal: AbortSignal) {
      return read(() => api.GET('/api/market/quote/{symbol}', { params: { path: { symbol } }, signal }), value => marketQuoteSchema.parse(value));
    },
    history(symbol: string, range: MarketRange, signal: AbortSignal) {
      return read(() => api.GET('/api/market/historical', { params: { query: { symbol, range } }, signal }), value => marketHistoricalSchema.parse(value));
    },
    async owner(symbol: string, signal: AbortSignal): Promise<CompanyHubResponse> {
      if (!ownerScope) throw new CompanyHubFailure('session', 401);
      if (!ownerScope.isCurrent()) throw new CompanyHubFailure('stale');
      try {
        const result = await api.GET('/api/stocks/{symbol}/hub', { params: { path: { symbol } }, signal });
        if (!ownerScope.isCurrent()) throw new CompanyHubFailure('stale');
        if (result.response.status === 401) throw new CompanyHubFailure('session', 401);
        if (!result.response.ok) throw new CompanyHubFailure('unavailable', result.response.status);
        try { return companyHubResponseSchema.parse(result.data); }
        catch { throw new CompanyHubFailure('unavailable', result.response.status); }
      } catch (error) {
        if (error instanceof CompanyHubFailure) throw error;
        if (!ownerScope.isCurrent()) throw new CompanyHubFailure('stale');
        throw new CompanyHubFailure('unavailable');
      }
    },
  };
}

export type CompanyHubService = ReturnType<typeof companyHubService>;
