# [44] Manage one-off and recurring Diary reminders

Status: ready-for-agent
Execution: not-started
Type: AFK
Phase: F6
Work area: diary-app
Requirements: N01, D06
Source stories: US-055, US-056, US-057

## Parent and outcome

[Full-product PRD](../PRD.md) · [Issue index](../ISSUES.md) · [Common delivery rules](../ISSUE-BREAKDOWN.md)

Expose source reminder creation/edit/dismissal with correct recurrence and temporal behavior.

## Implementation boundary

Native app implementation; inspect referenced service contracts before changing behavior. Follow the source-defined roles, contracts, financial/date semantics and failure behavior. Extend existing working code where applicable. The concrete starting references below are evidence and entry points, not permission to import Web/server runtime into native.

## Acceptance criteria

- [ ] Create/edit one-off and WEEK/MONTH recurrence using canonical account-timezone/weekend/cutoff rules.
- [ ] Dismissing a root cancels the series; dismissing a child affects only that occurrence.
- [ ] Preserve precise unchanged instants and explicit DST handling where local-time editing applies.
- [ ] List and link to related Diaries; rejected/uncertain changes retain appropriate state.
- [ ] Apply relevant PRD invariants and common translation/accessibility/owner-isolation rules; explain any non-applicable check in evidence.
- [ ] Record actual commands/scenarios, source/build and results. No criterion is complete solely because code or an old screenshot exists.

## Blocked by

- [10: Create and edit complete Diary content with durable recovery](10-full-diary-editor.md)
- [08: Implement complete preferences, localization and themes](08-preferences-localization.md)

Triage readiness describes specification quality. Start implementation only when required predecessor outputs are accepted; missing unrelated release credentials do not block independent product work.

## Source and starting points

- [../diary-v3/apps/api/src/alerts.ts](../../../../diary-v3/apps/api/src/alerts.ts)
- [../diary-v3/packages/domain/src/recurring-alerts.ts](../../../../diary-v3/packages/domain/src/recurring-alerts.ts)
- [../diary-v3/tests/e2e/alerts.spec.ts](../../../../diary-v3/tests/e2e/alerts.spec.ts)

## Verification plan

Disposable recurrence/cancellation fixtures and native root/child/create/edit flows across timezone boundaries.

Use synthetic data and controlled provider/service fixtures. Native storage/network/link/notification/upgrade claims require actual runtime evidence. If the implementation modifies a shared contract or backend, record current and previously supported client results.

## Evidence

NOT RUN. This ticket was created by the planning task; implementation and acceptance remain open.

## Comments

Planning baseline: full diary-v3 parity is mandatory; beta is an intermediate test activity. Append implementation decisions, findings and evidence here without rewriting history.
