import type { createApiClient } from '@diary/api-client';
import type { AuthLifecycle } from '../auth/lifecycle';
import type { createDiaryAccess } from '../diaries/access';
import { createQuickApi } from './api';
import { createQuickController, type QuickController } from './controller';
import type { DraftRepository } from './repository';
import { calendarDateInTimezone } from '@diary/domain';

export function createQuickManager(options: {
  api: ReturnType<typeof createApiClient>; lifecycle: AuthLifecycle; diaries: ReturnType<typeof createDiaryAccess>;
  scope: string; repository(): Promise<DraftRepository>; attemptId(): string;
}) {
  let controller: QuickController | null = null;
  let ownerScope = options.diaries.getScope();
  let loaded: Promise<void> = Promise.resolve();
  const listeners = new Set<() => void>();
  const update = () => {
    const next = options.diaries.getScope();
    if (next === ownerScope && controller) return;
    controller?.invalidate(); controller = null; ownerScope = next;
    const auth = options.lifecycle.getState();
    const user = auth.status === 'signed-in' || auth.status === 'recoverable-error' ? auth.user : null;
    if (next && user) {
      controller = createQuickController({ scope: options.scope, timezone: user.timezone,
        repository: options.repository(), attemptId: options.attemptId,
        api: createQuickApi(options.api, { ...next, changed: () => options.diaries.changed(next) }, options.lifecycle) });
      loaded = controller.start();
    }
    listeners.forEach(listener => listener());
  };
  options.diaries.subscribe(update);
  update();
  return {
    async begin(date?: string) {
      if (controller?.getSnapshot().confirmedId) { ownerScope = null; update(); }
      const expected = controller;
      await loaded;
      if (!expected || expected !== controller) return false;
      if (date) return expected.initializeDate(date);
      const auth = options.lifecycle.getState();
      const user = auth.status === 'signed-in' || auth.status === 'recoverable-error' ? auth.user : null;
      if (user && !expected.hasUnsent()) expected.initializeDate(calendarDateInTimezone(new Date(), user.timezone));
      return true;
    },
    getSnapshot: () => controller,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    async logout(confirm: () => Promise<boolean>, discardOtherDrafts?: () => Promise<void>) {
      const expected = controller;
      await loaded;
      if (expected !== controller) return;
      if (expected) {
        if (!expected.getSnapshot().ready || expected.getSnapshot().persistence === 'error') throw new Error('Cannot access the encrypted draft. Logout was stopped so it is not silently discarded.');
        if (expected.hasUnsent() && !await confirm()) return;
        if (expected !== controller) return;
        await discardOtherDrafts?.();
        if (expected !== controller) return;
        await expected.discard();
      }
      await options.lifecycle.logout();
    },
  };
}
