import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createApiClient, createNativeSession } from '@diary/api-client';
import { diaryResponseSchema } from '@diary/contracts';
import { reminderService } from '../../src/reminders/service';
import { reminderFields, reminderPayload } from '../../src/reminders/model';
import { createReminderManager } from '../../src/reminders/manager';
import { createDiaryEditorApi } from '../../src/diary-editor/api';
import { baselineFor, fieldsFor, payloadFor } from '../../src/diary-editor/model';
import type { DiaryReadScope } from '../../src/diaries/access';

const baseUrl = process.env.DIARY_API_BASE_URL;
const enabled = process.env.DIARY_DISPOSABLE_TEST_ENV === '1' && !!baseUrl;
async function owner() {
  const id = randomUUID();
  const transport: typeof fetch = (input, init) => { const request = new Request(input, init);
    request.headers.set('x-e2e-test-id', id); request.headers.set('x-forwarded-for', `fd00:${id.slice(0, 4)}:${id.slice(4, 8)}::1`); return fetch(request); };
  const credentials = { email: `reminders-${id}@example.test`, password: 'SyntheticReminders2026' };
  expect((await transport(`${baseUrl}/api/auth/register`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(credentials) })).status).toBe(200);
  let stored: Awaited<ReturnType<ReturnType<typeof createNativeSession>['login']>> | null = null;
  const native = createNativeSession({ baseUrl: baseUrl!, fetch: transport, storage: { get: () => stored, set: value => { stored = value; }, clear: () => { stored = null; } } });
  await native.login(credentials);
  const api = createApiClient({ baseUrl: baseUrl!, fetch: native.fetch });
  return { native, api, reminders: reminderService(api, { isCurrent: () => true }) };
}
describe.runIf(enabled)('Disposable Diary reminders acceptance', () => {
  it('creates/edits precise single and WEEK/MONTH schedules, preserves unchanged IDs/dismissals, and enforces ownership', async () => {
    const a = await owner(), b = await owner(); let diaryId: string | undefined;
    try {
      expect((await a.api.PUT('/api/user/settings', { body: { timezone: 'America/New_York' } })).response.ok).toBe(true);
      const created = await a.api.POST('/api/diaries', { body: { title: 'Synthetic reminder decisions', content: 'Synthetic private body', date: '2026-03-02', alerts: [
        { message: 'Weekly report', triggerAt: '2026-03-07T12:00:00.000Z', recurringMode: 'WEEK' },
        { message: 'Monthly report', triggerAt: '2026-03-30T12:00:00.000Z', recurringMode: 'MONTH' },
        { message: 'One-off', triggerAt: '2026-11-01T06:30:42.123Z' },
      ] } });
      expect(created.response.status).toBe(201);
      const diary = diaryResponseSchema.parse(created.data); diaryId = diary.id;
      const initial = await a.reminders.read(); expect(initial).toHaveLength(8);
      expect(initial.filter(row => row.recurringMode === 'WEEK').map(row => row.triggerAt)).toEqual(['2026-03-09T13:00:00.000Z', '2026-03-10T13:00:00.000Z', '2026-03-11T13:00:00.000Z', '2026-03-12T13:00:00.000Z', '2026-03-13T13:00:00.000Z']);
      expect(initial.filter(row => row.recurringMode === 'MONTH').map(row => row.triggerAt)).toEqual(['2026-03-30T13:00:00.000Z', '2026-03-31T13:00:00.000Z']);
      expect(initial.every(row => row.diary?.id === diaryId && row.diary?.title === diary.title)).toBe(true);
      expect(await b.reminders.read()).toEqual([]);
      await expect(b.reminders.dismiss(initial[0]!.id)).rejects.toMatchObject({ kind: 'rejected', code: 'ALERT_NOT_FOUND' });
      expect((await b.api.POST('/api/alerts', { body: { diaryId, message: 'Forbidden', triggerAt: '2026-01-01T00:00:00Z' } })).response.status).toBe(404);
      const child = initial.find(row => row.recurringMode === 'WEEK' && row.instanceNumber === 2)!;
      await a.reminders.dismiss(child.id); expect(await a.reminders.read()).toHaveLength(7);
      const detail = diaryResponseSchema.parse((await a.api.GET('/api/diaries/{id}', { params: { path: { id: diaryId } } })).data);
      expect(reminderPayload(reminderFields(detail.alerts ?? [], 'America/New_York'))).toBeUndefined();
      const update = await a.api.PUT('/api/diaries/{id}', { params: { path: { id: diaryId } }, body: { title: 'Title only', content: diary.content ?? '' } });
      expect(update.response.ok).toBe(true);
      const preserved = diaryResponseSchema.parse(update.data);
      expect(preserved.alerts?.map(row => row.id)).toEqual(detail.alerts?.map(row => row.id));
      expect(preserved.alerts?.find(row => row.id === child.id)?.isDismissed).toBe(true);
      const root = initial.find(row => row.recurringMode === 'WEEK' && row.instanceNumber === 1)!;
      await a.reminders.dismiss(root.id); expect(await a.reminders.read()).toHaveLength(3);
      const fields = reminderFields(preserved.alerts ?? [], 'America/New_York');
      fields.rows = fields.rows.filter(row => !row.mode); fields.rows[0]!.message = 'Edited exact instant';
      const editorFields = fieldsFor(baselineFor(preserved)); editorFields.reminders = fields;
      const editorApi = createDiaryEditorApi(a.api, { ownerId: diary.userId, isCurrent: () => true } as DiaryReadScope, () => {});
      const changed = await editorApi.write('update', diaryId, payloadFor(editorFields));
      expect(changed.ok).toBe(true);
      if (!changed.ok) throw new Error('Synthetic reminder edit was rejected');
      expect(changed.diary.alerts).toHaveLength(1);
      expect((await a.reminders.read())[0]).toMatchObject({ message: 'Edited exact instant', triggerAt: '2026-11-01T06:30:42.123Z' });
      const rejected = await a.api.PUT('/api/diaries/{id}', { params: { path: { id: diaryId } }, body: {
        title: 'Must not change', content: 'Must not change', alerts: [{ message: '', triggerAt: '2026-11-01T06:30:42.123Z' }],
      } });
      expect(rejected.response.status).toBe(400);
      expect(diaryResponseSchema.parse((await a.api.GET('/api/diaries/{id}', { params: { path: { id: diaryId } } })).data)).toMatchObject({ title: 'Title only', content: diary.content });
      let dismissAttempts = 0;
      const lossyApi = createApiClient({ baseUrl: baseUrl!, fetch: async (input, init) => {
        const request = new Request(input, init); const response = await a.native.fetch(request);
        if (request.method === 'PUT' && new URL(request.url).pathname.endsWith('/dismiss')) { dismissAttempts++; throw new TypeError('Synthetic lost dismissal response'); }
        return response;
      } });
      const manager = createReminderManager(reminderService(lossyApi, { isCurrent: () => true }), () => true);
      await manager.refresh(); const attempted = manager.getSnapshot().items![0]!.id;
      expect(await manager.dismiss(attempted)).toBe(false);
      expect(manager.getSnapshot().items).toHaveLength(1);
      await manager.refresh(); expect(manager.getSnapshot().items).toEqual([]);
      expect(manager.getSnapshot().uncertainId).toBe(attempted);
      await manager.dismiss(attempted); expect(dismissAttempts).toBe(1);
      const empty = await a.api.PUT('/api/diaries/{id}', { params: { path: { id: diaryId } }, body: { title: 'Title only', content: diary.content ?? '', alerts: [{ message: 'Empty month', triggerAt: '2026-05-31T12:00:00Z', recurringMode: 'MONTH' }] } });
      expect(empty.response.ok).toBe(true); expect(await a.reminders.read()).toEqual([]);
    } finally {
      if (diaryId) expect((await a.api.DELETE('/api/diaries/{id}', { params: { path: { id: diaryId } } })).response.ok).toBe(true);
      await a.native.logout(); await b.native.logout();
    }
  });
});

