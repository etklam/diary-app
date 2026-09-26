import { describe, expect, it, vi } from 'vitest';
import { marketStateHistoryResponseSchema, marketStateSnapshotSchema, type MarketStateHistoryItem, type MarketStateSnapshot } from '@diary/contracts/market-state';
import { createMarketStateManager } from '../../src/tools/market-state-manager';
import { MarketStateFailure, type MarketStateService } from '../../src/tools/market-state-data';

const snapshot: MarketStateSnapshot = marketStateSnapshotSchema.parse({
  universeKey: 'SP500_NDX', date: '2026-09-25', latestPriceDate: '2026-09-24', coveragePct: 92, isStale: false,
  marketState: 'unknown', score: null, up4: 12, down4: 9, up4Pct: 2.4, down4Pct: 1.8,
  ratio10d: null, above40dPct: null, suggestedExposure: '40-60%', message: 'Market state unknown. Use caution.',
});
const row: MarketStateHistoryItem = marketStateHistoryResponseSchema.parse([{
  date: '2026-09-24', up4: 17, down4: 12, up4Pct: 3.4, down4Pct: 2.4,
  ratio10d: 1.2, above40dPct: 61, marketState: 'neutral',
}])[0]!;

function fakeService(overrides: Partial<MarketStateService> = {}) {
  return { snapshot: vi.fn(async () => snapshot), history: vi.fn(async () => [row]), ...overrides } as MarketStateService;
}

describe('public Market State reads', () => {
  it('preserves warmup, unknown and null fields from the shared snapshot contract', () => {
    expect(snapshot).toMatchObject({ marketState: 'unknown', isStale: false, coveragePct: 92, ratio10d: null, above40dPct: null });
    expect(snapshot.date).not.toBe(snapshot.latestPriceDate);
  });

  it('loads snapshot and history independently and retries only the missing snapshot', async () => {
    const service = fakeService({ snapshot: vi.fn().mockRejectedValueOnce(new MarketStateFailure('missing', 'SYS_NOT_FOUND')).mockResolvedValue(snapshot) });
    const manager = createMarketStateManager(service);
    await Promise.all([manager.refreshSnapshot(), manager.refreshHistory()]);
    expect(manager.getSnapshot()).toMatchObject({ snapshot: null, history: [row], snapshotError: { kind: 'missing' }, historyError: null });
    await manager.refreshSnapshot();
    expect(manager.getSnapshot()).toMatchObject({ snapshot, history: [row], snapshotError: null, historyError: null });
    expect(service.history).toHaveBeenCalledTimes(1);
    manager.dispose();
  });

  it('keeps prior history rows when a history refresh fails', async () => {
    const service = fakeService({ history: vi.fn().mockResolvedValueOnce([row]).mockRejectedValueOnce(new MarketStateFailure('unavailable')) });
    const manager = createMarketStateManager(service);
    await manager.refreshHistory();
    await manager.refreshHistory();
    expect(manager.getSnapshot()).toMatchObject({ history: [row], historyError: { kind: 'unavailable' }, historyLoading: false });
    manager.dispose();
  });

  it('discards late responses after a newer snapshot request wins', async () => {
    let resolveFirst!: (value: MarketStateSnapshot) => void;
    const first = new Promise<MarketStateSnapshot>(resolve => { resolveFirst = resolve; });
    const newer = { ...snapshot, date: '2026-09-26', marketState: 'risk_on' as const };
    const service = fakeService({ snapshot: vi.fn().mockReturnValueOnce(first).mockResolvedValue(newer) });
    const manager = createMarketStateManager(service);
    const stale = manager.refreshSnapshot();
    await manager.refreshSnapshot();
    resolveFirst(snapshot);
    await stale;
    expect(manager.getSnapshot().snapshot).toEqual(newer);
    manager.dispose();
  });

  it('does not publish after the screen disposes', async () => {
    let resolve!: (value: MarketStateHistoryItem[]) => void;
    const delayed = new Promise<MarketStateHistoryItem[]>(done => { resolve = done; });
    const manager = createMarketStateManager(fakeService({ history: vi.fn(() => delayed) }));
    const pending = manager.refreshHistory();
    manager.dispose();
    resolve([row]);
    await pending;
    expect(manager.getSnapshot().history).toBeNull();
  });
});
