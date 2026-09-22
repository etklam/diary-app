# [48] Receive native push and open authorized destinations

Status: ready-for-agent
Execution: not-started
Type: AFK
Phase: F6
Work area: diary-app
Requirements: X02, X05
Source stories: US-060, US-098

## Parent and outcome

[Full-product PRD](../PRD.md) · [Issue index](../ISSUES.md) · [Common delivery rules](../ISSUE-BREAKDOWN.md)

Complete Android permission/enrollment/receive/tap behavior and safe cold-start routing.

## Implementation boundary

Native app implementation; inspect referenced service contracts before changing behavior. Follow the source-defined roles, contracts, financial/date semantics and failure behavior. Extend existing working code where applicable. The concrete starting references below are evidence and entry points, not permission to import Web/server runtime into native.

## Acceptance criteria

- [ ] Configure Expo 57 native notifications and register actual tokens with the accepted service; denial retains in-app reminders.
- [ ] Handle foreground/background/cold-start taps and expiry/login continuation with validated route identifiers.
- [ ] Revalidate ownership and deleted/unshared targets; receiving a payload grants no access.
- [ ] Unregister/reassociate on logout/account change and prevent duplicate navigation or previous-owner content.
- [ ] Apply relevant PRD invariants and common translation/accessibility/owner-isolation rules; explain any non-applicable check in evidence.
- [ ] Record actual commands/scenarios, source/build and results. No criterion is complete solely because code or an old screenshot exists.

## Blocked by

- [05: Supply release, hosting, provider and device inputs](05-operator-release-inputs.md)
- [46: Receive authenticated realtime updates and reconcile on resume](46-foreground-realtime.md)
- [47: Add owner-bound device enrollment and server push delivery](47-push-delivery-service.md)

Triage readiness describes specification quality. Start implementation only when required predecessor outputs are accepted; missing unrelated release credentials do not block independent product work.

## Source and starting points

- [app.config.ts](../../../app.config.ts)
- [src/auth/lifecycle.ts](../../../src/auth/lifecycle.ts)
- [src/app/_layout.tsx](../../../src/app/_layout.tsx)

## Verification plan

Physical-device signed build receives a synthetic event, opens the right record, and passes denial/logout/account-switch scenarios.

Use synthetic data and controlled provider/service fixtures. Native storage/network/link/notification/upgrade claims require actual runtime evidence. If the implementation modifies a shared contract or backend, record current and previously supported client results.

## Evidence

NOT RUN. This ticket was created by the planning task; implementation and acceptance remain open.

## Comments

Planning baseline: full diary-v3 parity is mandatory; beta is an intermediate test activity. Append implementation decisions, findings and evidence here without rewriting history.
