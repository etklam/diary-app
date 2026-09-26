# [49] Manage Partner invitations and independent sharing settings

Status: ready-for-agent
Execution: done
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

- [x] Invite/accept/withdraw/unlink using existing identity and relationship contracts.
- [x] Expose independent Diary/Stock Note sharing controls with exact one-directional semantics.
- [x] Distinguish no partner, pending, connected/not-sharing and permission/network failures.
- [x] Refresh permissions on resume and clear revoked/private partner context after logout/unlink.
- [x] Apply relevant PRD invariants and common translation/accessibility/owner-isolation rules; explain any non-applicable check in evidence.
- [x] Record actual commands/scenarios and build results. No criterion is complete solely because code or an old screenshot exists.

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

Accepted for the F7 Partner-management scope. The app-client and backend PostgreSQL two-account journeys below cover invitations, authorization, directional sharing, withdrawal and unlink. Full release-device accessibility review remains under ticket #65.

## Implementation evidence

- Added private `/partners` management using canonical invite/list/accept/share/delete contracts. Pending incoming/outgoing and connected states are distinct; incoming links can be accepted, outgoing invitations withdrawn, and connected relationships removed with confirmation.
- Sharing controls update only the current owner's selected flag (`shareDiaries` or `shareStockNotes`) and display the other owner's independent flags separately. Accepting an invite does not enable either share type.
- Every write disables automatic session retry. Uncertain responses lock further writes until the owner explicitly refreshes. The list refreshes on screen focus and app resume; the app-resume refresh cannot silently clear an uncertain-write lock. The screen is keyed to the authenticated owner and stores no partner data locally; unlink removes the row immediately and logout unmounts the view.
- Added five unit tests covering normalized identity/no-retry invite, independent share semantics, uncertain-write locking and explicit refresh (including background resume), late response suppression after scope change, and manager reload after effect cleanup. `npm run verify` passed: lint, TypeScript, 211 tests passed (3 existing database-gated API tests skipped), Android bundle export.
- The source service rejects self-invites, enforces recipient-only acceptance, requires a connected relation before sharing, and authorizes either participant for unlink. The original “PostgreSQL unavailable” note is superseded by the dated acceptance below. Device-level accessibility review remains part of #65.
- Android guest-route smoke: opening `diaryapp://partners` while signed out displayed only the sign-in screen; see [runtime evidence](../../../docs/evidence/android-guest-route-guards.md). The authenticated two-account and backend authorization scenarios are recorded below.

2026-09-26 acceptance: [partners-api.test.ts](../../../tests/api/partners-api.test.ts) passed against the disposable API, using three synthetic accounts to verify empty state, normalized invitation, incoming/outgoing status, initiator rejection, recipient acceptance, independent Diary and Stock Note sharing, outgoing withdrawal, connected unlink and both owners' post-unlink lists. `npm exec vitest run tests/integration/partner-http.test.ts` in `diary-v3` passed 8/8 PostgreSQL HTTP tests for ownership and permission behavior, sharing revocation, cross-owner restrictions, and related partner-note authorization. Existing manager tests cover uncertainty, resume refresh, and scope-change fencing.

## Comments

Planning baseline: full diary-v3 parity is mandatory; beta is an intermediate test activity. Append implementation decisions, findings and evidence here without rewriting history.
