# [51] Create, inspect and revoke scoped API keys

Status: ready-for-agent
Execution: complete (source API-key lifecycle)
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

- [x] Create supported scopes and show the secret only as allowed by the creation response.
- [x] List metadata and revoke keys, explaining capability boundaries and irreversible loss of a one-time secret.
- [x] Keep keys/passwords out of persistence, analytics and diagnostics; handle explicit copy behavior safely.
- [x] Revoked/insufficient-scope requests fail under canonical contracts and other keys remain unaffected; expiry is not applicable because the approved source lifecycle defines no expiry field or behavior.
- [x] Apply relevant PRD invariants and common translation/accessibility/owner-isolation rules; explain any non-applicable check in evidence.
- [x] Record actual commands/scenarios, source/build and results. No criterion is complete solely because code or an old screenshot exists.

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

The native API-key lifecycle matches the source contract. The release owner chose to preserve that lifecycle; the source has no expiry field or expiry behavior, so expiry remains explicitly unsupported and was not added to the contract or backend. The physical-device clipboard review remains in #65.

## Comments

Planning baseline: full diary-v3 parity is mandatory; beta is an intermediate test activity. Append implementation decisions, findings and evidence here without rewriting history.

2026-09-26: Added create/list/revoke account-service calls and an owner-epoch-fenced in-memory editor for `DIARY_CREATE` and `AGENT_WRITE`. The editor displays the complete secret only from the create response, offers an explicit Clipboard action using SDK 57 `expo-clipboard`, clears the secret on hide, route blur, app background and disposal, and never includes it in persisted drafts or diagnostics. Lost create responses trigger a metadata-only refresh and block another create until the user explicitly acknowledges that a second key may be issued. Key prefixes, scope descriptions, server timestamps, confirmation-before-revoke, accessibility labels and EN/zh-TW/zh-CN copy are present. `npx expo install expo-clipboard` and `npx expo install --fix` aligned dependencies; `npm run dependencies:check` and `npm run doctor` (21/21) pass. `npx vitest run tests/unit/api-keys.test.ts` passes 4 model/service tests. The initial host verification passed lint, typecheck, unit tests and Android JS bundling while PostgreSQL-gated acceptance was still pending; the follow-up below supersedes that limitation.
- Android guest-route smoke: opening `diaryapp://api-keys` while signed out displayed only the sign-in screen; see [runtime evidence](../../../docs/evidence/android-guest-route-guards.md). Authenticated API verification is recorded below; physical-device copy/revoke acceptance remains part of #65.

2026-09-26 API acceptance: [api-keys-api.test.ts](../../../tests/api/api-keys-api.test.ts) passed against the disposable PostgreSQL API, exercising the app account service and one-time-secret manager, metadata-only reload, owner isolation, `DIARY_CREATE` writes, `AGENT_WRITE` use, insufficient-scope denial, revocation denial and unaffected second-key behavior. `npm exec vitest run tests/integration/api-key-http.test.ts` in `diary-v3` passed 7/7 PostgreSQL HTTP scenarios for digest-only storage, one-time reveal, owner privacy, scope checks, revocation and creation limits. The contracts/backend have no `expiresAt`, so no expired-key response is claimed; a release-owner decision is requested before expanding the source API.

2026-09-26 release-owner decision: preserve the source lifecycle. No shared contract, database migration or server expiry behavior was added; the expired-key subclause is not applicable to the approved source scope.
