# [47] Add owner-bound device enrollment and server push delivery

Status: ready-for-agent
Execution: not-started
Type: AFK
Phase: F6
Work area: diary-v3 + shared contracts
Requirements: X02, N03, X04
Source stories: US-055, US-058, US-060

## Parent and outcome

[Full-product PRD](../PRD.md) · [Issue index](../ISSUES.md) · [Common delivery rules](../ISSUE-BREAKDOWN.md)

Extend the service with tested device association and push delivery from existing reminder events.

## Implementation boundary

App/service integration; apply the instructions and permissions of each repository before changing it. Follow the source-defined roles, contracts, financial/date semantics and failure behavior. Extend existing working code where applicable. The concrete starting references below are evidence and entry points, not permission to import Web/server runtime into native.

## Acceptance criteria

- [ ] Record provider choice and additive device/enrollment contracts; keep credentials server-side.
- [ ] Associate/rotate/unregister tokens to the authenticated owner/environment and support device/account changes.
- [ ] Deliver deduplicated event notifications from authoritative jobs, recording delivery results and invalid-token cleanup.
- [ ] Use private-data-minimizing payloads and synthetic provider tests; no second recurrence/price scheduler.
- [ ] Apply relevant PRD invariants and common translation/accessibility/owner-isolation rules; explain any non-applicable check in evidence.
- [ ] Record actual commands/scenarios, source/build and results. No criterion is complete solely because code or an old screenshot exists.

## Blocked by

- [02: Align shared packages and prove previous-client compatibility](02-shared-package-compatibility.md)
- [04: Establish repeatable API and device acceptance for full parity](04-native-acceptance-harness.md)
- [44: Manage one-off and recurring Diary reminders](44-diary-reminders.md)
- [45: Configure and rearm complete Price Alerts](45-price-alerts.md)

Triage readiness describes specification quality. Start implementation only when required predecessor outputs are accepted; missing unrelated release credentials do not block independent product work.

## Source and starting points

- [../diary-v3/apps/api/src/alert-pusher.ts](../../../../diary-v3/apps/api/src/alert-pusher.ts)
- [../diary-v3/apps/api/src/price-alert-checker.ts](../../../../diary-v3/apps/api/src/price-alert-checker.ts)
- [../diary-v3/packages/contracts/src/alerts.ts](../../../../diary-v3/packages/contracts/src/alerts.ts)

## Verification plan

Disposable device-ownership tests and controlled delivery/retry/invalid-token/concurrent-event fixtures.

Use synthetic data and controlled provider/service fixtures. Native storage/network/link/notification/upgrade claims require actual runtime evidence. If the implementation modifies a shared contract or backend, record current and previously supported client results.

## Evidence

NOT RUN. This ticket was created by the planning task; implementation and acceptance remain open.

## Comments

Planning baseline: full diary-v3 parity is mandatory; beta is an intermediate test activity. Append implementation decisions, findings and evidence here without rewriting history.
