# [58] Extend encrypted draft persistence to complete-product authoring

Status: ready-for-agent
Execution: complete (F0/F9 encrypted authoring foundation)
Type: AFK
Phase: F0/F9
Work area: diary-app
Requirements: X01
Source stories: US-098, US-102

## Parent and outcome

[Full-product PRD](../PRD.md) · [Issue index](../ISSUES.md) · [Common delivery rules](../ISSUE-BREAKDOWN.md)

Deliver an additive draft foundation exercised by current Quick/Review, ready for full Diary, Note, Thesis, Plan and article editors.

## Implementation boundary

Native app implementation; inspect referenced service contracts before changing behavior. Follow the source-defined roles, contracts, financial/date semantics and failure behavior. Extend existing working code where applicable. The concrete starting references below are evidence and entry points, not permission to import Web/server runtime into native.

## Acceptance criteria

- [x] Specify per-entity owner/environment keys, schema versioning, serialization and lifecycle without replacing existing Quick/Review namespaces.
- [x] Opening a reader creates no draft; real edits persist; late reads/writes cannot overwrite newer local content.
- [x] Define source-compatible expiry/logout/discard and sensitive-field exclusions, with recovery/parse/storage-failure behavior.
- [x] Prove coexistence/reopen of Quick, multiple Reviews and one new synthetic authoring draft before consumers adopt the adapter.
- [x] Apply relevant PRD invariants and common translation/accessibility/owner-isolation rules; explain any non-applicable check in evidence.
- [x] Record actual commands/scenarios, source/build and results. No criterion is complete solely because code or an old screenshot exists.

## Blocked by

- [02: Align shared packages and prove previous-client compatibility](02-shared-package-compatibility.md)
- [04: Establish repeatable API and device acceptance for full parity](04-native-acceptance-harness.md)

Triage readiness describes specification quality. Start implementation only when required predecessor outputs are accepted; missing unrelated release credentials do not block independent product work.

## Source and starting points

- [src/quick/native-storage.ts](../../../src/quick/native-storage.ts)
- [src/quick/repository.ts](../../../src/quick/repository.ts)
- [src/reviews/repository.ts](../../../src/reviews/repository.ts)
- [plugins/with-draft-backup.cjs](../../../plugins/with-draft-backup.cjs)

## Verification plan

Storage/state tests plus native process-death/encryption evidence on an additive schema and owner-switch fixtures.

Use synthetic data and controlled provider/service fixtures. Native storage/network/link/notification/upgrade claims require actual runtime evidence. If the implementation modifies a shared contract or backend, record current and previously supported client results.

## Evidence

The additive encrypted authoring-draft foundation is accepted, with native SQLCipher restart evidence and stale-revision/read-noncreation tests below. The #57 service protocol and its PostgreSQL acceptance are complete; automatic write replay remains disabled. Consumer-specific integration continues in #10 and other authoring tickets.

## Comments

Planning baseline: full diary-v3 parity is mandatory; beta is an intermediate test activity. Append implementation decisions, findings and evidence here without rewriting history.

2026-09-26: Added the additive `authoring_drafts` repository on the existing SQLCipher database, versioned payloads, monotonic revisions, explicit migrations, sensitive-field rejection and owner/environment-scoped logout cleanup. Quick and Review tables remain separate. `npx vitest run tests/unit/authoring-drafts.test.ts` passed 5 host SQLite tests covering empty reads without row creation, stale-revision rejection, failed/missing migrations, corrupt rows, storage failure, sensitive fields, owner/environment isolation, coexistence with the existing repositories, and SQLite close/reopen. These host tests use Node SQLite, not native SQLCipher. The developer-only synthetic probe supplements them with a typed real edit on Android SQLCipher, process-death restore and cleanup. Production editor screens and their specific navigation/session races remain in downstream consumer tickets; they are outside this adapter-foundation acceptance.

2026-09-26 native runtime evidence: Added [developer-only probe](../../../src/app/__dev/authoring-draft-probe.tsx), which redirects to `/` outside `__DEV__` and uses only a synthetic owner plus the `.invalid` environment. On the Android 16/API 36 AVD, opening the probe read no existing row; an explicit TextInput edit saved revision 1. SQLCipher reported `4.7.0 community`. After `adb shell am force-stop com.etklam.diaryapp`, a fresh process (PID 5857 → 6038) and reopened Metro route restored `final synthetic process proof` and revision 1. The probe then removed only its synthetic owner and a fresh read showed no row. The production Android bundle contains none of the probe's screen-label, clear-action or synthetic-owner markers. The first cold deep link opened the development-client server selector, so the recorded restore reselected Metro before opening the probe; this is not standalone-link acceptance. `npm run android:build` and the native `npm run verify` at that time passed. The current DB-enabled `npm test` pass is 28 files/218 tests with the former three PostgreSQL-gated app API cases enabled. Expo's [SDK 57 SQLite reference](https://docs.expo.dev/versions/v57.0.0/sdk/sqlite/) documents the configured SQLCipher option and persistence across app restarts. This proves the draft foundation; signed standalone authoring flows remain in release acceptance.
