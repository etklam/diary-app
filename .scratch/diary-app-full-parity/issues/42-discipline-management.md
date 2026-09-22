# [42] Create, reorder and randomly review Discipline entries

Status: ready-for-agent
Execution: not-started
Type: AFK
Phase: F6
Work area: diary-app
Requirements: N04
Source stories: US-061, US-062, US-063

## Parent and outcome

[Full-product PRD](../PRD.md) · [Issue index](../ISSUES.md) · [Common delivery rules](../ISSUE-BREAKDOWN.md)

Implement the entire private principles collection with source ordering and random-draw behavior.

## Implementation boundary

Native app implementation; inspect referenced service contracts before changing behavior. Follow the source-defined roles, contracts, financial/date semantics and failure behavior. Extend existing working code where applicable. The concrete starting references below are evidence and entry points, not permission to import Web/server runtime into native.

## Acceptance criteria

- [ ] Create/edit/delete entries and reorder them with explicit accessible controls.
- [ ] Random selection distinguishes user content from any source fallback quotation.
- [ ] Long collections stay reachable; concurrent reorder/delete and failed writes preserve consistent state.
- [ ] Keep owner isolation, dirty input and truthful uncertain-save feedback.
- [ ] Apply relevant PRD invariants and common translation/accessibility/owner-isolation rules; explain any non-applicable check in evidence.
- [ ] Record actual commands/scenarios, source/build and results. No criterion is complete solely because code or an old screenshot exists.

## Blocked by

- [06: Complete registration and guest-to-account continuation](06-registration-guest-continuation.md)
- [08: Implement complete preferences, localization and themes](08-preferences-localization.md)

Triage readiness describes specification quality. Start implementation only when required predecessor outputs are accepted; missing unrelated release credentials do not block independent product work.

## Source and starting points

- [../diary-v3/apps/api/src/discipline.ts](../../../../diary-v3/apps/api/src/discipline.ts)
- [../diary-v3/tests/e2e/discipline.spec.ts](../../../../diary-v3/tests/e2e/discipline.spec.ts)

## Verification plan

Native create/edit/reorder/random/delete sequence and API ownership/concurrent ordering tests.

Use synthetic data and controlled provider/service fixtures. Native storage/network/link/notification/upgrade claims require actual runtime evidence. If the implementation modifies a shared contract or backend, record current and previously supported client results.

## Evidence

NOT RUN. This ticket was created by the planning task; implementation and acceptance remain open.

## Comments

Planning baseline: full diary-v3 parity is mandatory; beta is an intermediate test activity. Append implementation decisions, findings and evidence here without rewriting history.
