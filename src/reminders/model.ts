import { z } from 'zod';
import { alertDraftSchema, type AlertResponse, type AlertDraft } from '@diary/contracts/alerts';
import { instantEditFromInstant, localTimezone, resolveLocalTradeInstant } from '../diary-editor/trade-time';

export const reminderRowSchema = z.object({
  key: z.string(), message: z.string().max(500), time: z.string().max(32), instant: z.string().max(40),
  timeZone: z.string().max(128), mode: z.enum(['', 'WEEK', 'MONTH']),
}).strict();
export type ReminderRow = z.infer<typeof reminderRowSchema>;
export const reminderEditorSchema = z.object({
  rows: z.array(reminderRowSchema).max(50), original: z.array(alertDraftSchema).max(50),
}).strict();
export type ReminderEditor = z.infer<typeof reminderEditorSchema>;

export function isReminderRoot(row: AlertResponse) {
  return row.recurringMode !== null && row.instanceNumber === 1 && (row.parentId === null || row.parentId === row.id);
}
export function reminderFields(rows: AlertResponse[], timeZone = localTimezone()): ReminderEditor {
  const roots = rows.filter(row => !row.isDismissed && (!row.recurringMode || isReminderRoot(row)));
  return { rows: roots.map(row => {
    const edit = instantEditFromInstant(row.triggerAt, timeZone);
    return { key: row.id, message: row.message, time: edit.value, instant: edit.instant, timeZone, mode: row.recurringMode ?? '' };
  }), original: roots.map(row => ({ message: row.message, triggerAt: row.triggerAt, ...(row.recurringMode ? { recurringMode: row.recurringMode } : {}) })) };
}

/** Omitting unchanged reminders preserves server IDs, dismissed children and series state. */
export function reminderPayload(editor: ReminderEditor | undefined): AlertDraft[] | undefined {
  if (!editor) return undefined; // Drafts written before reminder authoring must not clear server records.
  const drafts = editor.rows.map(row => alertDraftSchema.parse({ message: row.message,
    triggerAt: resolveLocalTradeInstant(row.time, row.instant, row.timeZone), ...(row.mode ? { recurringMode: row.mode } : {}) }));
  return JSON.stringify(drafts) === JSON.stringify(editor.original) ? undefined : drafts;
}

/** The server owns recurring materialization; verify returned series identities/content and exact one-off instants. */
export function reminderResponseMatches(actual: AlertResponse[], expected: AlertDraft[]) {
  if (actual.some(row => row.isDismissed)) return false;
  const roots = actual.filter(row => !row.recurringMode || isReminderRoot(row));
  const remaining = [...roots];
  for (const draft of expected) {
    const index = remaining.findIndex(row => row.message === draft.message && row.recurringMode === (draft.recurringMode ?? null)
      && (draft.recurringMode || row.triggerAt === draft.triggerAt));
    if (index < 0) {
      // A monthly start after the final weekday intentionally creates no records.
      if (draft.recurringMode === 'MONTH') continue;
      return false;
    }
    remaining.splice(index, 1);
  }
  return remaining.length === 0 && actual.every(row => !row.recurringMode || isReminderRoot(row)
    || roots.some(root => root.id === row.parentId && root.diaryId === row.diaryId && root.message === row.message && root.recurringMode === row.recurringMode));
}
