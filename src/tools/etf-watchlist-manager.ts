import { etfSymbolSchema } from '@diary/contracts/etf';
import { EtfFailure, type EtfWatchlistRow, type EtfWatchlistService } from './etf-data';

export type EtfWatchlistState = { items: EtfWatchlistRow[] | null; loading: boolean; busy: boolean; saved: boolean; error: EtfFailure | null; mutationUncertain: boolean };
const initial: EtfWatchlistState = { items: null, loading: false, busy: false, saved: false, error: null, mutationUncertain: false };

export function createEtfWatchlistManager(service: EtfWatchlistService, isCurrent: () => boolean) {
  let state = initial;
  let disposed = false;
  let readRevision = 0;
  let readController: AbortController | null = null;
  let mutationController: AbortController | null = null;
  const listeners = new Set<() => void>();
  const current = () => !disposed && isCurrent();
  const update = (next: Partial<EtfWatchlistState>) => {
    if (!current()) return;
    state = { ...state, ...next };
    listeners.forEach(listener => listener());
  };
  const ensureCurrent = () => { if (!current()) throw new EtfFailure('stale'); };

  const manager = {
    getSnapshot: () => state,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    async refresh() {
      disposed = false;
      const expected = ++readRevision;
      readController?.abort();
      const active = new AbortController(); readController = active;
      update({ loading: true, error: null });
      try {
        const items = await service.read(active.signal);
        ensureCurrent();
        if (expected === readRevision && !active.signal.aborted) update({ items, loading: false, error: null, mutationUncertain: false });
      } catch (error) {
        if (current() && expected === readRevision && !active.signal.aborted) update({ loading: false, error: error instanceof EtfFailure ? error : new EtfFailure('unavailable') });
      } finally { if (readController === active) readController = null; }
    },
    async add(rawSymbol: string) {
      if (state.busy || state.mutationUncertain || state.error?.kind === 'session') return false;
      const parsed = etfSymbolSchema.safeParse(rawSymbol);
      if (!parsed.success) { update({ error: new EtfFailure('rejected', 'SYS_VALIDATION_ERROR'), saved: false }); return false; }
      const saved = await mutate(active => service.add(parsed.data, active.signal), item => update({ items: [{ ...item, latestPrice: null, latestDate: null }, ...(state.items ?? []).filter(row => row.id !== item.id)], saved: true }));
      if (saved) void manager.refresh();
      return saved;
    },
    async remove(id: string) {
      if (state.busy || state.mutationUncertain || state.error?.kind === 'session' || !state.items?.some(item => item.id === id)) return false;
      const saved = await mutate(active => service.remove(id, active.signal), () => update({ items: state.items?.filter(item => item.id !== id) ?? null, saved: true }));
      if (saved) void manager.refresh();
      return saved;
    },
    dispose() { disposed = true; readRevision++; readController?.abort(); mutationController?.abort(); listeners.clear(); },
  };
  return manager;

  async function mutate<T>(request: (active: AbortController) => Promise<T>, accept: (value: T) => void) {
    ensureCurrent();
    const active = new AbortController(); mutationController = active;
    update({ busy: true, error: null, saved: false });
    try {
      const value = await request(active);
      ensureCurrent();
      accept(value); return true;
    } catch (error) {
      if (current()) {
        const failure = error instanceof EtfFailure ? error : new EtfFailure('uncertain');
        update({ error: failure, mutationUncertain: failure.kind === 'uncertain' });
      }
      return false;
    } finally {
      if (mutationController === active) mutationController = null;
      if (current()) update({ busy: false });
    }
  }
}
