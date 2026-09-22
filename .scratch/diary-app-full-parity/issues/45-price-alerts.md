# [45] Configure and rearm complete Price Alerts

Status: ready-for-agent
Execution: not-started
Type: AFK
Phase: F6
Work area: diary-app
Requirements: N02
Source stories: US-058, US-059

## Parent and outcome

[Full-product PRD](../PRD.md) · [Issue index](../ISSUES.md) · [Common delivery rules](../ISSUE-BREAKDOWN.md)

Implement all source price conditions, lifecycle and Company-prefilled authoring.

## Implementation boundary

Native app implementation; inspect referenced service contracts before changing behavior. Follow the source-defined roles, contracts, financial/date semantics and failure behavior. Extend existing working code where applicable. The concrete starting references below are evidence and entry points, not permission to import Web/server runtime into native.

## Acceptance criteria

- [ ] Support threshold, percentage and moving-average conditions with exact source periods/direction semantics.
- [ ] Create/read/edit/delete and explicitly rearm; ordinary edits do not silently reset triggered state.
- [ ] Show source cadence, coverage/limits, trigger times and unavailable provider states accurately.
- [ ] Do not calculate authoritative triggers on mobile; owner checks and interrupted writes remain safe.
- [ ] Apply relevant PRD invariants and common translation/accessibility/owner-isolation rules; explain any non-applicable check in evidence.
- [ ] Record actual commands/scenarios, source/build and results. No criterion is complete solely because code or an old screenshot exists.

## Blocked by

- [20: Read Company quote, history and personal context](20-company-hub.md)
- [44: Manage one-off and recurring Diary reminders](44-diary-reminders.md)

Triage readiness describes specification quality. Start implementation only when required predecessor outputs are accepted; missing unrelated release credentials do not block independent product work.

## Source and starting points

- [../diary-v3/apps/api/src/price-alerts.ts](../../../../diary-v3/apps/api/src/price-alerts.ts)
- [../diary-v3/packages/contracts/src/price-alerts.ts](../../../../diary-v3/packages/contracts/src/price-alerts.ts)
- [../diary-v3/tests/e2e/price-alerts.spec.ts](../../../../diary-v3/tests/e2e/price-alerts.spec.ts)

## Verification plan

All condition variants, edited triggered alert, explicit rearm/delete and controlled provider-trigger cases.

Use synthetic data and controlled provider/service fixtures. Native storage/network/link/notification/upgrade claims require actual runtime evidence. If the implementation modifies a shared contract or backend, record current and previously supported client results.

## Evidence

NOT RUN. This ticket was created by the planning task; implementation and acceptance remain open.

## Comments

Planning baseline: full diary-v3 parity is mandatory; beta is an intermediate test activity. Append implementation decisions, findings and evidence here without rewriting history.
