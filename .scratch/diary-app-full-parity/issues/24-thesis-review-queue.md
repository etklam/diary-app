# [24] Review Theses and deliver the combined Review Queue

Status: ready-for-agent
Execution: not-started
Type: AFK
Phase: F3
Work area: diary-app
Requirements: R05, D08
Source stories: US-030, US-053

## Parent and outcome

[Full-product PRD](../PRD.md) · [Issue index](../ISSUES.md) · [Common delivery rules](../ISSUE-BREAKDOWN.md)

Complete Thesis Review and Portfolio Decision, then expose both review target types in one queue.

## Implementation boundary

Native app implementation; inspect referenced service contracts before changing behavior. Follow the source-defined roles, contracts, financial/date semantics and failure behavior. Extend existing working code where applicable. The concrete starting references below are evidence and entry points, not permission to import Web/server runtime into native.

## Acceptance criteria

- [ ] Save source Thesis reflection/Portfolio Decision without conflating Diary Review fields.
- [ ] Queue filters/buckets/counts/pages cover both targets and retain canonical server limits.
- [ ] Navigate queue → thesis/Diary → review → queue with correct invalidation and saved context.
- [ ] Private results, failed/uncertain writes and expiry follow the same owner/draft safety contract.
- [ ] Apply relevant PRD invariants and common translation/accessibility/owner-isolation rules; explain any non-applicable check in evidence.
- [ ] Record actual commands/scenarios, source/build and results. No criterion is complete solely because code or an old screenshot exists.

## Blocked by

- [23: Author and progress Investment Thesis lifecycle](23-investment-thesis.md)
- [17: Complete Diary Review scheduling, revision and return-to-queue](17-review-reschedule-return.md)

Triage readiness describes specification quality. Start implementation only when required predecessor outputs are accepted; missing unrelated release credentials do not block independent product work.

## Source and starting points

- [../diary-v3/apps/api/src/review-queue.ts](../../../../diary-v3/apps/api/src/review-queue.ts)
- [../diary-v3/packages/contracts/src/review-queue.ts](../../../../diary-v3/packages/contracts/src/review-queue.ts)
- [../diary-v3/tests/integration/investment-thesis.test.ts](../../../../diary-v3/tests/integration/investment-thesis.test.ts)

## Verification plan

Mixed-target synthetic queue and native completion/update → refreshed counts/decision read-back.

Use synthetic data and controlled provider/service fixtures. Native storage/network/link/notification/upgrade claims require actual runtime evidence. If the implementation modifies a shared contract or backend, record current and previously supported client results.

## Evidence

NOT RUN. This ticket was created by the planning task; implementation and acceptance remain open.

## Comments

Planning baseline: full diary-v3 parity is mandatory; beta is an intermediate test activity. Append implementation decisions, findings and evidence here without rewriting history.
