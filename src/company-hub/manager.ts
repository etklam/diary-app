import type { MarketHistorical, MarketQuote, MarketRange } from '@diary/contracts/market';
import type { CompanyHubResponse } from '@diary/contracts/company-hub';
import { CompanyHubFailure, type CompanyHubService, type MarketRead } from './service';

type ReadState<T> = { loading: boolean; value: T | null; error: CompanyHubFailure | null };
export type CompanyContextState = ReadState<CompanyHubResponse> & { guest: boolean };
export type CompanyHubState = {
  symbol: string;
  range: MarketRange;
  quote: ReadState<MarketRead<MarketQuote>>;
  history: ReadState<MarketRead<MarketHistorical>>;
  owner: CompanyContextState;
};

const blankRead = <T>(): ReadState<T> => ({ loading: false, value: null, error: null });

export function createCompanyHubManager(service: CompanyHubService, isCurrent: () => boolean) {
  let sequence = 0;
  let historySequence = 0;
  let disposed = false;
  let controllers: AbortController[] = [];
  let historyController: AbortController | null = null;
  let state: CompanyHubState = {
    symbol: '', range: '1y', quote: blankRead(), history: blankRead(),
    owner: { ...blankRead<CompanyHubResponse>(), guest: true },
  };
  const listeners = new Set<() => void>();
  const current = () => !disposed && isCurrent();
  const update = (next: Partial<CompanyHubState>) => {
    if (!current()) return;
    state = { ...state, ...next };
    listeners.forEach(listener => listener());
  };

  const manager = {
    getSnapshot: () => state,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    open(symbol: string, range: MarketRange, guest: boolean) {
      disposed = false;
      const expected = ++sequence;
      historySequence++;
      controllers.forEach(controller => controller.abort());
      controllers = [];
      historyController?.abort(); historyController = null;
      update({ symbol, range, quote: { loading: true, value: null, error: null }, history: { loading: true, value: null, error: null },
        owner: guest ? { ...blankRead<CompanyHubResponse>(), guest: true } : { loading: true, value: null, error: null, guest: false } });
      const quoteController = track();
      void load(expected, quoteController, async () => service.quote(symbol, quoteController.signal), result => update({ quote: { loading: false, value: result, error: null } }), error => update({ quote: { loading: false, value: null, error } }));
      const historyRead = historySequence;
      const historyRequestController = track();
      historyController = historyRequestController;
      void load(expected, historyRequestController, async () => service.history(symbol, range, historyRequestController.signal), result => update({ history: { loading: false, value: result, error: null } }), error => update({ history: { loading: false, value: null, error } }), () => historyRead === historySequence);
      if (!guest) {
        const ownerController = track();
        void load(expected, ownerController, async () => service.owner(symbol, ownerController.signal), result => update({ owner: { loading: false, value: result, error: null, guest: false } }), error => update({ owner: { loading: false, value: null, error, guest: false } }));
      }
    },
    setRange(range: MarketRange) {
      if (!state.symbol || state.range === range || !current()) return;
      const expected = sequence;
      const read = ++historySequence;
      historyController?.abort();
      historyController = new AbortController();
      const controller = historyController;
      update({ range, history: { loading: true, value: null, error: null } });
      void load(expected, controller, async () => service.history(state.symbol, range, controller.signal), value => update({ history: { loading: false, value, error: null } }), error => update({ history: { loading: false, value: null, error } }), () => read === historySequence);
    },
    refresh() {
      if (!state.symbol || !current()) return;
      const range = state.range;
      const guest = state.owner.guest;
      manager.open(state.symbol, range, guest);
    },
    dispose() {
      disposed = true; sequence++; historySequence++;
      controllers.forEach(controller => controller.abort()); controllers = [];
      historyController?.abort(); historyController = null; listeners.clear();
    },
  };
  return manager;

  function track() { const controller = new AbortController(); controllers.push(controller); return controller; }
  async function load<T>(expected: number, controller: AbortController, request: () => Promise<T>, accept: (result: T) => void, reject: (error: CompanyHubFailure) => void, isLatest: () => boolean = () => true) {
    try {
      const value = await request();
      if (current() && expected === sequence && isLatest() && !controller.signal.aborted) accept(value);
    } catch (error) {
      if (current() && expected === sequence && isLatest() && !controller.signal.aborted) reject(asFailure(error));
    } finally { controllers = controllers.filter(value => value !== controller); }
  }
}

function asFailure(error: unknown) { return error instanceof CompanyHubFailure ? error : new CompanyHubFailure('unavailable'); }
