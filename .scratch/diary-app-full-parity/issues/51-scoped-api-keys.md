# [51] Create, inspect and revoke scoped API keys

Status: ready-for-agent
Execution: not-started
Type: AFK
Phase: F7
Work area: diary-app
Requirements: S03
Source stories: US-070

## Parent and outcome

[Full-product PRD](../PRD.md) · [Issue index](../ISSUES.md) · [Common delivery rules](../ISSUE-BREAKDOWN.md)

Expose the source personal API-key lifecycle without embedding long-lived secrets in ordinary app state.

## Implementation boundary

Native app implementation; inspect referenced service contracts before changing behavior. Follow the source-defined roles, contracts, financial/date semantics and failure behavior. Extend existing working code where applicable. The concrete starting references below are evidence and entry points, not permission to import Web/server runtime into native.

## Acceptance criteria

- [ ] Create supported scopes and show the secret only as allowed by the creation response.
- [ ] List metadata and revoke keys, explaining capability boundaries and irreversible loss of a one-time secret.
- [ ] Keep keys/passwords out of persistence, analytics and diagnostics; handle explicit copy behavior safely.
- [ ] Revoked/expired/insufficient-scope requests fail under canonical contracts and other keys remain unaffected.
- [ ] Apply relevant PRD invariants and common translation/accessibility/owner-isolation rules; explain any non-applicable check in evidence.
- [ ] Record actual commands/scenarios, source/build and results. No criterion is complete solely because code or an old screenshot exists.

## Blocked by

- [07: Change password and revoke all sessions from the app](07-account-security.md)
- [06: Complete registration and guest-to-account continuation](06-registration-guest-continuation.md)

Triage readiness describes specification quality. Start implementation only when required predecessor outputs are accepted; missing unrelated release credentials do not block independent product work.

## Source and starting points

- [../diary-v3/apps/api/src/api-keys.ts](../../../../diary-v3/apps/api/src/api-keys.ts)
- [../diary-v3/packages/contracts/src/api-keys.ts](../../../../diary-v3/packages/contracts/src/api-keys.ts)
- [../diary-v3/tests/e2e/api-keys.spec.ts](../../../../diary-v3/tests/e2e/api-keys.spec.ts)

## Verification plan

Synthetic key creation/use/revoke and native one-time secret/list/error flows.

Use synthetic data and controlled provider/service fixtures. Native storage/network/link/notification/upgrade claims require actual runtime evidence. If the implementation modifies a shared contract or backend, record current and previously supported client results.

## Evidence

NOT RUN. This ticket was created by the planning task; implementation and acceptance remain open.

## Comments

Planning baseline: full diary-v3 parity is mandatory; beta is an intermediate test activity. Append implementation decisions, findings and evidence here without rewriting history.
