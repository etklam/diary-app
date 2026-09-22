# [17] Complete Diary Review scheduling, revision and return-to-queue

Status: ready-for-agent
Execution: not-started
Type: AFK
Phase: F2
Work area: diary-app
Requirements: D07, D08
Source stories: US-029, US-031, US-032, US-033

## Parent and outcome

[Full-product PRD](../PRD.md) · [Issue index](../ISSUES.md) · [Common delivery rules](../ISSUE-BREAKDOWN.md)

Extend current Review completion/update with source rescheduling and lifecycle actions.

## Implementation boundary

Native app implementation; inspect referenced service contracts before changing behavior. Follow the source-defined roles, contracts, financial/date semantics and failure behavior. Extend existing working code where applicable. The concrete starting references below are evidence and entry points, not permission to import Web/server runtime into native.

## Acceptance criteria

- [ ] Implement only verified source transitions for schedule/reschedule/return-to-queue; no client-invented status.
- [ ] Retain outcome/reflections and original thesis/risk/execution as distinct fields with private ownership.
- [ ] Queue/Detail/editor refresh consistently after confirmed changes and keep existing navigation context.
- [ ] Preserve encrypted drafts and pending attempts through expiry/restart; unchanged reads do not authorize replay.
- [ ] Apply relevant PRD invariants and common translation/accessibility/owner-isolation rules; explain any non-applicable check in evidence.
- [ ] Record actual commands/scenarios, source/build and results. No criterion is complete solely because code or an old screenshot exists.

## Blocked by

- [16: Edit Diary-linked reminders and initial Review scheduling atomically](16-diary-linked-reminders.md)

Triage readiness describes specification quality. Start implementation only when required predecessor outputs are accepted; missing unrelated release credentials do not block independent product work.

## Source and starting points

- [src/reviews/controller.ts](../../../src/reviews/controller.ts)
- [../diary-v3/apps/api/src/diary-review.ts](../../../../diary-v3/apps/api/src/diary-review.ts)
- [../diary-v3/tests/e2e/diary-detail-review.spec.ts](../../../../diary-v3/tests/e2e/diary-detail-review.spec.ts)

## Verification plan

Pending → completed → revise → return/reschedule canonical flows, permission checks and lost-response restoration.

Use synthetic data and controlled provider/service fixtures. Native storage/network/link/notification/upgrade claims require actual runtime evidence. If the implementation modifies a shared contract or backend, record current and previously supported client results.

## Evidence

NOT RUN. This ticket was created by the planning task; implementation and acceptance remain open.

## Comments

Planning baseline: full diary-v3 parity is mandatory; beta is an intermediate test activity. Append implementation decisions, findings and evidence here without rewriting history.
