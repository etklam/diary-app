import { describe, expect, it, vi } from 'vitest';
import { alertResponseSchema } from '@diary/contracts/alerts';
import { calculateRecurringAlertDates } from '@diary/domain/recurring-alerts';
import { reminderFields, reminderPayload } from '../../src/reminders/model';
import { reminderService, ReminderFailure } from '../../src/reminders/service';
import { createReminderManager } from '../../src/reminders/manager';
import { safeContinuation } from '../../src/navigation/continuation';
import { translate } from '../../src/preferences/translations';

const row = (overrides = {}) => alertResponseSchema.parse({ id: '1', diaryId: '9', message: 'Read report', triggerAt: '2026-11-01T06:30:42.123Z',
  isDismissed: false, recurringMode: null, parentId: null, instanceNumber: 1, isPaused: false,
  createdAt: '2026-01-01T00:00:00.000Z', diary: { id: '9', title: 'Synthetic' }, ...overrides });

describe('Diary reminders', () => {
  it('omits unchanged schedules, preserves fractional repeated-hour instants, and explicitly clears all reminders', () => {
    const fields = reminderFields([row(), row({ id: '2', isDismissed: true })], 'America/New_York');
    expect(fields.rows).toHaveLength(1);
    expect(reminderPayload(fields)).toBeUndefined();
    fields.rows[0]!.message = 'Changed message';
    expect(reminderPayload(fields)).toEqual([{ message: 'Changed message', triggerAt: '2026-11-01T06:30:42.123Z' }]);
    fields.rows = [];
    expect(reminderPayload(fields)).toEqual([]);
    expect(reminderPayload(undefined)).toBeUndefined();
  });
  it('rejects DST gaps and requires explicit repeated-hour choice', () => {
    const fields = reminderFields([row()], 'America/New_York');
    fields.rows[0]!.time = '2026-03-08T02:30'; fields.rows[0]!.instant = '';
    expect(() => reminderPayload(fields)).toThrow();
    fields.rows[0]!.time = '2026-11-01T01:30';
    expect(() => reminderPayload(fields)).toThrow();
    fields.rows[0]!.instant = '2026-11-01T05:30:00.000Z';
    expect(reminderPayload(fields)?.[0]?.triggerAt).toBe('2026-11-01T05:30:00.000Z');
  });
  it('uses canonical account-local weekday/cutoff behavior across DST and month end', () => {
    const config = { diaryId: 9n, message: 'Synthetic', timezone: 'America/New_York', mode: 'WEEK' as const, startDate: new Date('2026-03-07T12:00:00Z') };
    expect(calculateRecurringAlertDates(config).map(date => date.toISOString())).toEqual([
      '2026-03-09T13:00:00.000Z', '2026-03-10T13:00:00.000Z', '2026-03-11T13:00:00.000Z', '2026-03-12T13:00:00.000Z', '2026-03-13T13:00:00.000Z',
    ]);
    expect(calculateRecurringAlertDates({ ...config, mode: 'MONTH', startDate: new Date('2026-05-31T12:00:00Z') })).toEqual([]);
    expect(calculateRecurringAlertDates({ ...config, startDate: new Date('2026-03-13T23:30:00Z') }).map(date => date.toISOString())).toEqual(['2026-03-13T13:00:00.000Z']);
  });
  it('retains dismissed child state by omitting an untouched recurring root', () => {
    const fields = reminderFields([row({ recurringMode: 'WEEK', parentId: '1' }), row({ id: '2', recurringMode: 'WEEK', parentId: '1', instanceNumber: 2, isDismissed: true })]);
    expect(fields.rows).toHaveLength(1); expect(reminderPayload(fields)).toBeUndefined();
  });
  it('removes one child or the entire root series only after a confirmed dismissal', async () => {
    const root = row({ recurringMode: 'WEEK', parentId: '1' });
    const child = row({ id: '2', recurringMode: 'WEEK', parentId: '1', instanceNumber: 2 });
    const single = row({ id: '3' });
    const service = { read: async () => [root, child, single], dismiss: vi.fn(async (id: string) => ({ ...[root, child, single].find(item => item.id === id)!, isDismissed: true })) };
    const manager = createReminderManager(service, () => true);
    await manager.refresh(); await manager.dismiss('2'); expect(manager.getSnapshot().items?.map(item => item.id)).toEqual(['1', '3']);
    await manager.refresh(); await manager.dismiss('1'); expect(manager.getSnapshot().items?.map(item => item.id)).toEqual(['3']);
  });
  it('keeps an uncertain dismissal locked across successful refresh and suppresses owner-stale responses', async () => {
    let current = true;
    const dismiss = vi.fn(async () => { throw new ReminderFailure('uncertain'); });
    const manager = createReminderManager({ read: async () => [row()], dismiss }, () => current);
    await manager.refresh(); expect(await manager.dismiss('1')).toBe(false);
    await manager.refresh(); await manager.dismiss('1');
    expect(dismiss).toHaveBeenCalledTimes(1); expect(manager.getSnapshot().uncertainId).toBe('1');
    current = false; await manager.refresh(); expect(manager.getSnapshot().items).toHaveLength(1);
    let finish!: (value: ReturnType<typeof row>[]) => void;
    current = true;
    const late = createReminderManager({ read: () => new Promise(resolve => { finish = resolve; }), dismiss }, () => current);
    const read = late.refresh(); current = false; finish([row()]); await read;
    expect(late.getSnapshot().items).toBeNull();
  });
  it('marks writes against automatic auth retries and rejects mismatched success identities', async () => {
    const put = vi.fn(async () => ({ response: new Response(null, { status: 200 }), data: row({ id: '99', isDismissed: true }) }));
    const service = reminderService({ PUT: put } as never, { isCurrent: () => true });
    await expect(service.dismiss('1')).rejects.toMatchObject({ kind: 'uncertain' });
    expect(put.mock.calls[0]).toMatchObject(['/api/alerts/{id}/dismiss', { headers: { 'x-diary-no-automatic-session-retry': '1' } }]);
    expect(safeContinuation('/alerts')).toBe('/alerts');
    expect(translate('Diary reminders', 'zh-TW')).toBe('日記提醒');
    expect(translate('Diary reminders', 'zh-CN')).toBe('日记提醒');
  });
});
