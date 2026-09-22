# [28] Analyze strategy performance and transaction history

Status: ready-for-agent
Execution: not-started
Type: AFK
Phase: F4
Work area: diary-app
Requirements: P03
Source stories: US-043

## Parent and outcome

[Full-product PRD](../PRD.md) · [Issue index](../ISSUES.md) · [Common delivery rules](../ISSUE-BREAKDOWN.md)

Deliver performance filters, tables/charts and transaction history using source calculations.

## Implementation boundary

Native app implementation; inspect referenced service contracts before changing behavior. Follow the source-defined roles, contracts, financial/date semantics and failure behavior. Extend existing working code where applicable. The concrete starting references below are evidence and entry points, not permission to import Web/server runtime into native.

## Acceptance criteria

- [ ] Preserve all source metrics, grouping, sort/filter/pagination and rounding.
- [ ] Apply time/date and holiday-exclusion preferences consistently to eligible statistics.
- [ ] Handle no trades, long strategy names, large values and incomplete data without misleading defaults.
- [ ] Provide accessible chart values and retain selected analysis state across drill-down.
- [ ] Apply relevant PRD invariants and common translation/accessibility/owner-isolation rules; explain any non-applicable check in evidence.
- [ ] Record actual commands/scenarios, source/build and results. No criterion is complete solely because code or an old screenshot exists.

## Blocked by

- [26: Read complete holdings, costs, PnL and valuation coverage](26-portfolio-holdings.md)
- [08: Implement complete preferences, localization and themes](08-preferences-localization.md)

Triage readiness describes specification quality. Start implementation only when required predecessor outputs are accepted; missing unrelated release credentials do not block independent product work.

## Source and starting points

- [../diary-v3/apps/api/src/performance.ts](../../../../diary-v3/apps/api/src/performance.ts)
- [../diary-v3/packages/domain/src/performance-stats.ts](../../../../diary-v3/packages/domain/src/performance-stats.ts)
- [../diary-v3/tests/e2e/performance.spec.ts](../../../../diary-v3/tests/e2e/performance.spec.ts)

## Verification plan

Source performance fixtures plus native filtered analysis/history with timezone/holiday edge cases.

Use synthetic data and controlled provider/service fixtures. Native storage/network/link/notification/upgrade claims require actual runtime evidence. If the implementation modifies a shared contract or backend, record current and previously supported client results.

## Evidence

NOT RUN. This ticket was created by the planning task; implementation and acceptance remain open.

## Comments

Planning baseline: full diary-v3 parity is mandatory; beta is an intermediate test activity. Append implementation decisions, findings and evidence here without rewriting history.
