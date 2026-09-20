import type { createApiClient } from '@diary/api-client';
import type { createDiaryAccess } from '../diaries/access';
import { createReviewApi } from './api';
import { createReviewController, type ReviewController } from './controller';
import type { ReviewRepository } from './repository';

export type ReviewManager = ReturnType<typeof createReviewManager>;
export function createReviewManager(options: { api: ReturnType<typeof createApiClient>; diaries: ReturnType<typeof createDiaryAccess>;
  scope: string; repository(): Promise<ReviewRepository>; attemptId(): string }) {
  const controllers = new Map<string, ReviewController>();
  let owner = options.diaries.getScope();
  const clear = () => { controllers.forEach(controller => { void controller.flush().catch(() => {}); controller.invalidate(); }); controllers.clear(); };
  options.diaries.subscribe(() => { clear(); owner = options.diaries.getScope(); });
  return {
    open(id: string) {
      if (!owner?.isCurrent()) return null;
      let controller = controllers.get(id);
      if (controller?.getSnapshot().confirmed) { controller.invalidate(); controllers.delete(id); controller = undefined; }
      if (!controller) {
        const expected = owner;
        controller = createReviewController({ scope: options.scope, diaryId: id, repository: options.repository(), attemptId: options.attemptId,
          api: createReviewApi(options.api, owner, id, () => options.diaries.changed(expected)) });
        controllers.set(id, controller); void controller.start();
      }
      return controller;
    },
    async hasDraft(id: string) {
      const expected = owner;
      if (!expected) return false;
      const active = controllers.get(id)?.getSnapshot();
      if (active?.draft && !active.confirmed && active.draft.revision > 0) return true;
      const draft = await (await options.repository()).load(options.scope, expected.ownerId, id);
      return expected === owner && expected.isCurrent() && !!draft && !draft.confirmed;
    },
    async flush() { await Promise.all([...controllers.values()].map(controller => controller.flush())); },
    async hasAny() {
      const expected = owner; if (!expected) return false;
      await Promise.all([...controllers.values()].map(controller => controller.flush()));
      const result = await (await options.repository()).hasAny(options.scope, expected.ownerId);
      return expected === owner && expected.isCurrent() && result;
    },
    async discard(id: string) {
      const controller = controllers.get(id); if (!controller) return;
      await controller.discard(); if (controllers.get(id) === controller) controllers.delete(id);
    },
    async discardOwner() {
      const expected = owner; if (!expected) return;
      if ([...controllers.values()].some(controller => controller.getSnapshot().busy)) throw new Error('Wait for the current review operation');
      await Promise.all([...controllers.values()].map(controller => controller.flush()));
      if (expected !== owner || !expected.isCurrent()) return;
      clear(); await (await options.repository()).removeOwner(options.scope, expected.ownerId);
    },
  };
}
