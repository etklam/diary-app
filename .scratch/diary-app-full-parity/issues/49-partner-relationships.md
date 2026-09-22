# [49] Manage Partner invitations and independent sharing settings

Status: ready-for-agent
Execution: not-started
Type: AFK
Phase: F7
Work area: diary-app
Requirements: S01
Source stories: US-066, US-067, US-074

## Parent and outcome

[Full-product PRD](../PRD.md) · [Issue index](../ISSUES.md) · [Common delivery rules](../ISSUE-BREAKDOWN.md)

Implement source relationship states and each owner's sharing choices.

## Implementation boundary

Native app implementation; inspect referenced service contracts before changing behavior. Follow the source-defined roles, contracts, financial/date semantics and failure behavior. Extend existing working code where applicable. The concrete starting references below are evidence and entry points, not permission to import Web/server runtime into native.

## Acceptance criteria

- [ ] Invite/accept/withdraw/unlink using existing identity and relationship contracts.
- [ ] Expose independent Diary/Stock Note sharing controls with exact one-directional semantics.
- [ ] Distinguish no partner, pending, connected/not-sharing and permission/network failures.
- [ ] Refresh permissions on resume and clear revoked/private partner context after logout/unlink.
- [ ] Apply relevant PRD invariants and common translation/accessibility/owner-isolation rules; explain any non-applicable check in evidence.
- [ ] Record actual commands/scenarios, source/build and results. No criterion is complete solely because code or an old screenshot exists.

## Blocked by

- [06: Complete registration and guest-to-account continuation](06-registration-guest-continuation.md)
- [08: Implement complete preferences, localization and themes](08-preferences-localization.md)

Triage readiness describes specification quality. Start implementation only when required predecessor outputs are accepted; missing unrelated release credentials do not block independent product work.

## Source and starting points

- [../diary-v3/apps/api/src/partners.ts](../../../../diary-v3/apps/api/src/partners.ts)
- [../diary-v3/packages/contracts/src/partners.ts](../../../../diary-v3/packages/contracts/src/partners.ts)
- [../diary-v3/tests/e2e/partners.spec.ts](../../../../diary-v3/tests/e2e/partners.spec.ts)

## Verification plan

Two-account invitation/share/withdraw/unlink native/API journey, including late response and account-switch cases.

Use synthetic data and controlled provider/service fixtures. Native storage/network/link/notification/upgrade claims require actual runtime evidence. If the implementation modifies a shared contract or backend, record current and previously supported client results.

## Evidence

NOT RUN. This ticket was created by the planning task; implementation and acceptance remain open.

## Comments

Planning baseline: full diary-v3 parity is mandatory; beta is an intermediate test activity. Append implementation decisions, findings and evidence here without rewriting history.
