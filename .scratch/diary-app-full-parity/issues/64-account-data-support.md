# [64] Complete account recovery, deletion access and accurate support/privacy

Status: ready-for-agent
Execution: not-started
Type: AFK
Phase: F10
Work area: diary-app + diary-v3 + operator
Requirements: A01, A02, C01, X05
Source stories: US-009, US-010, US-114

## Parent and outcome

[Full-product PRD](../PRD.md) · [Issue index](../ISSUES.md) · [Common delivery rules](../ISSUE-BREAKDOWN.md)

Provide real public-user account/data support and accurate in-app disclosures for the finished product.

## Implementation boundary

App/service integration; apply the instructions and permissions of each repository before changing it. Follow the source-defined roles, contracts, financial/date semantics and failure behavior. Extend existing working code where applicable. The concrete starting references below are evidence and entry points, not permission to import Web/server runtime into native.

## Acceptance criteria

- [ ] Implement the selected working account-recovery and account/data-deletion request path with identity verification and real service handling.
- [ ] Expose privacy/support/deletion resources from the app and required external pages; reflect actual retention, location, providers and push/offline behavior.
- [ ] Avoid reusing an admin privilege bypass for self-service operations; verify scope, related-data handling and session/device revocation.
- [ ] Keep diagnostics opt-in/sanitized; operator confirms policy facts and actual fulfillment rather than a placeholder promise.
- [ ] Apply relevant PRD invariants and common translation/accessibility/owner-isolation rules; explain any non-applicable check in evidence.
- [ ] Record actual commands/scenarios, source/build and results. No criterion is complete solely because code or an old screenshot exists.

## Blocked by

- [05: Supply release, hosting, provider and device inputs](05-operator-release-inputs.md)
- [07: Change password and revoke all sessions from the app](07-account-security.md)
- [55: Manage users, system statistics and authorized admin Diaries](55-user-system-administration.md)

Triage readiness describes specification quality. Start implementation only when required predecessor outputs are accepted; missing unrelated release credentials do not block independent product work.

## Source and starting points

- [src/beta/help.tsx](../../../src/beta/help.tsx)
- [src/beta/diagnostics.ts](../../../src/beta/diagnostics.ts)
- [config/release.cjs](../../../config/release.cjs)
- [../diary-v3/apps/api/src/admin-users.ts](../../../../diary-v3/apps/api/src/admin-users.ts)

## Verification plan

Synthetic recovery/deletion support round trip, privacy-link review and no secret/private-content diagnostic checks.

Use synthetic data and controlled provider/service fixtures. Native storage/network/link/notification/upgrade claims require actual runtime evidence. If the implementation modifies a shared contract or backend, record current and previously supported client results.

## Evidence

NOT RUN. This ticket was created by the planning task; implementation and acceptance remain open.

## Comments

Planning baseline: full diary-v3 parity is mandatory; beta is an intermediate test activity. Append implementation decisions, findings and evidence here without rewriting history.
