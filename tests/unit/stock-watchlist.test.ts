import { describe, expect, it, vi } from 'vitest';
import type { StockWatchlistResponse } from '@diary/contracts/watchlist';
import { createWatchlistManager } from '../../src/watchlist/manager';
import { stockWatchlistService, WatchlistFailure, type StockWatchlistService } from '../../src/watchlist/service';

const ok = (data: unknown) => ({ response: new Response(null, { status: 200 }), data });
function fakeService(overrides: Partial<StockWatchlistService> = {}) {
  return {
    read: vi.fn(async () => ({ items: [] } satisfies StockWatchlistResponse)),
    add: vi.fn(async () => ({ id: '1', symbol: 'AAPL', sortOrder: 0, status: 'WATCHING' as const })),
    update: vi.fn(async () => ({ id: '1', symbol: 'AAPL', sortOrder: 2, status: 'WATCHING' as const })),
    archive: vi.fn(async () => ({ success: true as const })),
    ...overrides,
  } as StockWatchlistService;
}

describe('stock Watchlist service and manager', () => {
  it('normalizes symbols, retains sort bounds, and sends mutations without automatic retries', async () => {
    const post = vi.fn(async (_path: string, _options: unknown) => ok({ id: '8', symbol: 'AAPL', sortOrder: 0, status: 'WATCHING' }));
    const patch = vi.fn(async (_path: string, _options: unknown) => ok({ id: '8', symbol: 'AAPL', sortOrder: 12, status: 'WATCHING', updatedAt: '2026-09-01T00:00:00Z' }));
    const api = { POST: post, PATCH: patch } as never;
    const service = stockWatchlistService(api, { isCurrent: () => true } as never);

    await service.add({ symbol: ' aapl ' });
    await service.update('8', { sortOrder: 12 });
    expect(post.mock.calls[0]?.[1]).toMatchObject({ body: { symbol: 'AAPL' }, headers: { 'x-diary-no-automatic-session-retry': '1' } });
    expect(patch.mock.calls[0]?.[1]).toMatchObject({ params: { path: { id: '8' } }, body: { sortOrder: 12 } });
    expect(patch.mock.calls[0]?.[1]).toHaveProperty('headers.x-diary-no-automatic-session-retry', '1');
  });

  it('locks new writes after an uncertain response until an explicit list refresh succeeds', async () => {
    const add = vi.fn().mockRejectedValueOnce(new WatchlistFailure('uncertain')).mockResolvedValue({ id: '1', symbol: 'AAPL', sortOrder: 0, status: 'WATCHING' });
    const service = fakeService({ add });
    const manager = createWatchlistManager(service, () => true);
    await manager.refresh();

    expect(await manager.add('aapl')).toBe(false);
    expect(manager.getSnapshot().mutationUncertain).toBe(true);
    expect(await manager.add('MSFT')).toBe(false);
    expect(add).toHaveBeenCalledTimes(1);

    await manager.refresh();
    expect(manager.getSnapshot().mutationUncertain).toBe(false);
    expect(await manager.add('msft')).toBe(true);
    expect(add.mock.calls[1]?.[0]).toEqual({ symbol: 'MSFT' });
    manager.dispose();
  });

  it('does not publish a late list response after the owner scope expires', async () => {
    let resolve!: (value: StockWatchlistResponse) => void;
    const read = vi.fn(() => new Promise<StockWatchlistResponse>(done => { resolve = done; }));
    const service = fakeService({ read });
    let current = true;
    const manager = createWatchlistManager(service, () => current);
    const loading = manager.refresh();
    current = false;
    resolve({ items: [] });
    await loading;
    expect(manager.getSnapshot().items).toBeNull();
    manager.dispose();
  });

  it('rejects malformed symbols and out-of-range sort values before sending writes', async () => {
    const service = fakeService();
    const manager = createWatchlistManager(service, () => true);
    await manager.refresh();
    expect(await manager.add('AAPL/BRK')).toBe(false);
    expect(await manager.updateOrder('1', '10001')).toBe(false);
    expect(service.add).not.toHaveBeenCalled();
    expect(service.update).not.toHaveBeenCalled();
    expect(manager.getSnapshot().error?.code).toBe('SYS_VALIDATION_ERROR');
    manager.dispose();
  });

  it('can reload after a development effect cleanup', async () => {
    const manager = createWatchlistManager(fakeService(), () => true);
    await manager.refresh();
    manager.dispose();
    manager.subscribe(() => {});
    await manager.refresh();
    expect(manager.getSnapshot().items).toEqual([]);
    manager.dispose();
  });
});
