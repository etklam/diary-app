# [18] Create, manage and link complete Trade Plans

Status: ready-for-agent
Execution: in-progress
Type: AFK
Phase: F2
Work area: diary-app
Requirements: D09
Source stories: US-034, US-035, US-036, US-037

## Parent and outcome

[Full-product PRD](../PRD.md) · [Issue index](../ISSUES.md) · [Common delivery rules](../ISSUE-BREAKDOWN.md)

Deliver Plan list/detail/editor and lifecycle with direct Diary linkage.

## Implementation boundary

Native app implementation; inspect referenced service contracts before changing behavior. Follow the source-defined roles, contracts, financial/date semantics and failure behavior. Extend existing working code where applicable. The concrete starting references below are evidence and entry points, not permission to import Web/server runtime into native.

## Acceptance criteria

- [x] Round-trip entry range, stop, target, position limit and invalidation fields as exact canonical values.
- [ ] Provide source search/filter/pagination, supported lifecycle, edit and confirmed delete.
- [x] Link/unlink only the same owner's Diary and navigate both directions without losing plan context.
- [ ] Invalid zones/transitions/ownership and network failures retain input and never invent a saved state.
- [ ] Apply relevant PRD invariants and common translation/accessibility/owner-isolation rules; explain any non-applicable check in evidence.
- [x] Record actual commands/scenarios, source/build and results. No criterion is complete solely because code or an old screenshot exists.

## Blocked by

- [10: Create and edit complete Diary content with durable recovery](10-full-diary-editor.md)
- [08: Implement complete preferences, localization and themes](08-preferences-localization.md)

Triage readiness describes specification quality. Start implementation only when required predecessor outputs are accepted; missing unrelated release credentials do not block independent product work.

## Source and starting points

- [../diary-v3/packages/contracts/src/trade-plan.ts](../../../../diary-v3/packages/contracts/src/trade-plan.ts)
- [../diary-v3/apps/api/src/trade-plans.ts](../../../../diary-v3/apps/api/src/trade-plans.ts)
- [../diary-v3/tests/e2e/trade-plans.spec.ts](../../../../diary-v3/tests/e2e/trade-plans.spec.ts)

## Verification plan

Create → activate/update → link/read Diary → unlink/delete plus decimal and ownership fixtures.

Use synthetic data and controlled provider/service fixtures. Native storage/network/link/notification/upgrade claims require actual runtime evidence. If the implementation modifies a shared contract or backend, record current and previously supported client results.

## Evidence

2026-09-27 source/API and build evidence (native UI acceptance still open): app starting HEAD `471b63381bc3b612e6bdb0ae4d127554ded30f0b`; source service HEAD `ce2962f597ef56dc4e4cb8966c1ca1860369e006`; Expo 57 SDK and Router versioned references read before code. The native module adds list/filter/page, detail/editor, all source fields and four statuses, Diary chooser/link/unlink, confirmed delete, owner capability checks, exact decimal-string parsing, conservative no-retry writes and owner/environment-scoped encrypted authoring drafts. Source API has no restricted status transition graph: `draft`, `active`, `closed`, `cancelled` are all accepted enum values; invalid status/zone fails contract validation.

Commands/results:

- `npx vitest run tests/unit/trade-plans.test.ts` — 3 passed (decimal/zone precision, query and safe route parsing, foreign/mismatched response, lost response and expired owner capability).
- `DIARY_DISPOSABLE_TEST_ENV=1 DIARY_API_BASE_URL=http://127.0.0.1:3201 npx vitest run tests/api/trade-plans-api.test.ts` — 1 passed against a disposable PostgreSQL service. Two synthetic owners; created a synthetic Diary; created a Plan with six-decimal prices and `9007199254740991.01` position limit; read Diary link, rejected cross-owner Plan read/update and Diary link, filtered/sorted/paged, updated draft → active → closed while unlinking, deleted Plan. Cleanup targeted the created Plan and Diary IDs, logged out both sessions, then sent `stop` to the fixture server for source-owned database disposal. No existing user data or drafts were touched.
- `npm run typecheck` — passed. `npm run lint` — passed.
- `node scripts/expo-command.mjs export --platform android --output-dir .scratch/trade-plans/android-bundle` — passed, Android Hermes bundle SHA-256 `0DF2660CD0CC492BF1CF2960C630CAF6A44AEE085F856E60C5B703DB23A7A9AE`.

Pending: verify create/edit/filter/link/navigation/delete, all three locales, light/dark, large text, force-stop draft recovery, rejected/uncertain network responses, and Back behavior on the shared Android AVD after the #14 acceptance run releases it. Diary detail now includes Plan creation prelinked to that Diary and opens linked Plans, but these routes have not been verified on device. Android bundle and host tests do not establish native runtime behavior or iOS acceptance. No shared contract/backend change was made, so previous-client compatibility testing is not applicable to this slice.

## Comments

Planning baseline: full diary-v3 parity is mandatory; beta is an intermediate test activity. Append implementation decisions, findings and evidence here without rewriting history.
2026-09-27: Source/API implementation and host verification added as above. Keep execution in progress until native acceptance and Diary-side navigation are verified.
2026-09-27: Added the Diary-side navigation and a dirty Back guard offering keep/discard with an encrypted flush; unresolved attempts can only be retained. `npm run typecheck` and `npm run lint` both passed after this integration. Native Back behavior remains untested because the AVD is reserved for #14. The confirmed-delete/local-cleanup failure path still needs a narrow correction before acceptance.
2026-09-27: Subsequent native work and the confirmed-delete/local-cleanup correction supersede the pending items in the preceding note. See [F2 Trade Plans acceptance](../../../docs/evidence/f2/trade-plans-acceptance.md): four focused unit tests, disposable service/API lifecycle and owner isolation, lint, scoped TypeScript, final Android export, and Android native create/draft restart/link/lifecycle/filter/delete scenarios passed. Synthetic Plan `1` and Diary `233` were deleted by their exact IDs. The AVD was released to #14 after the run. Execution remains in progress because native symbol search/pagination over 20, invalid zone and network-failure states, additional locales/themes/large text and iOS were not exercised. Global typecheck is temporarily failing in staged #16 tests outside #18; scoped app+#18 TypeScript passed.
