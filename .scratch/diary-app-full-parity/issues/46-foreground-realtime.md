# [46] Receive authenticated realtime updates and reconcile on resume

Status: ready-for-agent
Execution: not-started
Type: AFK
Phase: F6
Work area: diary-app
Requirements: N03
Source stories: US-060, US-105

## Parent and outcome

[Full-product PRD](../PRD.md) · [Issue index](../ISSUES.md) · [Common delivery rules](../ISSUE-BREAKDOWN.md)

Connect native foreground signaling to the existing authenticated Socket.IO service and authoritative REST.

## Implementation boundary

Native app implementation; inspect referenced service contracts before changing behavior. Follow the source-defined roles, contracts, financial/date semantics and failure behavior. Extend existing working code where applicable. The concrete starting references below are evidence and entry points, not permission to import Web/server runtime into native.

## Acceptance criteria

- [ ] Use native token transport and source handshake rules without relying on browser cookies.
- [ ] Reconnection/app foreground refetches relevant state even when events were missed or duplicated.
- [ ] Logout, password change, logout-all and role/session revocation disconnect or reauthorize appropriately.
- [ ] Late A-account events cannot affect B-account views; failed socket connectivity does not disable ordinary REST use.
- [ ] Apply relevant PRD invariants and common translation/accessibility/owner-isolation rules; explain any non-applicable check in evidence.
- [ ] Record actual commands/scenarios, source/build and results. No criterion is complete solely because code or an old screenshot exists.

## Blocked by

- [07: Change password and revoke all sessions from the app](07-account-security.md)
- [44: Manage one-off and recurring Diary reminders](44-diary-reminders.md)
- [45: Configure and rearm complete Price Alerts](45-price-alerts.md)

Triage readiness describes specification quality. Start implementation only when required predecessor outputs are accepted; missing unrelated release credentials do not block independent product work.

## Source and starting points

- [../diary-v3/apps/api/src/websocket-auth.ts](../../../../diary-v3/apps/api/src/websocket-auth.ts)
- [../diary-v3/apps/api/src/socket-server.ts](../../../../diary-v3/apps/api/src/socket-server.ts)
- [../diary-v3/tests/integration/socket-auth-session.test.ts](../../../../diary-v3/tests/integration/socket-auth-session.test.ts)

## Verification plan

Controlled missed/duplicate events, token expiry and A → B/resume integration on native runtime.

Use synthetic data and controlled provider/service fixtures. Native storage/network/link/notification/upgrade claims require actual runtime evidence. If the implementation modifies a shared contract or backend, record current and previously supported client results.

## Evidence

NOT RUN. This ticket was created by the planning task; implementation and acceptance remain open.

## Comments

Planning baseline: full diary-v3 parity is mandatory; beta is an intermediate test activity. Append implementation decisions, findings and evidence here without rewriting history.
