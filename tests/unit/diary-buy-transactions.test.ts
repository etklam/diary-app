import { afterEach, describe, expect, it } from 'vitest';
import { diaryResponseSchema } from '@diary/contracts';
import { baselineFor, fieldsFor, payloadFor } from '../../src/diary-editor/model';
import { changeInstantLocalValue, instantEditFromInstant, localTradeChoices, localTradeInstants, resolveLocalTradeInstant } from '../../src/diary-editor/trade-time';

const originalTimezone = process.env.TZ;
afterEach(() => {
  if (originalTimezone === undefined) delete process.env.TZ;
  else process.env.TZ = originalTimezone;
});

function setTimezone(value: string) { process.env.TZ = value; }
function diary(transactions: unknown[] = []) {
  return diaryResponseSchema.parse({ id: '810', userId: '101', title: 'Trade diary', content: 'Trade notes', tags: [], tagsString: null,
    stockSymbols: [], createdVia: 'WEB', createdByLabel: null, date: '2026-11-01',
    createdAt: '2026-11-01T05:00:00.000Z', updatedAt: '2026-11-01T05:00:00.000Z', transactions });
}

describe('native BUY authoring contract', () => {
  it('requires a UTC occurrence for repeated wall-clock time and rejects a DST gap', () => {
    setTimezone('America/New_York');
    expect(localTradeInstants('2026-03-08T02:30')).toEqual([]);
    expect(localTradeInstants('2026-11-01T01:30')).toEqual(['2026-11-01T05:30:00.000Z', '2026-11-01T06:30:00.000Z']);
    expect(resolveLocalTradeInstant('2026-11-01T01:30', '')).toBeUndefined();
    expect(resolveLocalTradeInstant('2026-03-08T02:30', '')).toBeUndefined();
    expect(localTradeChoices('2026-11-01T01:30', '2026-11-01T06:30:14.321Z')).toEqual([
      '2026-11-01T05:30:00.000Z', '2026-11-01T06:30:14.321Z',
    ]);
  });

  it('preserves existing exact sub-minute instants and canonicalizes new BUY values', () => {
    setTimezone('America/New_York');
    const original = diary([{ id: '901', symbol: 'OLD', type: 'SELL', quantity: '2.0000', price: '8.5000',
      tradeDate: '2026-11-01T05:30:12.345Z', notes: 'keep note', strategy: 'old strategy', emotion: 'fear' }]);
    const fields = fieldsFor(baselineFor(original));
    expect(fields.transactions[0]).toMatchObject({ id: '901', tradeDate: '2026-11-01T01:30', instant: '2026-11-01T05:30:12.345Z' });
    const added = { key: 'new-purchase', type: 'BUY' as const, symbol: ' aapl ', quantity: '001.2500', price: '010.1000',
      tradeDate: '2026-11-01T01:30', instant: '2026-11-01T06:30:00.000Z', notes: 'entry', strategy: 'breakout', emotion: 'calm' };
    const payload = payloadFor({ ...fields, title: 'Trade diary', content: 'Trade notes', transactions: [...fields.transactions, added] });
    expect(payload.transactions).toEqual([
      { id: '901', type: 'SELL', symbol: 'OLD', quantity: '2', price: '8.5', tradeDate: '2026-11-01T05:30:12.345Z',
        notes: 'keep note', strategy: 'old strategy', emotion: 'fear' },
      { type: 'BUY', symbol: 'AAPL', quantity: '1.25', price: '10.1', tradeDate: '2026-11-01T06:30:00.000Z',
        notes: 'entry', strategy: 'breakout', emotion: 'calm' },
    ]);
  });

  it('keeps a selected exact instant when its local minute is unchanged and invalidates it when edited', () => {
    setTimezone('America/New_York');
    const exact = instantEditFromInstant('2026-11-01T06:30:42.765Z');
    expect(exact).toEqual({ value: '2026-11-01T01:30', instant: '2026-11-01T06:30:42.765Z', timeZone: 'America/New_York' });
    setTimezone('UTC');
    expect(resolveLocalTradeInstant(exact.value, exact.instant, exact.timeZone)).toBe('2026-11-01T06:30:42.765Z');
    expect(changeInstantLocalValue(exact, '2026-11-01T01:31')).toEqual({ value: '2026-11-01T01:31', instant: '', timeZone: 'America/New_York' });
  });

  it('leaves the transaction collection out of content-only edits and rejects excess precision', () => {
    const fields = fieldsFor(baselineFor(diary([{ id: '902', symbol: 'SYN', type: 'BUY', quantity: '1', price: '10',
      tradeDate: '2026-11-01T12:00:00.000Z' }])));
    expect(payloadFor({ ...fields, title: 'Changed', content: 'Changed' })).not.toHaveProperty('transactions');
    const incomplete = { key: 'new', type: 'BUY' as const, symbol: 'SYN', quantity: '1.00001', price: '10',
      tradeDate: '2026-11-01T12:00', instant: '', notes: '', strategy: '', emotion: '' };
    expect(() => payloadFor({ ...fields, transactions: [...fields.transactions, incomplete] })).toThrow();
  });
});
