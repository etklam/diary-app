# [13] Record BUY transactions through full Diary authoring

Status: ready-for-agent
Execution: not-started
Type: AFK
Phase: F2
Work area: diary-app
Requirements: D05, P01
Source stories: US-020, US-038, US-040

## Parent and outcome

[Full-product PRD](../PRD.md) · [Issue index](../ISSUES.md) · [Common delivery rules](../ISSUE-BREAKDOWN.md)

Create persisted BUY transactions through the Diary aggregate, retaining decimal precision and exact execution times.

## Implementation boundary

Native app implementation; inspect referenced service contracts before changing behavior. Follow the source-defined roles, contracts, financial/date semantics and failure behavior. Extend existing working code where applicable. The concrete starting references below are evidence and entry points, not permission to import Web/server runtime into native.

## Acceptance criteria

- [ ] Support source quantity/price/strategy/emotion/notes fields and correct normalization.
- [ ] Send decimal strings and exact instants, including explicit DST occurrence choices and untouched sub-minute precision.
- [ ] Diary plus transaction save is atomic; a rejected transaction leaves no partial Diary/ledger residue.
- [ ] Read the saved transaction and resulting canonical holding, showing uncertainty without automatic replay.
- [ ] Apply relevant PRD invariants and common translation/accessibility/owner-isolation rules; explain any non-applicable check in evidence.
- [ ] Record actual commands/scenarios, source/build and results. No criterion is complete solely because code or an old screenshot exists.

## Blocked by

- [10: Create and edit complete Diary content with durable recovery](10-full-diary-editor.md)
- [08: Implement complete preferences, localization and themes](08-preferences-localization.md)

Triage readiness describes specification quality. Start implementation only when required predecessor outputs are accepted; missing unrelated release credentials do not block independent product work.

## Source and starting points

- [../diary-v3/packages/contracts/src/ledger.ts](../../../../diary-v3/packages/contracts/src/ledger.ts)
- [../diary-v3/apps/api/src/ledger.ts](../../../../diary-v3/apps/api/src/ledger.ts)
- [../diary-v3/tests/integration/buy-ledger.test.ts](../../../../diary-v3/tests/integration/buy-ledger.test.ts)

## Verification plan

Disposable BUY/decimal/atomicity cases and complete native authoring/read-back on a synthetic ledger.

Use synthetic data and controlled provider/service fixtures. Native storage/network/link/notification/upgrade claims require actual runtime evidence. If the implementation modifies a shared contract or backend, record current and previously supported client results.

## Evidence

NOT RUN. This ticket was created by the planning task; implementation and acceptance remain open.

## Comments

Planning baseline: full diary-v3 parity is mandatory; beta is an intermediate test activity. Append implementation decisions, findings and evidence here without rewriting history.
