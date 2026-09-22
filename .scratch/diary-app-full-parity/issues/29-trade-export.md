# [29] Export canonical trade data through native file sharing

Status: ready-for-agent
Execution: not-started
Type: AFK
Phase: F4
Work area: diary-app
Requirements: P03
Source stories: US-044

## Parent and outcome

[Full-product PRD](../PRD.md) · [Issue index](../ISSUES.md) · [Common delivery rules](../ISSUE-BREAKDOWN.md)

Make the existing trade export usable as a real native-generated/downloaded shareable file.

## Implementation boundary

Native app implementation; inspect referenced service contracts before changing behavior. Follow the source-defined roles, contracts, financial/date semantics and failure behavior. Extend existing working code where applicable. The concrete starting references below are evidence and entry points, not permission to import Web/server runtime into native.

## Acceptance criteria

- [ ] Preserve source export scope, filters, columns, date/decimal formatting and filename semantics.
- [ ] Inspect actual exported bytes for selected rows, Unicode, quoting/newlines and empty results.
- [ ] Support save/share cancellation, permission/unavailable destination and network failure without false success.
- [ ] Keep exports owner-bound and outside automatic diagnostic upload.
- [ ] Apply relevant PRD invariants and common translation/accessibility/owner-isolation rules; explain any non-applicable check in evidence.
- [ ] Record actual commands/scenarios, source/build and results. No criterion is complete solely because code or an old screenshot exists.

## Blocked by

- [28: Analyze strategy performance and transaction history](28-strategy-performance.md)

Triage readiness describes specification quality. Start implementation only when required predecessor outputs are accepted; missing unrelated release credentials do not block independent product work.

## Source and starting points

- [../diary-v3/apps/api/src/trade-export.ts](../../../../diary-v3/apps/api/src/trade-export.ts)
- [../diary-v3/tests/integration/trade-export.test.ts](../../../../diary-v3/tests/integration/trade-export.test.ts)
- [../diary-v3/tests/e2e/trade-export.spec.ts](../../../../diary-v3/tests/e2e/trade-export.spec.ts)

## Verification plan

Download/share a synthetic filtered CSV on device and compare content with canonical API export.

Use synthetic data and controlled provider/service fixtures. Native storage/network/link/notification/upgrade claims require actual runtime evidence. If the implementation modifies a shared contract or backend, record current and previously supported client results.

## Evidence

NOT RUN. This ticket was created by the planning task; implementation and acceptance remain open.

## Comments

Planning baseline: full diary-v3 parity is mandatory; beta is an intermediate test activity. Append implementation decisions, findings and evidence here without rewriting history.
