import { z } from 'zod';
import { calendarDateSchema, createDiaryRequestSchema, diaryResponseSchema, serializedIdSchema, type DiaryResponse } from '@diary/contracts';
import { recentClosedTradeSchema } from '@diary/contracts/ledger';
import { calendarDateInTimezone, deriveQuickTitle, type QuickNoteTemplateKind } from '@diary/domain';

export const quickPayloadSchema = createDiaryRequestSchema.pick({ title: true, content: true, date: true, tags: true, stockSymbols: true, appendToToday: true });
export type QuickPayload = z.infer<typeof quickPayloadSchema>;
export const attemptSchema = z.object({
  id: z.string().min(1), at: z.string(), payload: quickPayloadSchema,
  baseline: diaryResponseSchema.nullable(),
}).strict();
const templateDataSchema = z.object({
  tradingType: z.string().max(20).optional(), symbols: z.string().max(1000).optional(), marketMood: z.string().max(20).optional(),
  note: z.string().max(10000).optional(), marketCondition: z.string().max(100).optional(), rating: z.number().int().min(0).max(5),
  noRashTrading: z.boolean(), goodPoints: z.string().max(10000).optional(), improvePoints: z.string().max(10000).optional(),
  topic: z.string().max(500).optional(), observationType: z.string().max(100).optional(), observationContent: z.string().max(10000).optional(),
  action: z.string().max(10000).optional(), relatedTrades: z.array(recentClosedTradeSchema).max(100),
}).strict();
export const draftSchema = z.object({
  schemaVersion: z.literal(1), scope: z.string().min(1), ownerId: serializedIdSchema,
  date: z.string().max(32), mode: z.enum(['create', 'append']), modeChosen: z.boolean(),
  title: z.string().max(500), content: z.string().max(500000),
  tags: z.string().max(6000), stockSymbols: z.string().max(1000), updatedAt: z.string(),
  templateKind: z.enum(['blank', 'trading', 'reflection', 'observation']).default('blank'),
  templateData: templateDataSchema.default({ rating: 0, noRashTrading: false, relatedTrades: [] }),
  appliedTemplate: z.string().max(500000).default(''),
  titleTouched: z.boolean().default(false),
  writeState: z.enum(['editing', 'saving', 'definitive-error', 'uncertain', 'confirmed']),
  attempt: attemptSchema.nullable(), confirmedId: serializedIdSchema.nullable(),
}).strict().superRefine((draft, ctx) => {
  if (['saving', 'uncertain'].includes(draft.writeState) && !draft.attempt) ctx.addIssue({ code: 'custom', message: 'Missing write attempt' });
  if (draft.writeState === 'confirmed' && (!draft.confirmedId || !draft.attempt)) ctx.addIssue({ code: 'custom', message: 'Missing confirmation' });
  if (['editing', 'definitive-error'].includes(draft.writeState) && (draft.attempt || draft.confirmedId)) ctx.addIssue({ code: 'custom', message: 'Unexpected attempt' });
  if (draft.attempt && (!draft.attempt.payload.date || draft.attempt.payload.date !== draft.date
    || (draft.attempt.baseline && (draft.attempt.baseline.userId !== draft.ownerId || draft.attempt.baseline.date !== draft.date)))) {
    ctx.addIssue({ code: 'custom', message: 'Invalid attempt identity' });
  }
});
export type QuickDraft = z.infer<typeof draftSchema>;
export type WriteAttempt = z.infer<typeof attemptSchema>;
export type { QuickNoteTemplateKind };
export function newDraft(scope: string, ownerId: string, timezone: string, now = new Date()): QuickDraft {
  return { schemaVersion: 1, scope, ownerId, date: calendarDateInTimezone(now, timezone), mode: 'create', modeChosen: false,
    title: '', content: '', tags: '', stockSymbols: '', updatedAt: now.toISOString(), templateKind: 'blank',
    templateData: { tradingType: '', symbols: '', marketMood: '', note: '', marketCondition: '', rating: 0, noRashTrading: false,
      goodPoints: '', improvePoints: '', topic: '', observationType: '', observationContent: '', action: '', relatedTrades: [] },
    appliedTemplate: '', titleTouched: false,
    writeState: 'editing', attempt: null, confirmedId: null };
}
export function payloadFor(draft: QuickDraft): QuickPayload {
  if (!draft.content.trim()) throw new Error('Content required');
  return quickPayloadSchema.parse({ title: draft.title.trim() || deriveQuickTitle(draft.content, draft.date),
    content: draft.content, date: calendarDateSchema.parse(draft.date), appendToToday: draft.mode === 'append',
    tags: draft.tags.split(',').map(value => value.trim()).filter(Boolean),
    stockSymbols: draft.stockSymbols.split(',').map(value => value.trim()).filter(Boolean) });
}
export function hasDraft(draft: QuickDraft) {
  return !!(draft.content || draft.title || draft.tags || draft.stockSymbols || draft.attempt || draft.templateKind !== 'blank'
    || draft.templateData.relatedTrades.length || Object.entries(draft.templateData).some(([key, value]) => key !== 'relatedTrades' && value !== '' && value !== false && value !== 0));
}
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const symbols = (values: string[]) => [...values].sort();
function comparable(diary: DiaryResponse) {
  const { updatedAt: _updatedAt, tradePlans: _plans, tradePlanSummary: _summary, ...fields } = diary;
  return { ...fields, stockSymbols: symbols(diary.stockSymbols) };
}
export function reconcile(attempt: WriteAttempt, latest: DiaryResponse | null): 'applied' | 'pending' | 'ambiguous' {
  const { baseline, payload } = attempt;
  // A read is a snapshot, not a fence against a request still committing.
  if (!latest) return baseline === null ? 'pending' : 'ambiguous';
  if (baseline && same(latest, baseline)) return 'pending';
  if (!baseline) {
    if (latest.date === payload.date && latest.title === payload.title && latest.content === payload.content
      && same(latest.tags, payload.tags ?? []) && same(symbols(latest.stockSymbols), symbols(payload.stockSymbols ?? []))
      && latest.createdVia === 'WEB' && latest.createdByLabel === null
      && !latest.transactions?.length && !latest.alerts?.length && !latest.thesis && !latest.risk && !latest.execution
      && !latest.reviewDueAt && (!latest.reviewStatus || latest.reviewStatus === 'none')
      && latest.createdAt === latest.updatedAt) return 'applied';
    return 'ambiguous';
  }
  if (!payload.appendToToday) return 'ambiguous';
  const tags = [...new Set([...baseline.tags, ...(payload.tags ?? [])])];
  const expected: DiaryResponse = { ...baseline, content: `${baseline.content}\n\n---\n\n${payload.content}`, tags,
    tagsString: tags.length ? tags.join(',') : null, stockSymbols: [...new Set([...baseline.stockSymbols, ...(payload.stockSymbols ?? [])])] };
  return same(comparable(latest), comparable(expected)) ? 'applied' : 'ambiguous';
}
