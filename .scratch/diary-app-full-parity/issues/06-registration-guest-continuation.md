# [06] Complete registration and guest-to-account continuation

Status: ready-for-agent
Execution: done
Type: AFK
Phase: F1
Work area: diary-app
Requirements: A01, A04, T01
Source stories: US-001, US-002, US-003, US-009, US-010, US-104, US-105

## Parent and outcome

[Full-product PRD](../PRD.md) · [Issue index](../ISSUES.md) · [Common delivery rules](../ISSUE-BREAKDOWN.md)

Let guests use public destinations and register/sign in before explicitly completing a private action, retaining the existing native session model.

## Implementation boundary

Native app implementation; inspect referenced service contracts before changing behavior. Follow the source-defined roles, contracts, financial/date semantics and failure behavior. Extend existing working code where applicable. The concrete starting references below are evidence and entry points, not permission to import Web/server runtime into native.

## Acceptance criteria

- [x] Add validated registration and subsequent login using actual source contracts and canonical errors.
- [x] Preserve allowed destination/context across login, registration and expiry; authentication never auto-submits a private mutation.
- [x] Retain secure token-pair persistence, cold restore, current-client logout and A → B owner isolation.
- [x] Invalid credentials, unavailable API and late responses have recoverable states without leaking private content into guest views.
- [x] Apply relevant PRD invariants and common translation/accessibility/owner-isolation rules; explain any non-applicable check in evidence.
- [x] Record actual commands/scenarios, source/build and results. No criterion is complete solely because code or an old screenshot exists.

## Blocked by

- [02: Align shared packages and prove previous-client compatibility](02-shared-package-compatibility.md)
- [03: Design and implement the complete native navigation shell](03-native-navigation-design.md)
- [04: Establish repeatable API and device acceptance for full parity](04-native-acceptance-harness.md)

Triage readiness describes specification quality. Start implementation only when required predecessor outputs are accepted; missing unrelated release credentials do not block independent product work.

## Source and starting points

- [src/auth/context.tsx](../../../src/auth/context.tsx)
- [src/auth/runtime.ts](../../../src/auth/runtime.ts)
- [../diary-v3/apps/web/app/routes/register.tsx](../../../../diary-v3/apps/web/app/routes/register.tsx)

## Verification plan

Disposable registration/login/revocation cases and native guest → private action → sign in → explicit save flow.

Use synthetic data and controlled provider/service fixtures. Native storage/network/link/notification/upgrade claims require actual runtime evidence. If the implementation modifies a shared contract or backend, record current and previously supported client results.

## Evidence

Accepted 2026-09-23 within F1 scope. See [native design](../../../docs/f1-design.md), [commands and scenarios](../../../docs/f1-acceptance.md) and [layered acceptance evidence](../../../docs/evidence/f1/acceptance.md). Lint, TypeScript, 182 host tests, three disposable API cases, two source realtime cases, Android export and all three native tracers passed. Signed standalone, physical-device and iOS acceptance remain release tickets.

## Comments

Planning baseline: full diary-v3 parity is mandatory; beta is an intermediate test activity. Append implementation decisions, findings and evidence here without rewriting history.
