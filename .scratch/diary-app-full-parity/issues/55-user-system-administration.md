# [55] Manage users, system statistics and authorized admin Diaries

Status: ready-for-agent
Execution: not-started
Type: AFK
Phase: F8
Work area: diary-app
Requirements: C04
Source stories: US-096

## Parent and outcome

[Full-product PRD](../PRD.md) · [Issue index](../ISSUES.md) · [Common delivery rules](../ISSUE-BREAKDOWN.md)

Implement all source user/system administrative views rather than just a user list.

## Implementation boundary

Native app implementation; inspect referenced service contracts before changing behavior. Follow the source-defined roles, contracts, financial/date semantics and failure behavior. Extend existing working code where applicable. The concrete starting references below are evidence and entry points, not permission to import Web/server runtime into native.

## Acceptance criteria

- [ ] Search/page users and show source account fields/counts; edit roles and confirm deletion.
- [ ] Enforce self-delete/self-role guards and authoritative role lookup; deleting a user revokes dependent HTTP/key/realtime access.
- [ ] Include source system counts/recent activity and paginated admin Diary projection without private Review reflections.
- [ ] Rejected or concurrent admin changes leave unrelated users/data intact and preserve current query context.
- [ ] Apply relevant PRD invariants and common translation/accessibility/owner-isolation rules; explain any non-applicable check in evidence.
- [ ] Record actual commands/scenarios, source/build and results. No criterion is complete solely because code or an old screenshot exists.

## Blocked by

- [07: Change password and revoke all sessions from the app](07-account-security.md)
- [15: Correct transactions and safely delete Diaries or ledger rows](15-ledger-corrections-deletion.md)

Triage readiness describes specification quality. Start implementation only when required predecessor outputs are accepted; missing unrelated release credentials do not block independent product work.

## Source and starting points

- [../diary-v3/apps/api/src/admin-users.ts](../../../../diary-v3/apps/api/src/admin-users.ts)
- [../diary-v3/docs/design/admin-users-brief.md](../../../../diary-v3/docs/design/admin-users-brief.md)
- [../diary-v3/tests/integration/admin-users-http.test.ts](../../../../diary-v3/tests/integration/admin-users-http.test.ts)

## Verification plan

Admin/USER/self-action matrix, synthetic private markers and two-client role/deletion revocation flow.

Use synthetic data and controlled provider/service fixtures. Native storage/network/link/notification/upgrade claims require actual runtime evidence. If the implementation modifies a shared contract or backend, record current and previously supported client results.

## Evidence

NOT RUN. This ticket was created by the planning task; implementation and acceptance remain open.

## Comments

Planning baseline: full diary-v3 parity is mandatory; beta is an intermediate test activity. Append implementation decisions, findings and evidence here without rewriting history.
