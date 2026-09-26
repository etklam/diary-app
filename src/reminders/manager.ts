import type { AlertResponse } from '@diary/contracts/alerts';
import { ReminderFailure, type ReminderService } from './service';
import { isReminderRoot } from './model';

type State = { items: AlertResponse[] | null; loading: boolean; pending: string | null;
  uncertainId: string | null; saved: boolean; error: ReminderFailure | null; readError: boolean };
export function createReminderManager(service: ReminderService, isCurrent: () => boolean) {
  let state: State = { items: null, loading: false, pending: null, uncertainId: null, saved: false, error: null, readError: false };
  let disposed = false, revision = 0;
  let readController: AbortController | null = null;
  const listeners = new Set<() => void>();
  const active = () => !disposed && isCurrent();
  const update = (next: Partial<State>) => { if (active()) { state = { ...state, ...next }; listeners.forEach(listener => listener()); } };
  const manager = {
    getSnapshot: () => state,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    async refresh() {
      if (!active() || state.pending) return;
      const expected = ++revision; readController?.abort();
      const controller = new AbortController(); readController = controller;
      update({ loading: true, readError: false });
      try {
        const items = await service.read(controller.signal);
        if (active() && expected === revision) update({ items, loading: false, readError: false,
          ...(state.error?.kind === 'session' ? { error: null } : {}) });
      } catch { if (active() && expected === revision) update({ loading: false, readError: true }); }
    },
    async dismiss(id: string) {
      if (!active() || state.pending || state.uncertainId || state.error?.kind === 'session') return false;
      const target = state.items?.find(item => item.id === id);
      if (!target) return false;
      revision++; readController?.abort();
      update({ pending: id, saved: false, error: null, loading: false });
      try {
        const dismissed = await service.dismiss(id);
        if (!active()) return false;
        if (dismissed.diaryId !== target.diaryId) throw new ReminderFailure('uncertain');
        update({ items: state.items!.filter(item => item.id !== id && !(isReminderRoot(target) && item.diaryId === target.diaryId && item.parentId === id)), saved: true });
        return true;
      } catch (error) {
        const failure = error instanceof ReminderFailure ? error : new ReminderFailure('uncertain');
        update({ error: failure, uncertainId: failure.kind === 'uncertain' ? id : null });
        return false;
      } finally { update({ pending: null }); }
    },
    dispose() { disposed = true; revision++; readController?.abort(); listeners.clear(); },
  };
  return manager;
}
