import { z } from 'zod';
import { diaryReviewResponseSchema, reviewOutcomeSchema, structuredReviewInputSchema } from '@diary/contracts/review';

export type ServerReview = z.infer<typeof diaryReviewResponseSchema>;
export const fieldsSchema = z.object({
  reviewOutcome: reviewOutcomeSchema.nullable(),
  reviewSummary: z.string().max(10000), reviewLearning: z.string().max(10000), reviewAdjustment: z.string().max(10000),
}).strict();
export type ReviewFields = z.infer<typeof fieldsSchema>;
export const baselineSchema = diaryReviewResponseSchema.pick({ reviewStatus: true, reviewedAt: true, reviewDueAt: true,
  reviewOutcome: true, reviewSummary: true, reviewLearning: true, reviewAdjustment: true });
export const baselineFor = (review: ServerReview) => baselineSchema.parse({ reviewStatus: review.reviewStatus, reviewedAt: review.reviewedAt,
  reviewDueAt: review.reviewDueAt, reviewOutcome: review.reviewOutcome, reviewSummary: review.reviewSummary,
  reviewLearning: review.reviewLearning, reviewAdjustment: review.reviewAdjustment });
export const fieldsFor = (review: ServerReview): ReviewFields => ({ reviewOutcome: review.reviewOutcome,
  reviewSummary: review.reviewSummary ?? '', reviewLearning: review.reviewLearning ?? '', reviewAdjustment: review.reviewAdjustment ?? '' });
export const payloadFor = (fields: ReviewFields) => structuredReviewInputSchema.parse(fields);
export type ReviewPayload = ReturnType<typeof payloadFor>;
export const sameBaseline = (a: z.infer<typeof baselineSchema>, b: z.infer<typeof baselineSchema>) => JSON.stringify(a) === JSON.stringify(b);
export const reviewDraftSchema = z.object({
  schema: z.literal(1), scope: z.string().min(1), ownerId: z.string().min(1), diaryId: z.string().regex(/^[1-9]\d{0,18}$/),
  revision: z.number().int().nonnegative(), fields: fieldsSchema, baseline: baselineSchema,
  attempt: z.object({ id: z.string().min(1), payload: structuredReviewInputSchema, baseline: baselineSchema }).strict().nullable(),
  confirmed: baselineSchema.nullable(),
}).strict().refine(draft => !draft.confirmed || !!draft.attempt);
export type ReviewDraft = z.infer<typeof reviewDraftSchema>;
