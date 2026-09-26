import { z } from 'zod';
import { calendarDateSchema, createDiaryRequestSchema, diaryResponseSchema, serializedIdSchema } from '@diary/contracts';
import { ledgerTransactionResponseSchema, ledgerTransactionUpdateInputSchema } from '@diary/contracts/ledger';
import { alertDraftSchema, alertResponseSchema } from '@diary/contracts/alerts';
import { reminderEditorSchema, reminderFields, reminderPayload, reminderResponseMatches } from '../reminders/model';
import { instantEditFromInstant, localTimezone, resolveLocalTradeInstant } from './trade-time';

export const editorTransactionDraftSchema = z.object({
  key: z.string().min(1), id: serializedIdSchema.optional(), type: z.enum(['BUY', 'SELL']),
  symbol: z.string().max(20), quantity: z.string().max(64), price: z.string().max(64),
  tradeDate: z.string().max(32), instant: z.string().max(40), timeZone: z.string().max(128).default(''),
  notes: z.string().max(10_000), strategy: z.string().max(100), emotion: z.string().max(20),
}).strict();
export type EditorTransactionDraft = z.infer<typeof editorTransactionDraftSchema>;

export const editorFieldsSchema = z.object({
  date: z.string().max(32),
  title: z.string().max(500),
  content: z.string().max(500000),
  tags: z.string().max(6000),
  stockSymbols: z.string().max(1000),
  thesis: z.string().max(10000),
  risk: z.string().max(10000),
  execution: z.string().max(10000),
  // Defaults keep encrypted schema-v1 drafts written before BUY authoring readable.
  transactions: z.array(editorTransactionDraftSchema).max(100).default([]),
  // Absent in older drafts; do not interpret absence as clearing saved reminders.
  reminders: reminderEditorSchema.optional(),
}).strict();
export type EditorFields = z.infer<typeof editorFieldsSchema>;
export type EditorFieldsInput = z.input<typeof editorFieldsSchema>;

export const editorPayloadSchema = createDiaryRequestSchema.pick({ title: true, content: true, date: true, tags: true,
  stockSymbols: true, thesis: true, risk: true, execution: true }).extend({ date: calendarDateSchema,
  transactions: z.array(ledgerTransactionUpdateInputSchema).max(100).optional(),
  alerts: z.array(alertDraftSchema).max(50).optional() });
export type EditorPayload = z.infer<typeof editorPayloadSchema>;
export const editorBaselineSchema = diaryResponseSchema.pick({ id: true, userId: true, date: true, title: true, content: true,
  tags: true, stockSymbols: true, thesis: true, risk: true, execution: true, updatedAt: true,
  transactions: true }).extend({ transactions: z.array(ledgerTransactionResponseSchema).default([]),
  alerts: z.array(alertResponseSchema).optional() });
export type EditorBaseline = z.infer<typeof editorBaselineSchema>;

export function fieldsFor(diary: EditorBaseline): EditorFields {
  return { date: diary.date, title: diary.title, content: diary.content ?? '', tags: diary.tags.join(', '),
    stockSymbols: diary.stockSymbols.join(', '), thesis: diary.thesis ?? '', risk: diary.risk ?? '', execution: diary.execution ?? '',
    reminders: reminderFields(diary.alerts ?? []),
    transactions: diary.transactions.map(transaction => {
      const edit = instantEditFromInstant(transaction.tradeDate);
      return { key: `saved-${transaction.id}`, id: transaction.id, type: transaction.type,
        symbol: transaction.symbol, quantity: transaction.quantity, price: transaction.price,
        tradeDate: edit.value, instant: edit.instant, timeZone: edit.timeZone, notes: transaction.notes ?? '',
        strategy: transaction.strategy ?? '', emotion: transaction.emotion ?? '' };
    }) };
}

export function payloadFor(fields: EditorFieldsInput): EditorPayload {
  const alerts = reminderPayload(fields.reminders);
  // The update endpoint replaces the complete collection. Include existing rows by ID
  // only when a new row is being added, so other trade types survive unchanged.
  const transactionRows = fields.transactions ?? [];
  const hasNewTransaction = transactionRows.some(transaction => !transaction.id);
  const transactions = hasNewTransaction ? transactionRows.map(row => ledgerTransactionUpdateInputSchema.parse({
    ...(row.id ? { id: row.id } : {}), type: row.type, symbol: row.symbol,
    quantity: row.quantity, price: row.price,
    tradeDate: resolveLocalTradeInstant(row.tradeDate, row.instant, row.timeZone || localTimezone()),
    notes: row.notes === '' ? null : row.notes,
    strategy: row.strategy === '' ? null : row.strategy,
    emotion: row.emotion === '' ? null : row.emotion,
  })) : undefined;
  return editorPayloadSchema.parse({
    date: calendarDateSchema.parse(fields.date), title: fields.title.trim(), content: fields.content,
    tags: fields.tags.split(',').map(value => value.trim()).filter(Boolean),
    stockSymbols: fields.stockSymbols.split(',').map(value => value.trim()).filter(Boolean),
    thesis: fields.thesis.trim() || null, risk: fields.risk.trim() || null, execution: fields.execution.trim() || null,
    ...(transactions ? { transactions } : {}),
    ...(alerts !== undefined ? { alerts } : {}),
  });
}

