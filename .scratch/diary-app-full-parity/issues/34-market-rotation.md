# [34] Compare Market Rotation scopes, rankings and historical trends

Status: ready-for-agent
Execution: not-started
Type: AFK
Phase: F5
Work area: diary-app
Requirements: T04
Source stories: US-078, US-079, US-080, US-082, US-089

## Parent and outcome

[Full-product PRD](../PRD.md) · [Issue index](../ISSUES.md) · [Common delivery rules](../ISSUE-BREAKDOWN.md)

Implement the complete source monitor and historical comparison interaction on mobile.

## Implementation boundary

Native app implementation; inspect referenced service contracts before changing behavior. Follow the source-defined roles, contracts, financial/date semantics and failure behavior. Extend existing working code where applicable. The concrete starting references below are evidence and entry points, not permission to import Web/server runtime into native.

## Acceptance criteria

- [ ] Support existing scopes/signals/filters/sorts and canonical missing-value ordering.
- [ ] Use same-scope qualified snapshot comparison dates and shared rebasing/ranking formulas.
- [ ] Chart gaps remain gaps; scope changes cannot show a late response from another scope.
- [ ] Keep all columns/metadata accessible and handle absent snapshots or failed refresh with preserved filters.
- [ ] Apply relevant PRD invariants and common translation/accessibility/owner-isolation rules; explain any non-applicable check in evidence.
- [ ] Record actual commands/scenarios, source/build and results. No criterion is complete solely because code or an old screenshot exists.

## Blocked by

- [33: Read Market State, breadth and confirmation with data quality](33-market-state.md)

Triage readiness describes specification quality. Start implementation only when required predecessor outputs are accepted; missing unrelated release credentials do not block independent product work.

## Source and starting points

- [../diary-v3/apps/api/src/rotation-monitor.ts](../../../../diary-v3/apps/api/src/rotation-monitor.ts)
- [../diary-v3/packages/domain/src/market-rotation/view.ts](../../../../diary-v3/packages/domain/src/market-rotation/view.ts)
- [../diary-v3/tests/e2e/market-rotation.spec.ts](../../../../diary-v3/tests/e2e/market-rotation.spec.ts)

## Verification plan

Persisted snapshot fixture comparisons and native scope/filter/date/trend flows with missing rows.

Use synthetic data and controlled provider/service fixtures. Native storage/network/link/notification/upgrade claims require actual runtime evidence. If the implementation modifies a shared contract or backend, record current and previously supported client results.

## Evidence

NOT RUN. This ticket was created by the planning task; implementation and acceptance remain open.

## Comments

Planning baseline: full diary-v3 parity is mandatory; beta is an intermediate test activity. Append implementation decisions, findings and evidence here without rewriting history.
