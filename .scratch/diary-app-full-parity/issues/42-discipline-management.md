# [42] Create, reorder and randomly review Discipline entries

Status: ready-for-agent
Execution: done
Type: AFK
Phase: F6
Work area: diary-app
Requirements: N04
Source stories: US-061, US-062, US-063

## Parent and outcome

[Full-product PRD](../PRD.md) · [Issue index](../ISSUES.md) · [Common delivery rules](../ISSUE-BREAKDOWN.md)

Implement the entire private principles collection with source ordering and random-draw behavior.

## Implementation boundary

Native app implementation; inspect referenced service contracts before changing behavior. Follow the source-defined roles, contracts, financial/date semantics and failure behavior. Extend existing working code where applicable. The concrete starting references below are evidence and entry points, not permission to import Web/server runtime into native.

## Acceptance criteria

- [x] Create/edit/delete entries and reorder them with explicit accessible controls.
- [x] Random selection distinguishes user content from any source fallback quotation.
- [x] Long collections stay reachable; concurrent reorder/delete and failed writes preserve consistent state.
- [x] Keep owner isolation, dirty input and truthful uncertain-save feedback.
- [x] Apply relevant PRD invariants and common translation/accessibility/owner-isolation rules; explain any non-applicable check in evidence.
- [x] Record actual commands/scenarios and build results. No criterion is complete solely because code or an old screenshot exists.

## Blocked by

- [06: Complete registration and guest-to-account continuation](06-registration-guest-continuation.md)
- [08: Implement complete preferences, localization and themes](08-preferences-localization.md)

Triage readiness describes specification quality. Start implementation only when required predecessor outputs are accepted; missing unrelated release credentials do not block independent product work.

## Source and starting points

- [../diary-v3/apps/api/src/discipline.ts](../../../../diary-v3/apps/api/src/discipline.ts)
- [../diary-v3/tests/e2e/discipline.spec.ts](../../../../diary-v3/tests/e2e/discipline.spec.ts)

## Verification plan

Native create/edit/reorder/random/delete sequence and API ownership/concurrent ordering tests.

Use synthetic data and controlled provider/service fixtures. Native storage/network/link/notification/upgrade claims require actual runtime evidence. If the implementation modifies a shared contract or backend, record current and previously supported client results.

## Evidence

Accepted for the F2 Discipline-management scope. The dated PostgreSQL and app-client acceptance runs below cover long lists, concurrent reorder/delete, rollback and ownership. Full screen-reader and release-device sign-off remains in ticket #65.

## Implementation evidence

- Added private `/discipline` with localized create/edit/delete, server reorder via explicit accessible Move up/Move down controls, created dates in the account timezone, and server-random selection. `isCustom` controls the label and only the three recognized source fallback strings are translated; arbitrary user content remains untouched.
- The owner-scoped service validates all request/response schemas and IDs. Mutations opt out of automatic session retry. A lost create/edit/reorder/delete response is reconciled against a fresh owner list; ambiguous writes lock further writes until an explicit refresh, and failed saves retain the input. Reorders are applied only after a complete server response, never optimistically. A dirty form uses the navigation removal guard. Private continuation accepts the implemented route only.
- Added six unit tests for fallback-vs-user text, lost-create reconciliation/no retry, unresolved write lock and explicit refresh, server-confirmed reorder, late owner-scope response suppression, and manager reload after effect cleanup. `npm run verify` passed: lint, TypeScript, 211 tests passed (3 existing DB-gated API tests skipped), Android bundle export.
- The list uses the source's complete server response in a scrollable native page. The original implementation note that PostgreSQL and API verification were pending is superseded by the dated acceptance below. Transfer/share remains ticket #43.
- Strings and controls support all three app locales, have screen-reader labels/roles/states, and use the private owner scope; no principle collection is cached locally. Device-level screen-reader review remains open.
- Android guest-route smoke: opening `diaryapp://discipline` while signed out displayed only the sign-in screen; see [runtime evidence](../../../docs/evidence/android-guest-route-guards.md). At that time concurrent database reorder/delete and authenticated-owner checks were still unverified; the acceptance follow-up below covers those service/API scenarios.

2026-09-26 acceptance: the app-client live API test [discipline-api.test.ts](../../../tests/api/discipline-api.test.ts) passed against the disposable service, creating and reading 128 entries, editing content, drawing custom content, racing a full reorder against deletion, confirming the final 127-row collection and owner isolation, then cleaning up the rows. `npm exec vitest run tests/integration/discipline-http.test.ts` in `diary-v3` passed 4/4 PostgreSQL scenarios, including a long 128-entry list, concurrent append/reorder/delete, mixed-owner rejection and a synthetic database-trigger failure proving reorder rollback. Existing manager tests cover uncertain-write retention and state updates only after server confirmation. The visible list uses a scrollable native page; on-device screen-reader review remains in #65.

## Comments

Planning baseline: full diary-v3 parity is mandatory; beta is an intermediate test activity. Append implementation decisions, findings and evidence here without rewriting history.
