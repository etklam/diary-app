import { describe, expect, it, vi } from 'vitest';
import { tradePlanInputSchema } from '@diary/contracts/trade-plan';
import { emptyPlanForm, formFromPlan, parsePlanFilters, parsePlanForm, samePlanWrite } from '../../src/trade-plans/model';
import { PlanFailure, tradePlanService } from '../../src/trade-plans/service';
import { safeContinuation } from '../../src/navigation/continuation';
import { deletePlanAndDraft } from '../../src/trade-plans/delete';

const body = tradePlanInputSchema.parse({ symbol: 'aapl', entryPrice: '123.123456', entryZoneLow: '120.000001', entryZoneHigh: '125.123456', stopLoss: '115.000001', targetPrice: '150.999999', maxPositionSize: '9007199254740991.01', status: 'draft', diaryId: '8' });
const row = { id: '3', userId: '1', symbol: 'AAPL', setupType: null, entryPrice: '123.123456', entryZoneLow: '120.000001', entryZoneHigh: '125.123456', stopLoss: '115.000001', targetPrice: '150.999999', maxPositionSize: '9007199254740991.01', invalidationCondition: null, notes: null, status: 'draft', diaryId: '8', diary: { id: '8', title: 'Synthetic diary', date: '2026-09-01', reviewStatus: 'none', reviewOutcome: null, transactionCount: 0 }, createdAt: '2026-09-01T00:00:00.000Z', updatedAt: '2026-09-01T00:00:00.000Z' };
const response = (value: unknown, status = 200) => ({ response: new Response(null, { status }), data: value });

describe('Trade Plan native contract', () => {
  it('round-trips exact decimal strings and rejects inverted or over-precision zones', () => {
    const form = { ...emptyPlanForm(), ...Object.fromEntries(Object.entries(body).map(([key, value]) => [key, value ?? ''])) };
    expect(parsePlanForm(form).success).toBe(true);
    expect(formFromPlan(row as never).maxPositionSize).toBe('9007199254740991.01');
    expect(samePlanWrite(row as never, body, '1', '3')).toBe(true);
    expect(samePlanWrite({ ...row, userId: '2' } as never, body, '1', '3')).toBe(false);
    expect(parsePlanForm({ ...form, entryZoneHigh: '119' }).success).toBe(false);
    expect(parsePlanForm({ ...form, entryPrice: '1.1234567' }).success).toBe(false);
    expect(parsePlanFilters({ symbol: ' aapl ', status: 'active', sortBy: 'symbol-asc', page: 2 }).data).toMatchObject({ symbol: 'AAPL', status: 'active', page: 2 });
    expect(safeContinuation('/trade-plans/new?diaryId=8')).toBe('/trade-plans/new?diaryId=8');
    expect(safeContinuation('/trade-plans/3')).toBe('/trade-plans/3');
    expect(safeContinuation('/trade-plans/new?diaryId=8&status=active')).toBeNull();
  });

  it('never confirms a create with a foreign owner or mismatched body', async () => {
    const POST = vi.fn().mockResolvedValue(response({ ...row, userId: '2' }));
    const service = tradePlanService({ POST } as never, { ownerId: '1', isCurrent: () => true });
    await expect(service.create(body)).rejects.toMatchObject({ kind: 'uncertain' });
    expect(POST).toHaveBeenCalledTimes(1);
  });

  it('makes transport failures uncertain and rejects late responses after owner invalidation', async () => {
    const POST = vi.fn().mockRejectedValue(new Error('connection lost'));
    await expect(tradePlanService({ POST } as never, { ownerId: '1', isCurrent: () => true }).create(body)).rejects.toEqual(new PlanFailure('uncertain'));
    let current = true;
    const delayed = vi.fn(async () => { current = false; return response(row); });
    await expect(tradePlanService({ POST: delayed } as never, { ownerId: '1', isCurrent: () => current }).create(body)).rejects.toMatchObject({ kind: 'stale' });
  });

  it('keeps a confirmed delete confirmed when only local draft cleanup fails', async () => {
    const remote = vi.fn().mockResolvedValue({ success: true });
    const cleanup = vi.fn().mockRejectedValue(new Error('storage unavailable'));
    await expect(deletePlanAndDraft(remote, cleanup)).resolves.toEqual({ deleted: true, draftCleared: false });
    expect(remote).toHaveBeenCalledTimes(1);
    await expect(deletePlanAndDraft(vi.fn().mockRejectedValue(new Error('network lost')), cleanup)).rejects.toThrow('network lost');
    expect(cleanup).toHaveBeenCalledTimes(1);
  });
});
