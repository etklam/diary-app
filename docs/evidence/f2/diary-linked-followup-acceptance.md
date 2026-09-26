# F2 #16 — Diary-linked reminders and initial Review scheduling

Date: 2026-09-27 (Asia/Taipei)

## Scope and source decisions

Extends the full native Diary editor and #44 reminder integration with optional initial Review scheduling. The service's Diary aggregate accepts `reviewDueAt` alongside content, reminders and transactions in one transaction. Omitting the date preserves it; explicit null clears it. Changing or clearing the date of a completed Review preserves `reviewed` status, its completion instant, outcome and private reflections. Returning a completed Review to the queue belongs to its dedicated Review transition operation, outside this ticket.

Read the exact Expo SDK 57 documentation earlier in this session, #16 acceptance criteria, shared PRD/delivery rules, `diary-v3/apps/api/src/diary.ts`, `packages/contracts/src/review.ts`, `apps/web/app/review-scheduling.tsx`, `diary-editor.tsx`, and `tests/e2e/full-authoring-follow-up.spec.ts`. Existing source baseline is `ce2962f597ef56dc4e4cb8966c1ca1860369e006`; app baseline is `471b63381bc3b612e6bdb0ae4d127554ded30f0b` plus retained worktree changes.

The native interaction uses an optional date/time field with an explicit displayed device timezone. Unchanged instants retain seconds/milliseconds. Nonexistent local minutes are rejected and repeated minutes require selecting a UTC occurrence. Clearing is an explicit control as well as an empty field. Existing Review reflections are never submitted by the full Diary editor.

## Verification status

Source implementation and verification are in progress. Prepared tests cover precise dates, DST gaps/overlaps, unchanged/legacy omission, content-only aggregate preservation, Review-only concurrent edits, atomic rejected changes and foreign-owner denial. No prepared test is counted as passed until execution is recorded here.

Android runtime acceptance is pending; the shared AVD remains reserved for concurrent #14 acceptance, and this agent has not interacted with it. No native persistence, screenshot, accessibility-runtime, iOS or physical-device acceptance is claimed. #44 native acceptance remains a predecessor acceptance dependency.
