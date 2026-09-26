import type { MarketStateFailure, MarketStateService } from './market-state-data';
import type { MarketStateHistoryItem, MarketStateSnapshot } from '@diary/contracts/market-state';

export type MarketStateView = {
  snapshot: MarketStateSnapshot | null;
  history: MarketStateHistoryItem[] | null;
  snapshotLoading: boolean;
  historyLoading: boolean;
  snapshotError: MarketStateFailure | null;
  historyError: MarketStateFailure | null;
};

const initial: MarketStateView = { snapshot: null, history: null, snapshotLoading: false, historyLoading: false, snapshotError: null, historyError: null };

export function createMarketStateManager(service: MarketStateService) {
  let state = initial;
  let snapshotSequence = 0;
  let historySequence = 0;
  let snapshotController: AbortController | null = null;
  let historyController: AbortController | null = null;
  let disposed = false;
  const listeners = new Set<() => void>();
  const publish = (next: MarketStateView) => {
    if (disposed) return;
    state = next;
    listeners.forEach(listener => listener());
  };

  async function refreshSnapshot() {
    if (disposed) return;
    const sequence = ++snapshotSequence;
    snapshotController?.abort();
    const controller = new AbortController();
    snapshotController = controller;
    publish({ ...state, snapshotLoading: true, snapshotError: null });
    try {
      const snapshot = await service.snapshot(controller.signal);
      if (disposed || sequence !== snapshotSequence) return;
      publish({ ...state, snapshot, snapshotLoading: false, snapshotError: null });
    } catch (error) {
      if (disposed || sequence !== snapshotSequence || controller.signal.aborted) return;
      const typed = error as MarketStateFailure;
      publish({ ...state, snapshot: typed.kind === 'missing' ? null : state.snapshot, snapshotLoading: false, snapshotError: typed });
    }
  }

  async function refreshHistory() {
    if (disposed) return;
    const sequence = ++historySequence;
    historyController?.abort();
    const controller = new AbortController();
    historyController = controller;
    publish({ ...state, historyLoading: true, historyError: null });
    try {
      const history = await service.history(controller.signal);
      if (disposed || sequence !== historySequence) return;
      publish({ ...state, history, historyLoading: false, historyError: null });
    } catch (error) {
      if (disposed || sequence !== historySequence || controller.signal.aborted) return;
      publish({ ...state, historyLoading: false, historyError: error as MarketStateFailure });
    }
  }

  return {
    subscribe(listener: () => void) { listeners.add(listener); return () => listeners.delete(listener); },
    getSnapshot() { return state; },
    refreshSnapshot,
    refreshHistory,
    dispose() {
      disposed = true;
      snapshotSequence++;
      historySequence++;
      snapshotController?.abort();
      historyController?.abort();
      listeners.clear();
    },
  };
}
