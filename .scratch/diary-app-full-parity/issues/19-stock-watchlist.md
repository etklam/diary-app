# [19] Manage stock Watchlist and enter Company research

Status: ready-for-agent
Execution: done
Type: AFK
Phase: F3
Work area: diary-app
Requirements: R01
Source stories: US-045, US-046

## Parent and outcome

[Full-product PRD](../PRD.md) · [Issue index](../ISSUES.md) · [Common delivery rules](../ISSUE-BREAKDOWN.md)

Implement the complete personal stock Watchlist rather than a read-only list.

## Implementation boundary

Native app implementation; inspect referenced service contracts before changing behavior. Follow the source-defined roles, contracts, financial/date semantics and failure behavior. Extend existing working code where applicable. The concrete starting references below are evidence and entry points, not permission to import Web/server runtime into native.

## Acceptance criteria

- [x] Add normalized symbols, edit existing tracking/status fields and remove with source semantics.
- [x] Handle duplicates, pagination/source limits and no-data states correctly.
- [x] Late responses, expired sessions and uncertain mutations cannot show another owner's Watchlist or lose edits.
- [x] Provide Company navigation with stable selection/back context.
- [x] Apply relevant PRD invariants and common translation/accessibility/owner-isolation rules; explain any non-applicable check in evidence.
- [x] Record actual commands/scenarios and build results. No criterion is complete solely because code or an old screenshot exists.

## Blocked by

- [06: Complete registration and guest-to-account continuation](06-registration-guest-continuation.md)
- [08: Implement complete preferences, localization and themes](08-preferences-localization.md)

Triage readiness describes specification quality. Start implementation only when required predecessor outputs are accepted; missing unrelated release credentials do not block independent product work.

## Source and starting points

- [../diary-v3/apps/api/src/watchlist.ts](../../../../diary-v3/apps/api/src/watchlist.ts)
- [../diary-v3/packages/contracts/src/watchlist.ts](../../../../diary-v3/packages/contracts/src/watchlist.ts)

## Verification plan

Native add/edit/status/remove round trip with duplicate, account-switch and network-failure cases.

Use synthetic data and controlled provider/service fixtures. Native storage/network/link/notification/upgrade claims require actual runtime evidence. If the implementation modifies a shared contract or backend, record current and previously supported client results.

## Evidence

Accepted for the F3 Watchlist scope. App-client HTTP round trips and the backend's PostgreSQL source-cap scenarios passed on 2026-09-26; see the dated acceptance evidence under Comments. Full Company Hub data remains in ticket #20, and end-to-end release/device acceptance remains in #65.

## Implementation evidence

- Added an owner-scoped Watchlist service using the generated stock Watchlist endpoints and canonical schemas. Symbols are trimmed and uppercased by `stockSymbolSchema`; sort edits use the source `0..10000` bound; remove archives the entry; adding an archived symbol follows the server upsert/restore behavior.
- Added a private Watchlist screen from Research. It shows the source's first 100 active entries, source order/latest-research/symbol sorting, latest research context, empty/loading/error states, accessible sort controls, explicit order saves and confirmed archive. Dirty symbol/order fields remain on rejected or uncertain saves. A possibly delivered write blocks further mutations until the user refreshes the list. A stale list response cannot update state after its owner scope expires.
- Company entry uses `/stocks/{symbol}` and preserves the selected symbol/back stack. The destination clearly reports that full Company Hub data is not yet implemented; that work remains in ticket #20.
- Initial implementation host verification passed lint, TypeScript, unit tests and Android bundle export, but left database-gated HTTP scenarios unaccepted while PostgreSQL was unavailable. That limitation is superseded by the 2026-09-26 acceptance run below.
- Owner isolation relies on the authenticated `DiaryReadScope`; no cached Watchlist data is stored. On scope change the component key resets local state. Unauthorized responses disable writes and offer session verification. Copy and controls are localized and expose labels, roles and selected/disabled states. Screen-reader/device review remains part of native acceptance.
- Android guest-route smoke: opening `diaryapp://watchlist` while signed out displayed only the sign-in screen; see [runtime evidence](../../../docs/evidence/android-guest-route-guards.md). This does not replace authenticated owner-isolation or Watchlist API round-trip acceptance.

2026-09-26 acceptance: `npm run lint`, `npm run typecheck`, and `npm test` in `diary-app` passed (25 files, 215 tests) with `DIARY_DISPOSABLE_TEST_ENV=1` and `DIARY_API_BASE_URL=http://127.0.0.1:3101`. The new [Watchlist app-client acceptance test](../../../tests/api/watchlist-api.test.ts) exercised an empty list, trimmed/uppercased symbols, duplicate identity, ordering, archive/restore, null research records, and owner isolation against the disposable API. In `diary-v3`, `npm exec vitest run tests/integration/watchlist.test.ts` passed 4/4 PostgreSQL HTTP tests, including concurrent duplicate creates and a 102-entry fixture proving deterministic first-100 source behavior. The native list reports the 100-entry source limit and shows the no-research state; editing/removal of an item exposes later source entries as earlier entries are archived. The live Company destination remains explicitly scoped to ticket #20.

## Comments

Planning baseline: full diary-v3 parity is mandatory; beta is an intermediate test activity. Append implementation decisions, findings and evidence here without rewriting history.
