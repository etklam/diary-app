import type { PartnerLinkResponse } from '@diary/contracts/partners';
import { invitePartnerSchema, updatePartnerSharingSchema } from '@diary/contracts/partners';
import { PartnerFailure, type PartnerService } from './service';

export type PartnerState = {
  links: PartnerLinkResponse[] | null;
  loading: boolean;
  busy: boolean;
  saved: boolean;
  error: PartnerFailure | null;
  mutationUncertain: boolean;
};
const empty: PartnerState = { links: null, loading: false, busy: false, saved: false, error: null, mutationUncertain: false };

export function createPartnerManager(service: PartnerService, isCurrent: () => boolean) {
  let state = empty;
  let disposed = false;
  let revision = 0;
  let readController: AbortController | null = null;
  let mutationController: AbortController | null = null;
  const listeners = new Set<() => void>();
  const current = () => !disposed && isCurrent();
  const update = (next: Partial<PartnerState>) => {
    if (!current()) return;
    state = { ...state, ...next };
    listeners.forEach(listener => listener());
  };

  const manager = {
    getSnapshot: () => state,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    async refresh(explicit = true) {
      disposed = false;
      if (state.busy) return;
      const expected = ++revision;
      readController?.abort();
      const controller = new AbortController(); readController = controller;
      update({ loading: true, error: null });
      try {
        const result = await service.read(controller.signal);
        if (!current()) return;
        if (expected === revision && !controller.signal.aborted) update({ links: result.links, loading: false, error: null, mutationUncertain: explicit ? false : state.mutationUncertain });
      } catch (error) {
        if (expected === revision && !controller.signal.aborted && current()) update({ loading: false, error: error instanceof PartnerFailure ? error : new PartnerFailure('uncertain') });
      } finally { if (readController === controller) readController = null; }
    },
    async invite(email: string) {
      if (state.busy || state.mutationUncertain || state.error?.kind === 'session') return false;
      const parsed = invitePartnerSchema.safeParse({ partnerEmail: email });
      if (!parsed.success) { update({ error: new PartnerFailure('rejected', 'SYS_VALIDATION_ERROR'), saved: false }); return false; }
      return mutate(() => service.invite(parsed.data.partnerEmail));
    },
    async accept(id: string) {
      if (state.busy || state.mutationUncertain || state.error?.kind === 'session') return false;
      const link = state.links?.find(row => row.id === id);
      if (!link || link.status !== 'pending_incoming') return false;
      return mutate(() => service.accept(id));
    },
    async setSharing(id: string, field: 'shareDiaries' | 'shareStockNotes', value: boolean) {
      if (state.busy || state.mutationUncertain || state.error?.kind === 'session') return false;
      const link = state.links?.find(row => row.id === id);
      if (!link || link.status !== 'connected') return false;
      const input = updatePartnerSharingSchema.parse({ [field]: value });
      return mutate(() => service.updateSharing(id, input));
    },
    async remove(id: string) {
      if (state.busy || state.mutationUncertain || state.error?.kind === 'session') return false;
      const link = state.links?.find(row => row.id === id);
      if (!link) return false;
      const success = await runMutation(() => service.remove(id));
      if (success) {
        update({ links: state.links?.filter(row => row.id !== id) ?? null, saved: true, error: null });
        void manager.refresh();
      }
      return success;
    },
    dispose() { disposed = true; revision++; readController?.abort(); mutationController?.abort(); listeners.clear(); },
  };
  return manager;

  async function mutate(action: () => Promise<PartnerLinkResponse>) {
    const success = await runMutation(action);
    if (success) { update({ saved: true, error: null }); void manager.refresh(); }
    return success;
  }

  async function runMutation<T>(action: () => Promise<T>) {
    if (!current()) return false;
    mutationController = new AbortController();
    update({ busy: true, error: null, saved: false });
    try { await action(); if (!current()) return false; return true; }
    catch (error) {
      if (current()) {
        const failure = error instanceof PartnerFailure ? error : new PartnerFailure('uncertain');
        update({ error: failure, mutationUncertain: failure.kind === 'uncertain' });
      }
      return false;
    } finally { mutationController = null; if (current()) update({ busy: false }); }
  }
}
