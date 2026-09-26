import { EtfFailure, type EtfProfile, type EtfResearchService } from './etf-data';

export type EtfQuery = { symbol: string; benchmark: 'SPY' | 'QQQ'; period: '1m' | '3m' | '6m' | '1y' };
export type EtfResearchState = { request: EtfQuery; loading: boolean; data: EtfProfile | null; error: EtfFailure | null };

export function createEtfResearchManager(service: EtfResearchService, initial: EtfQuery) {
  let revision = 0;
  let disposed = false;
  let controller: AbortController | null = null;
  let state: EtfResearchState = { request: initial, loading: false, data: null, error: null };
  const listeners = new Set<() => void>();
  const update = (next: Partial<EtfResearchState>) => {
    if (disposed) return;
    state = { ...state, ...next };
    listeners.forEach(listener => listener());
  };
  const manager = {
    getSnapshot: () => state,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    open(request: EtfQuery) {
      disposed = false;
      const expected = ++revision;
      controller?.abort();
      controller = new AbortController();
      const active = controller;
      update({ request, loading: true, data: null, error: null });
      void service.read(request, active.signal).then(data => {
        if (!disposed && expected === revision && !active.signal.aborted) update({ loading: false, data, error: null });
      }).catch(error => {
        if (!disposed && expected === revision && !active.signal.aborted) update({ loading: false, data: null, error: error instanceof EtfFailure ? error : new EtfFailure('unavailable') });
      });
    },
    retry() { manager.open(state.request); },
    dispose() { disposed = true; revision++; controller?.abort(); controller = null; listeners.clear(); },
  };
  return manager;
}
