import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createApiClient, createNativeSession } from '@diary/api-client';
import { apiErrorResponseSchema, diaryByDateResponseSchema, diaryResponseSchema, type NativeSession } from '@diary/contracts';
import {
  holdingsResponseSchema,
  recentClosedTradesResponseSchema,
  type LedgerTransactionInput,
} from '@diary/contracts/ledger';

describe.runIf(process.env.DIARY_DISPOSABLE_TEST_ENV === '1')('SELL transaction API acceptance', () => {
  it('replays partial/full sales, rejects invalid sales atomically, and isolates owners', async () => {
    const baseUrl = process.env.DIARY_API_BASE_URL!;
    expect(['localhost', '127.0.0.1', '[::1]']).toContain(new URL(baseUrl).hostname);

    const scenario = randomUUID();
    const rawId = scenario.replaceAll('-', '');
    const transport: typeof fetch = (input, init) => {
      const request = new Request(input, init);
      request.headers.set('x-e2e-test-id', scenario);
      request.headers.set('x-forwarded-for', `fd00:${rawId.slice(0, 4)}:${rawId.slice(4, 8)}:${rawId.slice(8, 12)}::1`);
      return fetch(request);
    };
    const sessions: ReturnType<typeof createNativeSession>[] = [];
    const register = async (label: string) => {
      const credentials = { email: `diary-sell-${label}-${randomUUID().slice(0, 8)}@example.test`, password: `Synthetic-${randomUUID()}` };
      const registered = await transport(`${baseUrl}/api/auth/register`, {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(credentials),
      });
      expect(registered.status).toBe(200);
      let stored: NativeSession | null = null;
      const storage = { get: () => stored, set: (value: NativeSession) => { stored = value; }, clear: () => { stored = null; } };
      const native = createNativeSession({ baseUrl, storage, fetch: transport });
      sessions.push(native);
      await native.login(credentials);
      return createApiClient({ baseUrl, fetch: native.fetch });
    };
    const owner = await register('owner');
    const other = await register('other');
    const createdIds: string[] = [];
    const day = (daysAgo: number) => new Date(Date.now() - daysAgo * 86_400_000).toISOString().slice(0, 10);
    const trade = (date: string, type: 'BUY' | 'SELL', quantity: string, price: string, symbol = 'SELLTEST', time = '12:00:00.000'): LedgerTransactionInput => ({
      symbol, type, quantity, price, tradeDate: `${date}T${time}Z`,
      notes: `${type} source note`, strategy: 'controlled', emotion: 'calm',
    });
    const byDate = async (api: typeof owner, date: string) => {
      const result = await api.GET('/api/diaries/by-date', { params: { query: { date } } });
      expect(result.response.status).toBe(200);
      return diaryByDateResponseSchema.parse(result.data);
    };
    const holdings = async (api: typeof owner) => {
      const result = await api.GET('/api/stocks/holdings');
      expect(result.response.status).toBe(200);
      return holdingsResponseSchema.parse(result.data);
    };
    const recent = async (api: typeof owner) => {
      const result = await api.GET('/api/stats/recent-trades');
      expect(result.response.status).toBe(200);
      return recentClosedTradesResponseSchema.parse(result.data).trades;
    };
    const create = async (date: string, title: string, transactions: LedgerTransactionInput[]) => {
      const result = await owner.POST('/api/diaries', { body: { date, title, content: 'Synthetic SELL ledger acceptance', transactions } });
      expect(result.response.status).toBe(201);
      const diary = diaryResponseSchema.parse(result.data);
      createdIds.push(diary.id);
      return diary;
    };
    const rejected = async (api: typeof owner, date: string, title: string, transactions: LedgerTransactionInput[], message: string) => {
      const beforeHoldings = await holdings(api);
      const beforeTrades = await recent(api);
      const result = await api.POST('/api/diaries', { body: { date, title, content: 'Must roll back', transactions } });
      expect(result.response.status).toBe(400);
      expect(apiErrorResponseSchema.parse(result.error)).toMatchObject({
        data: { code: 'SYS_VALIDATION_ERROR', details: [{ field: 'transactions', message }] },
      });
      expect(await byDate(api, date)).toBeNull();
      expect(await holdings(api)).toEqual(beforeHoldings);
      expect(await recent(api)).toEqual(beforeTrades);
    };

    try {
      const buyDate = day(10);
      const partialDate = day(9);
      const oversellDate = day(8);
      const fullDate = day(7);
      const noHoldingDate = day(6);
      const sameInstantDate = day(5);
      const reverseDate = day(4);

      const basis = await create(buyDate, 'Synthetic SELL basis', [
        trade(buyDate, 'BUY', '1.25', '10.1', 'SELLTEST', '10:00:00.000'),
        trade(buyDate, 'BUY', '0.75', '12.3', 'SELLTEST', '11:00:00.000'),
      ]);
      expect(basis.transactions).toMatchObject([
        { type: 'BUY', symbol: 'SELLTEST', quantity: '1.25', price: '10.1' },
        { type: 'BUY', symbol: 'SELLTEST', quantity: '0.75', price: '12.3' },
      ]);
      expect(await holdings(owner)).toEqual([{ symbol: 'SELLTEST', quantity: '2', avgCost: '10.925', totalCost: '21.85' }]);

      const partialInstant = `${partialDate}T12:30:45.678Z`;
      const partial = await create(partialDate, 'Synthetic partial SELL', [trade(partialDate, 'SELL', '0.5', '20', 'SELLTEST', '12:30:45.678')]);
      expect(partial.transactions).toMatchObject([{
        type: 'SELL', symbol: 'SELLTEST', quantity: '0.5', price: '20', tradeDate: partialInstant,
        notes: 'SELL source note', strategy: 'controlled', emotion: 'calm',
      }]);
      expect(await holdings(owner)).toEqual([{ symbol: 'SELLTEST', quantity: '1.5', avgCost: '10.925', totalCost: '16.3875' }]);
      expect(await recent(owner)).toContainEqual(expect.objectContaining({
        symbol: 'SELLTEST', sellDate: partialInstant, sellQuantity: '0.5', realizedPnL: '4.54',
      }));

      await rejected(owner, oversellDate, 'Synthetic oversell rejected', [trade(oversellDate, 'SELL', '1.5001', '20')],
        'SELLTEST sell quantity exceeds the available holding');

      const fullInstant = `${fullDate}T13:15:25.432Z`;
      const full = await create(fullDate, 'Synthetic full SELL', [trade(fullDate, 'SELL', '1.5', '8', 'SELLTEST', '13:15:25.432')]);
      expect(full.transactions).toMatchObject([{ type: 'SELL', symbol: 'SELLTEST', quantity: '1.5', price: '8', tradeDate: fullInstant }]);
      expect(await holdings(owner)).toEqual([]);
      expect(await recent(owner)).toEqual(expect.arrayContaining([
        expect.objectContaining({ symbol: 'SELLTEST', sellDate: fullInstant, sellQuantity: '1.5', realizedPnL: '-4.39' }),
        expect.objectContaining({ symbol: 'SELLTEST', sellDate: partialInstant, sellQuantity: '0.5', realizedPnL: '4.54' }),
      ]));

      await rejected(owner, noHoldingDate, 'Synthetic no holding rejected', [trade(noHoldingDate, 'SELL', '1', '11', 'NOHOLD')],
        'No NOHOLD holding is available to sell');

      const sameInstant = `${sameInstantDate}T14:22:33.456Z`;
      const ordered = await create(sameInstantDate, 'Synthetic same instant close', [
        trade(sameInstantDate, 'BUY', '1', '3', 'SAME', '14:22:33.456'),
        trade(sameInstantDate, 'SELL', '1', '4', 'SAME', '14:22:33.456'),
      ]);
      expect(ordered.transactions).toMatchObject([
        { type: 'BUY', symbol: 'SAME', tradeDate: sameInstant },
        { type: 'SELL', symbol: 'SAME', tradeDate: sameInstant },
      ]);
      expect(await holdings(owner)).toEqual([]);
      expect(await recent(owner)).toContainEqual(expect.objectContaining({ symbol: 'SAME', sellDate: sameInstant, realizedPnL: '1' }));
      await rejected(owner, reverseDate, 'Synthetic reverse same instant rejected', [
        trade(reverseDate, 'SELL', '1', '4', 'REVERSE', '14:22:33.456'),
        trade(reverseDate, 'BUY', '1', '3', 'REVERSE', '14:22:33.456'),
      ], 'No REVERSE holding is available to sell');

      const hidden = await other.GET('/api/diaries/{id}', { params: { path: { id: basis.id } } });
      expect(hidden.response.status).toBe(404);
      expect(await byDate(other, buyDate)).toBeNull();
      expect(await holdings(other)).toEqual([]);
      expect(await recent(other)).toEqual([]);
      await rejected(other, oversellDate, 'Synthetic cross owner SELL rejected', [trade(oversellDate, 'SELL', '0.5', '20')],
        'No SELLTEST holding is available to sell');

      console.log('SELL live API: exact partial/full P&L, canonical holdings, atomic rejection, same-instant order, and owner isolation: PASS');
    } finally {
      // Later sales must be removed before the purchases that fund them.
      for (const id of createdIds.reverse()) {
        const removed = await owner.DELETE('/api/diaries/{id}', { params: { path: { id } } });
        expect(removed.response.status).toBe(200);
      }
      for (const session of sessions) await session.logout();
    }
  }, 90000);
});
