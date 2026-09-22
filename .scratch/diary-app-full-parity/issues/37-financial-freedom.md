# [37] Run the Financial Freedom and FIRE calculator

Status: ready-for-agent
Execution: not-started
Type: AFK
Phase: F5
Work area: diary-app
Requirements: T07
Source stories: US-084

## Parent and outcome

[Full-product PRD](../PRD.md) · [Issue index](../ISSUES.md) · [Common delivery rules](../ISSUE-BREAKDOWN.md)

Port the complete source assumptions, projections and available output actions to native.

## Implementation boundary

Native app implementation; inspect referenced service contracts before changing behavior. Follow the source-defined roles, contracts, financial/date semantics and failure behavior. Extend existing working code where applicable. The concrete starting references below are evidence and entry points, not permission to import Web/server runtime into native.

## Acceptance criteria

- [ ] Preserve formula and scenario semantics; expose any needed pure helper through reviewed portable exports.
- [ ] Validate inputs and distinguish assumptions from factual market data.
- [ ] Render results/charts with accessible values and all source output actions.
- [ ] Locale/theme/large text and edge cases remain usable without a mandatory account.
- [ ] Apply relevant PRD invariants and common translation/accessibility/owner-isolation rules; explain any non-applicable check in evidence.
- [ ] Record actual commands/scenarios, source/build and results. No criterion is complete solely because code or an old screenshot exists.

## Blocked by

- [31: Expose the complete public Tools directory and access model](31-public-tools-directory.md)
- [08: Implement complete preferences, localization and themes](08-preferences-localization.md)

Triage readiness describes specification quality. Start implementation only when required predecessor outputs are accepted; missing unrelated release credentials do not block independent product work.

## Source and starting points

- [../diary-v3/packages/domain/src/fire.ts](../../../../diary-v3/packages/domain/src/fire.ts)
- [../diary-v3/apps/web/app/routes/fire.tsx](../../../../diary-v3/apps/web/app/routes/fire.tsx)
- [../diary-v3/tests/unit/fire.test.ts](../../../../diary-v3/tests/unit/fire.test.ts)

## Verification plan

Source FIRE fixture comparison and native guest input/result/output scenarios.

Use synthetic data and controlled provider/service fixtures. Native storage/network/link/notification/upgrade claims require actual runtime evidence. If the implementation modifies a shared contract or backend, record current and previously supported client results.

## Evidence

NOT RUN. This ticket was created by the planning task; implementation and acceptance remain open.

## Comments

Planning baseline: full diary-v3 parity is mandatory; beta is an intermediate test activity. Append implementation decisions, findings and evidence here without rewriting history.
