import { tradePlanInputSchema, tradePlanListQuerySchema, type TradePlanResponse } from '@diary/contracts/trade-plan';

export const planFields = ['symbol', 'status', 'setupType', 'entryPrice', 'entryZoneLow', 'entryZoneHigh', 'stopLoss', 'targetPrice', 'maxPositionSize', 'diaryId', 'invalidationCondition', 'notes'] as const;
export type PlanField = typeof planFields[number];
export type PlanForm = Record<PlanField, string>;
export const emptyPlanForm = (): PlanForm => ({ symbol: '', status: 'draft', setupType: '', entryPrice: '', entryZoneLow: '', entryZoneHigh: '', stopLoss: '', targetPrice: '', maxPositionSize: '', diaryId: '', invalidationCondition: '', notes: '' });
export function formFromPlan(plan: TradePlanResponse): PlanForm {
  return Object.fromEntries(planFields.map(field => [field, plan[field] ?? ''])) as PlanForm;
}
export function parsePlanForm(form: PlanForm) {
  return tradePlanInputSchema.safeParse(Object.fromEntries(planFields.map(field => [field, form[field] === '' && field !== 'symbol' && field !== 'status' ? null : form[field]])));
}
export function parsePlanFilters(input: { symbol: string; status: string; sortBy: string; page: number }) {
  return tradePlanListQuerySchema.safeParse({ symbol: input.symbol.trim() || undefined, status: input.status || undefined, sortBy: input.sortBy, page: input.page, limit: 20 });
}
export function samePlanWrite(result: TradePlanResponse, body: ReturnType<typeof tradePlanInputSchema.parse>, ownerId: string, id?: string) {
  return result.userId === ownerId && (!id || result.id === id) && planFields.every(field => (result[field] ?? null) === (body[field] ?? null));
}
