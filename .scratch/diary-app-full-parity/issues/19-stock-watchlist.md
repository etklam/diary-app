# [19] Manage stock Watchlist and enter Company research

Status: ready-for-agent
Execution: not-started
Type: AFK
Phase: F3
Work area: diary-app
Requirements: R01
Source stories: US-045, US-046

## Parent and outcome

[Full-product PRD](../PRD.md) · [Issue index](../ISSUES.md) · [Common delivery rules](../ISSUE-BREAKDOWN.md)

Implement the complete personal stock Watchlist rather than a read-only list.

## Implementation boundary

Native app implementation; inspect referenced service contracts before changing behavior. Follow the source-defined roles, contracts, financial/date semantics and failure behavior. Extend existing working code where applicable. The concrete starting references below are evidence and entry points, not permission to import Web/server runtime into native.

## Acceptance criteria

- [ ] Add normalized symbols, edit existing tracking/status fields and remove with source semantics.
- [ ] Handle duplicates, pagination/source limits and no-data states correctly.
- [ ] Late responses, expired sessions and uncertain mutations cannot show another owner's Watchlist or lose edits.
- [ ] Provide Company navigation with stable selection/back context.
- [ ] Apply relevant PRD invariants and common translation/accessibility/owner-isolation rules; explain any non-applicable check in evidence.
- [ ] Record actual commands/scenarios, source/build and results. No criterion is complete solely because code or an old screenshot exists.

## Blocked by

- [06: Complete registration and guest-to-account continuation](06-registration-guest-continuation.md)
- [08: Implement complete preferences, localization and themes](08-preferences-localization.md)

Triage readiness describes specification quality. Start implementation only when required predecessor outputs are accepted; missing unrelated release credentials do not block independent product work.

## Source and starting points

- [../diary-v3/apps/api/src/watchlist.ts](../../../../diary-v3/apps/api/src/watchlist.ts)
- [../diary-v3/packages/contracts/src/watchlist.ts](../../../../diary-v3/packages/contracts/src/watchlist.ts)

## Verification plan

Native add/edit/status/remove round trip with duplicate, account-switch and network-failure cases.

Use synthetic data and controlled provider/service fixtures. Native storage/network/link/notification/upgrade claims require actual runtime evidence. If the implementation modifies a shared contract or backend, record current and previously supported client results.

## Evidence

NOT RUN. This ticket was created by the planning task; implementation and acceptance remain open.

## Comments

Planning baseline: full diary-v3 parity is mandatory; beta is an intermediate test activity. Append implementation decisions, findings and evidence here without rewriting history.
