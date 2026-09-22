# [07] Change password and revoke all sessions from the app

Status: ready-for-agent
Execution: done
Type: AFK
Phase: F1
Work area: diary-app
Requirements: A02
Source stories: US-004, US-005, US-009, US-010

## Parent and outcome

[Full-product PRD](../PRD.md) · [Issue index](../ISSUES.md) · [Common delivery rules](../ISSUE-BREAKDOWN.md)

Expose the source password-change and logout-all operations with accurate session and unsaved-work behavior.

## Implementation boundary

Native app implementation; inspect referenced service contracts before changing behavior. Follow the source-defined roles, contracts, financial/date semantics and failure behavior. Extend existing working code where applicable. The concrete starting references below are evidence and entry points, not permission to import Web/server runtime into native.

## Acceptance criteria

- [x] Validate current/new password with canonical errors; never persist password fields in drafts or reports.
- [x] Successful security actions invalidate the specified native/Web/realtime access and prompt the correct reauthentication behavior.
- [x] Rejected/uncertain requests are distinguished without blindly repeating security mutations.
- [x] Draft ownership/expiry behavior survives remote revocation and switching accounts; no stale callback restores revoked access.
- [x] Apply relevant PRD invariants and common translation/accessibility/owner-isolation rules; explain any non-applicable check in evidence.
- [x] Record actual commands/scenarios, source/build and results. No criterion is complete solely because code or an old screenshot exists.

## Blocked by

- [06: Complete registration and guest-to-account continuation](06-registration-guest-continuation.md)

Triage readiness describes specification quality. Start implementation only when required predecessor outputs are accepted; missing unrelated release credentials do not block independent product work.

## Source and starting points

- [src/auth/lifecycle.ts](../../../src/auth/lifecycle.ts)
- [../diary-v3/apps/web/app/routes/account-security.tsx](../../../../diary-v3/apps/web/app/routes/account-security.tsx)
- [../diary-v3/tests/integration/account-security.test.ts](../../../../diary-v3/tests/integration/account-security.test.ts)

## Verification plan

Two-client API/native acceptance for wrong password, successful change, logout-all and old-token denial.

Use synthetic data and controlled provider/service fixtures. Native storage/network/link/notification/upgrade claims require actual runtime evidence. If the implementation modifies a shared contract or backend, record current and previously supported client results.

## Evidence

Accepted 2026-09-23 within F1 scope. See [native design](../../../docs/f1-design.md), [commands and scenarios](../../../docs/f1-acceptance.md) and [layered acceptance evidence](../../../docs/evidence/f1/acceptance.md). Lint, TypeScript, 182 host tests, three disposable API cases, two source realtime cases, Android export and all three native tracers passed. Signed standalone, physical-device and iOS acceptance remain release tickets.

## Comments

Planning baseline: full diary-v3 parity is mandatory; beta is an intermediate test activity. Append implementation decisions, findings and evidence here without rewriting history.
