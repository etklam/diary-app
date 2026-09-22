# [18] Create, manage and link complete Trade Plans

Status: ready-for-agent
Execution: not-started
Type: AFK
Phase: F2
Work area: diary-app
Requirements: D09
Source stories: US-034, US-035, US-036, US-037

## Parent and outcome

[Full-product PRD](../PRD.md) · [Issue index](../ISSUES.md) · [Common delivery rules](../ISSUE-BREAKDOWN.md)

Deliver Plan list/detail/editor and lifecycle with direct Diary linkage.

## Implementation boundary

Native app implementation; inspect referenced service contracts before changing behavior. Follow the source-defined roles, contracts, financial/date semantics and failure behavior. Extend existing working code where applicable. The concrete starting references below are evidence and entry points, not permission to import Web/server runtime into native.

## Acceptance criteria

- [ ] Round-trip entry range, stop, target, position limit and invalidation fields as exact canonical values.
- [ ] Provide source search/filter/pagination, supported lifecycle, edit and confirmed delete.
- [ ] Link/unlink only the same owner's Diary and navigate both directions without losing plan context.
- [ ] Invalid zones/transitions/ownership and network failures retain input and never invent a saved state.
- [ ] Apply relevant PRD invariants and common translation/accessibility/owner-isolation rules; explain any non-applicable check in evidence.
- [ ] Record actual commands/scenarios, source/build and results. No criterion is complete solely because code or an old screenshot exists.

## Blocked by

- [10: Create and edit complete Diary content with durable recovery](10-full-diary-editor.md)
- [08: Implement complete preferences, localization and themes](08-preferences-localization.md)

Triage readiness describes specification quality. Start implementation only when required predecessor outputs are accepted; missing unrelated release credentials do not block independent product work.

## Source and starting points

- [../diary-v3/packages/contracts/src/trade-plan.ts](../../../../diary-v3/packages/contracts/src/trade-plan.ts)
- [../diary-v3/apps/api/src/trade-plans.ts](../../../../diary-v3/apps/api/src/trade-plans.ts)
- [../diary-v3/tests/e2e/trade-plans.spec.ts](../../../../diary-v3/tests/e2e/trade-plans.spec.ts)

## Verification plan

Create → activate/update → link/read Diary → unlink/delete plus decimal and ownership fixtures.

Use synthetic data and controlled provider/service fixtures. Native storage/network/link/notification/upgrade claims require actual runtime evidence. If the implementation modifies a shared contract or backend, record current and previously supported client results.

## Evidence

NOT RUN. This ticket was created by the planning task; implementation and acceptance remain open.

## Comments

Planning baseline: full diary-v3 parity is mandatory; beta is an intermediate test activity. Append implementation decisions, findings and evidence here without rewriting history.
