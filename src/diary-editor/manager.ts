import type { createApiClient } from '@diary/api-client';
import { calendarDateSchema } from '@diary/contracts';
import { calendarDateInTimezone } from '@diary/domain';
import type { AuthLifecycle } from '../auth/lifecycle';
import type { createDiaryAccess } from '../diaries/access';
import type { AuthoringDraftRepository } from '../drafts/repository';
import { createDiaryEditorApi } from './api';
import { createDiaryEditorController, type DiaryEditorController } from './controller';
import { editorDraftSchema } from './model';

export type DiaryEditorManager = ReturnType<typeof createDiaryEditorManager>;
export function createDiaryEditorManager(options: { api: ReturnType<typeof createApiClient>; lifecycle: AuthLifecycle;
  diaries: ReturnType<typeof createDiaryAccess>; scope: string; repository(): Promise<AuthoringDraftRepository>; attemptId(): string }) {
  const controllers = new Map<string, DiaryEditorController>();
  let owner = options.diaries.getScope();
  const clear = () => { controllers.forEach(controller => controller.invalidate()); controllers.clear(); };
  options.diaries.subscribe(() => { const next = options.diaries.getScope(); if (next !== owner) { clear(); owner = next; } });
  return {
    open(diaryId: string | null, requestedDate?: string) {
      if (!owner?.isCurrent()) return null;
      const auth = options.lifecycle.getState();
      const user = auth.status === 'signed-in' || auth.status === 'recoverable-error' ? auth.user : null;
      if (!user) return null;
      const today = calendarDateInTimezone(new Date(), user.timezone);
      const initialDate = calendarDateSchema.safeParse(requestedDate).success ? requestedDate! : today;
      const entityId = diaryId ? `diary:${diaryId}` : `new:${initialDate}`;
      let controller = controllers.get(entityId);
      if (!controller) {
        const expected = owner;
        const identity = { scope: options.scope, ownerId: owner.ownerId, entityType: 'diary-editor', entityId };
        const created = createDiaryEditorController({ scope: options.scope, identity, diaryId, initialDate,
          api: createDiaryEditorApi(options.api, owner, () => options.diaries.changed(expected)),
          repository: options.repository(), attemptId: options.attemptId,
          onDiscard: () => { if (controllers.get(entityId) === created) controllers.delete(entityId); } });
        controller = created;
        controllers.set(entityId, controller); void controller.start();
      }
      return controller;
    },
    async flush() { await Promise.all([...controllers.values()].map(controller => controller.flush())); },
    async hasDraft(id: string) {
      const expected = owner;
      if (!expected?.isCurrent()) return false;
      const active = controllers.get(`diary:${id}`)?.getSnapshot();
      if (active?.draft.revision && !active.confirmedId) return true;
      const identity = { scope: options.scope, ownerId: expected.ownerId, entityType: 'diary-editor', entityId: `diary:${id}` };
      try {
        const saved = await (await options.repository()).load(identity, { schemaVersion: 1, schema: editorDraftSchema });
        return expected === owner && expected.isCurrent() && !!saved && saved.data.revision > 0 && !saved.data.confirmedId;
      } catch { return false; }
    },
    invalidate() { clear(); },
  };
}
