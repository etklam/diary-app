# [16] Edit Diary-linked reminders and initial Review scheduling atomically

Status: ready-for-agent
Execution: not-started
Type: AFK
Phase: F2
Work area: diary-app
Requirements: D06, D07
Source stories: US-021, US-029

## Parent and outcome

[Full-product PRD](../PRD.md) · [Issue index](../ISSUES.md) · [Common delivery rules](../ISSUE-BREAKDOWN.md)

Integrate source reminder and Review scheduling fields into full authoring without replacing unrelated aggregate data.

## Implementation boundary

Native app implementation; inspect referenced service contracts before changing behavior. Follow the source-defined roles, contracts, financial/date semantics and failure behavior. Extend existing working code where applicable. The concrete starting references below are evidence and entry points, not permission to import Web/server runtime into native.

## Acceptance criteria

- [ ] Add/edit/remove supported linked alerts and initial Review dates through canonical aggregate semantics.
- [ ] Retain original IDs, recurrence roots and precise instants for unchanged fields.
- [ ] Saving content-only edits does not erase transactions, alerts or existing Review reflections.
- [ ] Invalid linked data rolls back the whole change and retains input; calendar/timezone choices stay explicit.
- [ ] Apply relevant PRD invariants and common translation/accessibility/owner-isolation rules; explain any non-applicable check in evidence.
- [ ] Record actual commands/scenarios, source/build and results. No criterion is complete solely because code or an old screenshot exists.

## Blocked by

- [10: Create and edit complete Diary content with durable recovery](10-full-diary-editor.md)
- [44: Manage one-off and recurring Diary reminders](44-diary-reminders.md)

Triage readiness describes specification quality. Start implementation only when required predecessor outputs are accepted; missing unrelated release credentials do not block independent product work.

## Source and starting points

- [../diary-v3/tests/e2e/full-authoring-follow-up.spec.ts](../../../../diary-v3/tests/e2e/full-authoring-follow-up.spec.ts)
- [../diary-v3/apps/api/src/diary.ts](../../../../diary-v3/apps/api/src/diary.ts)
- [../diary-v3/packages/contracts/src/review.ts](../../../../diary-v3/packages/contracts/src/review.ts)

## Verification plan

Full authoring with transactions/reminders/Review dates plus exact-instant preservation and rollback cases.

Use synthetic data and controlled provider/service fixtures. Native storage/network/link/notification/upgrade claims require actual runtime evidence. If the implementation modifies a shared contract or backend, record current and previously supported client results.

## Evidence

NOT RUN. This ticket was created by the planning task; implementation and acceptance remain open.

## Comments

Planning baseline: full diary-v3 parity is mandatory; beta is an intermediate test activity. Append implementation decisions, findings and evidence here without rewriting history.
