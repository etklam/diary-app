import type { StockWatchlistItem } from '@diary/contracts/watchlist';
import { stockSymbolSchema } from '@diary/contracts/watchlist';
import { WatchlistFailure, type StockWatchlistService } from './service';

export type WatchlistState = {
  items: StockWatchlistItem[] | null;
  loading: boolean;
  busy: boolean;
  error: WatchlistFailure | null;
  saved: boolean;
  mutationUncertain: boolean;
};

const initial: WatchlistState = { items: null, loading: false, busy: false, error: null, saved: false, mutationUncertain: false };

export function createWatchlistManager(service: StockWatchlistService, isCurrent: () => boolean) {
  let state = initial;
  let disposed = false;
  let readRevision = 0;
  let readController: AbortController | null = null;
  let mutationController: AbortController | null = null;
  const listeners = new Set<() => void>();
  const update = (next: Partial<WatchlistState>) => {
    if (disposed || !isCurrent()) return;
    state = { ...state, ...next };
    listeners.forEach(listener => listener());
  };
  const rejectStale = () => { if (disposed || !isCurrent()) throw new WatchlistFailure('stale'); };

  const manager = {
    getSnapshot: () => state,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    async refresh() {
      disposed = false;
      const revision = ++readRevision;
      readController?.abort();
      const controller = new AbortController();
      readController = controller;
      update({ loading: true, error: null });
      try {
        const result = await service.read(controller.signal);
        rejectStale();
        if (revision === readRevision && !controller.signal.aborted) {
          update({ items: result.items, loading: false, error: null, mutationUncertain: false });
        }
      } catch (error) {
        if (revision === readRevision && !controller.signal.aborted && !disposed && isCurrent()) {
          update({ loading: false, error: error instanceof WatchlistFailure ? error : new WatchlistFailure('uncertain') });
        }
      } finally {
        if (readController === controller) readController = null;
      }
    },
    async add(rawSymbol: string) {
      if (state.busy || state.mutationUncertain || state.error?.kind === 'session') return false;
      const parsed = stockSymbolSchema.safeParse(rawSymbol);
      if (!parsed.success) { update({ error: new WatchlistFailure('rejected', 'SYS_VALIDATION_ERROR'), saved: false }); return false; }
      const saved = await mutate(async () => { await service.add({ symbol: parsed.data }); });
      if (saved) void manager.refresh();
      return saved;
    },
    async updateOrder(id: string, rawOrder: string) {
      if (state.busy || state.mutationUncertain || state.error?.kind === 'session') return false;
      if (!/^\d+$/.test(rawOrder.trim())) {
        update({ error: new WatchlistFailure('rejected', 'SYS_VALIDATION_ERROR'), saved: false });
        return false;
      }
      const sortOrder = Number(rawOrder.trim());
      if (!Number.isSafeInteger(sortOrder) || sortOrder > 10_000) {
        update({ error: new WatchlistFailure('rejected', 'SYS_VALIDATION_ERROR'), saved: false });
        return false;
      }
      const saved = await mutate(async () => { await service.update(id, { sortOrder }); });
      if (saved) void manager.refresh();
      return saved;
    },
    async archive(id: string) {
      if (state.busy || state.mutationUncertain || state.error?.kind === 'session') return false;
      const saved = await mutate(async () => { await service.archive(id); });
      if (saved) void manager.refresh();
      return saved;
    },
    dispose() {
      disposed = true;
      readRevision++;
      readController?.abort();
      mutationController?.abort();
      listeners.clear();
    },
  };
  return manager;

  async function mutate(action: () => Promise<void>) {
    rejectStale();
    const controller = new AbortController();
    mutationController = controller;
    update({ busy: true, error: null, saved: false });
    try {
      await action();
      rejectStale();
      update({ saved: true, mutationUncertain: false });
      return true;
    } catch (error) {
      if (!disposed && isCurrent()) {
        const failure = error instanceof WatchlistFailure ? error : new WatchlistFailure('uncertain');
        update({ error: failure, mutationUncertain: failure.kind === 'uncertain' });
      }
      return false;
    } finally {
      if (mutationController === controller) mutationController = null;
      if (!disposed && isCurrent()) update({ busy: false });
    }
  }
}
