import { apiErrorResponseSchema, createDiaryRequestSchema, diaryResponseSchema, type CreateDiaryRequest, type DiaryResponse, type UpdateDiaryRequest } from '@diary/contracts';
import { holdingsResponseSchema, recentClosedTradesResponseSchema, type Holding } from '@diary/contracts/ledger';
import { NO_AUTOMATIC_SESSION_RETRY_HEADER, type createApiClient } from '@diary/api-client';
import type { RecentClosedTrade } from '@diary/domain';
import { reportMetadata } from '../beta/diagnostics';
import { ReadError, StaleRead, type DiaryReadScope } from '../diaries/access';
import { responseMatches, type EditorPayload } from './model';

export type DiaryEditorApi = {
  ownerId: string; isCurrent(): boolean;
  byDate(date: string): Promise<DiaryResponse | null>;
  read(id: string): Promise<DiaryResponse>;
  holdings(): Promise<Holding[]>;
  recentClosedTrades(): Promise<RecentClosedTrade[]>;
  write(mode: 'create' | 'update', id: string | null, payload: EditorPayload): Promise<
    { ok: true; diary: DiaryResponse } | { ok: false; status: number; code: string | null; ledgerRejection: LedgerRejection | null }
  >;
  changed(): void;
};

export type LedgerRejection = { kind: 'no-holding' | 'oversell'; symbol: string };

function ledgerRejection(details: { field?: string; message?: string; value?: unknown }[] | null): LedgerRejection | null {
  for (const detail of details ?? []) {
    if (detail.field !== 'transactions' || !detail.message) continue;
    const noHolding = /^No (.+) holding is available to sell$/.exec(detail.message);
    const oversell = /^(.+) sell quantity exceeds the available holding$/.exec(detail.message);
    const match = noHolding ?? oversell;
    const symbol = match?.[1]?.trim();
    if (symbol && symbol.length <= 20) return { kind: noHolding ? 'no-holding' : 'oversell', symbol };
  }
  return null;
}

export function createDiaryEditorApi(api: ReturnType<typeof createApiClient>, scope: DiaryReadScope, changed: () => void): DiaryEditorApi {
  const check = () => { if (!scope.isCurrent()) throw new StaleRead(); };
  return {
    ownerId: scope.ownerId, isCurrent: scope.isCurrent, changed,
    byDate: date => scope.byDate(date), read: id => scope.detail(id),
    async write(mode, id, payload) {
      check();
      reportMetadata.reset('diary-editor');
      const headers = { [NO_AUTOMATIC_SESSION_RETRY_HEADER]: '1' };
      let response: Response;
      let responseText = '';
      let errorBody: unknown;
      if (mode === 'create') {
        const body = createDiaryRequestSchema.parse({ ...payload,
          transactions: payload.transactions?.map(({ id: _id, ...transaction }) => transaction) }) as CreateDiaryRequest;
        const result = await api.POST('/api/diaries', { body, parseAs: 'text', headers });
        response = result.response; responseText = result.data ?? ''; errorBody = result.error;
      } else {
        const body = payload as UpdateDiaryRequest;
        const result = await api.PUT('/api/diaries/{id}', { params: { path: { id: id! } }, body, parseAs: 'text', headers });
        response = result.response; responseText = result.data ?? ''; errorBody = result.error;
      }
      check();
      if (!response.ok) {
        let code: string | null = null;
        let sellRejection: LedgerRejection | null = null;
        try {
          const parsed = apiErrorResponseSchema.safeParse(typeof errorBody === 'string' ? JSON.parse(errorBody) : errorBody);
          if (parsed.success) {
            code = parsed.data.data.code;
            sellRejection = ledgerRejection(parsed.data.data.details);
            reportMetadata.set('diary-editor', parsed.data.data);
          }
        } catch { /* Unrecognized responses do not prove that the write was rejected. */ }
        return { ok: false, status: response.status, code, ledgerRejection: sellRejection };
      }
      let diary: DiaryResponse;
      try { diary = diaryResponseSchema.parse(JSON.parse(responseText)); }
      catch { throw new ReadError('invalid-response'); }
      if (!responseMatches(diary, payload, scope.ownerId) || (mode === 'update' && diary.id !== id)) throw new ReadError('invalid-response');
      return { ok: true, diary };
    },
    async holdings() {
      check();
      try {
        const result = await api.GET('/api/stocks/holdings');
        check();
        if (result.response.status === 401) throw new ReadError('session');
        if (!result.response.ok) throw new ReadError('server');
        try { return holdingsResponseSchema.parse(result.data); } catch { throw new ReadError('invalid-response'); }
      } catch (error) {
        check();
        if (error instanceof ReadError) throw error;
        throw new ReadError('network');
      }
    },
    async recentClosedTrades() {
      check();
      try {
        const result = await api.GET('/api/stats/recent-trades', { params: { query: { days: '90', limit: '100' } } });
        check();
        if (result.response.status === 401) throw new ReadError('session');
        if (!result.response.ok) throw new ReadError('server');
        try { return recentClosedTradesResponseSchema.parse(result.data).trades; }
        catch { throw new ReadError('invalid-response'); }
      } catch (error) {
        check();
        if (error instanceof ReadError) throw error;
        throw new ReadError('network');
      }
    },
  };
}