export const editorAttemptSchema = z.object({
  id: z.string().min(1), mode: z.enum(['create', 'update']), diaryId: serializedIdSchema.nullable(),
  payload: editorPayloadSchema, baseline: editorBaselineSchema.nullable(),
}).strict().superRefine((attempt, ctx) => {
  if ((attempt.mode === 'create') !== (attempt.diaryId === null)) ctx.addIssue({ code: 'custom', message: 'Invalid write target' });
  if ((attempt.mode === 'create') !== (attempt.baseline === null)) ctx.addIssue({ code: 'custom', message: 'Invalid write baseline' });
  if (attempt.baseline && attempt.baseline.id !== attempt.diaryId) ctx.addIssue({ code: 'custom', message: 'Invalid baseline identity' });
});

export const editorDraftSchema = z.object({
  schema: z.literal(1), scope: z.string().min(1), ownerId: serializedIdSchema,
  revision: z.number().int().nonnegative(), fields: editorFieldsSchema,
  baseline: editorBaselineSchema.nullable(), attempt: editorAttemptSchema.nullable(),
  confirmedId: serializedIdSchema.nullable(),
}).strict().superRefine((draft, ctx) => {
  if (draft.attempt && draft.confirmedId && draft.confirmedId !== (draft.attempt.diaryId ?? draft.confirmedId)) {
    ctx.addIssue({ code: 'custom', message: 'Invalid confirmation identity' });
  }
});
export type EditorDraft = z.infer<typeof editorDraftSchema>;

export function baselineFor(diary: ReturnType<typeof diaryResponseSchema.parse>): EditorBaseline {
  return editorBaselineSchema.parse({ id: diary.id, userId: diary.userId, date: diary.date, title: diary.title, content: diary.content,
    tags: diary.tags, stockSymbols: diary.stockSymbols, thesis: diary.thesis, risk: diary.risk, execution: diary.execution,
    transactions: diary.transactions ?? [], alerts: diary.alerts ?? [], updatedAt: diary.updatedAt });
}
export const sameBaseline = (a: EditorBaseline | null, b: EditorBaseline | null) => {
  // Older drafts did not capture alerts and cannot edit them. Compare the fields they knew.
  if (a && b && (a.alerts === undefined || b.alerts === undefined)) {
    return JSON.stringify({ ...a, alerts: undefined }) === JSON.stringify({ ...b, alerts: undefined });
  }
  return JSON.stringify(a) === JSON.stringify(b);
};

export function responseMatches(diary: ReturnType<typeof diaryResponseSchema.parse>, payload: EditorPayload, ownerId: string) {
  return diary.userId === ownerId && diary.date === payload.date && diary.title === payload.title && diary.content === payload.content
    && sameArray(diary.tags, payload.tags ?? []) && sameArray(diary.stockSymbols, payload.stockSymbols ?? [])
    && diary.thesis === (payload.thesis ?? null) && diary.risk === (payload.risk ?? null) && diary.execution === (payload.execution ?? null)
    && (payload.transactions === undefined || transactionRowsMatch(diary.transactions ?? [], payload.transactions))
    && (payload.alerts === undefined || reminderResponseMatches(diary.alerts ?? [], payload.alerts));
}
const sameArray = (a: string[], b: string[]) => a.length === b.length && a.every((value, index) => value === b[index]);

function transactionRowsMatch(actual: ReturnType<typeof ledgerTransactionResponseSchema.parse>[], expected: EditorPayload['transactions']) {
  if (!expected || actual.length !== expected.length) return false;
  const unused = [...actual];
  return expected.every(row => {
    const index = unused.findIndex(saved => (!row.id || row.id === saved.id) && saved.type === row.type
      && saved.symbol === row.symbol && saved.quantity === row.quantity && saved.price === row.price
      && saved.tradeDate === row.tradeDate && (saved.notes ?? null) === (row.notes ?? null)
      && (saved.strategy ?? null) === (row.strategy ?? null) && (saved.emotion ?? null) === (row.emotion ?? null));
    if (index < 0) return false;
    unused.splice(index, 1);
    return true;
  });
}

export function reconcile(attempt: z.infer<typeof editorAttemptSchema>, latest: ReturnType<typeof diaryResponseSchema.parse> | null, ownerId: string) {
  if (!latest) return attempt.mode === 'create' ? 'pending' as const : 'ambiguous' as const;
  if (attempt.mode === 'create') return responseMatches(latest, attempt.payload, ownerId) ? 'matches' as const : 'ambiguous' as const;
  if (!attempt.baseline || latest.id !== attempt.diaryId || latest.userId !== ownerId) return 'ambiguous' as const;
  const next = baselineFor(latest);
  if (sameBaseline(next, attempt.baseline)) return 'pending' as const;
  return responseMatches(latest, attempt.payload, ownerId) ? 'matches' as const : 'ambiguous' as const;
}
