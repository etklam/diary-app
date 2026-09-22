# [56] Administer ETF data and existing market jobs

Status: ready-for-agent
Execution: not-started
Type: AFK
Phase: F8
Work area: diary-app
Requirements: C05
Source stories: US-097

## Parent and outcome

[Full-product PRD](../PRD.md) · [Issue index](../ISSUES.md) · [Common delivery rules](../ISSUE-BREAKDOWN.md)

Provide the source catalog/history management and existing market batch controls with real status feedback.

## Implementation boundary

Native app implementation; inspect referenced service contracts before changing behavior. Follow the source-defined roles, contracts, financial/date semantics and failure behavior. Extend existing working code where applicable. The concrete starting references below are evidence and entry points, not permission to import Web/server runtime into native.

## Acceptance criteria

- [ ] Support authorized ETF catalog/history create/edit/remove/initialization operations with source validation.
- [ ] Trigger only existing supported market jobs and display authoritative status/results rather than client estimates.
- [ ] Keep provider credentials and batch execution server-side, preserving existing single-scheduler constraints.
- [ ] Role denial, failed jobs and concurrent changes produce accurate recoverable native states.
- [ ] Apply relevant PRD invariants and common translation/accessibility/owner-isolation rules; explain any non-applicable check in evidence.
- [ ] Record actual commands/scenarios, source/build and results. No criterion is complete solely because code or an old screenshot exists.

## Blocked by

- [32: Deliver ETF research and the personal ETF Watchlist](32-etf-research-watchlist.md)
- [34: Compare Market Rotation scopes, rankings and historical trends](34-market-rotation.md)
- [55: Manage users, system statistics and authorized admin Diaries](55-user-system-administration.md)

Triage readiness describes specification quality. Start implementation only when required predecessor outputs are accepted; missing unrelated release credentials do not block independent product work.

## Source and starting points

- [../diary-v3/apps/api/src/etf-admin.ts](../../../../diary-v3/apps/api/src/etf-admin.ts)
- [../diary-v3/apps/api/src/rotation-admin.ts](../../../../diary-v3/apps/api/src/rotation-admin.ts)
- [../diary-v3/tests/e2e/etf-admin.spec.ts](../../../../diary-v3/tests/e2e/etf-admin.spec.ts)

## Verification plan

Synthetic admin catalog/history/job round trips plus ordinary-user denial and failed-job fixtures.

Use synthetic data and controlled provider/service fixtures. Native storage/network/link/notification/upgrade claims require actual runtime evidence. If the implementation modifies a shared contract or backend, record current and previously supported client results.

## Evidence

NOT RUN. This ticket was created by the planning task; implementation and acceptance remain open.

## Comments

Planning baseline: full diary-v3 parity is mandatory; beta is an intermediate test activity. Append implementation decisions, findings and evidence here without rewriting history.
