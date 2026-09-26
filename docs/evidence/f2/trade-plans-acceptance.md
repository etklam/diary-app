# F2 Trade Plans acceptance record

Date: 2026-09-27  
Ticket: [#18](../../../.scratch/diary-app-full-parity/issues/18-trade-plans.md)  
Scope: native source, disposable PostgreSQL API, Android development client. Ticket remains in progress for the limitations below.

## Source and build

- App starting HEAD: `471b63381bc3b612e6bdb0ae4d127554ded30f0b`, with the #18 working-tree files listed in the ticket. Source service HEAD: `ce2962f597ef56dc4e4cb8966c1ca1860369e006`.
- Expo SDK 57 and its versioned Router reference were read before code. No native module, API, contract or database source was changed for this ticket.
- Android AVD: `emulator-5554`, previously recorded as Android 16/API 36. The installed development APK from `android/app/build/outputs/apk/debug/app-debug.apk` has SHA-256 `D0241A70C5219FDF22DCAC89B07D369981674F1294FE5F17DC809D8A44C81623`; the app loaded the current JavaScript through Metro on port 8081 and used the local API at `10.0.2.2:3101`. The APK predates the #18 JavaScript changes and is not a signed release build.
- Final isolated Android export: `node scripts/expo-command.mjs export --platform android --output-dir .scratch/trade-plans/android-bundle-final` passed; Hermes bundle SHA-256 `8217B1F78C78B9F2474A852335635BE22CE2581B2D671636D7812E5F6672D432`.

## Host and service verification

- `npx vitest run tests/unit/trade-plans.test.ts`: 4 passed. Cases cover exact strings/zone and precision validation, route/filter parsing, mismatched or foreign responses, uncertain and stale writes, and the confirmed-delete/local-cleanup boundary.
- `DIARY_DISPOSABLE_TEST_ENV=1 DIARY_API_BASE_URL=http://127.0.0.1:3201 npx vitest run tests/api/trade-plans-api.test.ts`: 1 passed against the source-owned disposable PostgreSQL service. It used two synthetic owners, exact six-decimal prices and `9007199254740991.01`, same-owner Diary linking, cross-owner Plan read/update and Diary-link rejection, symbol/status/sort/page requests, draft → active → closed, unlink and delete. The test removed its Plan/Diary IDs and logged out; the fixture server received `stop` and disposed its database.
- `npm run lint`: passed. `npx tsc --noEmit -p .scratch/trade-plans/tsconfig.json`: passed for all app source plus #18 tests. Global `npm run typecheck` was run but fails in staged #16 tests that reference a not-yet-implemented `src/diary-editor/review-schedule` and `reviewSchedule` fields. There were no #18 errors in that output.

## Android interaction

The native run used a newly registered synthetic owner (ID `139`), a synthetic Diary (ID `233`) and a single Plan (ID `1`). The existing AVD account had no authoring draft warning on logout. No existing account records or drafts were edited.

1. Opened `/trade-plans/new?diaryId=233`. The owner-checked Diary title appeared as the selected link. Entered symbol `PLNA` and setup `NativeSetup`; Android Back showed Stay, Keep encrypted draft and Discard draft. Chose Keep. Reopening showed exact input. Force-stopped the app without clearing data, relaunched it, and reopened the route; the same exact input remained.
2. Entered `123.123456` entry price, `120.000001`/`125.123456` zone, `115.000001` stop, `150.999999` target and `9007199254740991.01` position limit, plus synthetic invalidation and notes. Native Save opened the Plan detail. An owner API GET confirmed Plan `1`, status `draft`, Diary `233`, and all exact decimal strings.
3. The Plan's linked Diary action opened Diary `233`. Diary detail showed both a prelinked New Plan action and the linked `PLNA` Plan action; the latter returned to Plan `1`.
4. Changed status to `active` and saved; owner API GET confirmed `active` and Diary `233`. Unlinked the Diary, changed status to `closed`, saved; owner API GET confirmed `closed` and `diaryId: null`.
5. In the native list, filtering `active` showed an empty state. Filtering `closed` showed `PLNA` with exact zone/stop/target values and page `1 / 1`. The previous/next controls were correctly disabled for this one-page fixture.
6. Delete showed a native confirmation. Cancel kept the Plan detail; confirm returned to the empty list. Owner API GET for Plan `1` returned 404. The run then deleted only Diary `233` through the owner API and received `success: true`. The app signed out; it displayed a separate warning that server session revocation could not be confirmed.

Screenshots were visually inspected and contain only synthetic Plan content:

- [Back keep/discard prompt](trade-plans-back-prompt.png), SHA-256 `78064EFA1092E1B3155F7AFDFB44B3112CECA9CD13E206C570F1B667E1FDD3F2`.
- [Create form and linked Diary](trade-plans-create-form.png), SHA-256 `8F811D7AE130EC30E199560B2AF402F701F9FD118FB192295752ECA35E55EE7C`.
- [Closed status filter and exact levels](trade-plans-closed-list.png), SHA-256 `CA75D2EF960D4DA4791F1BFECF278A84E3079B4D88347322884DE5B19164C74C`.

## Remaining acceptance

The Android run did not test an inverted zone in the native form, forced network failure during create/update/delete, a cross-owner link entered through the UI, a list with more than 20 Plans, native symbol search, `cancelled` status, zh-CN/en Plan copy, dark mode, font scale 2.0 or spoken accessibility. Host and API checks cover their respective contract behavior, not these interactions. iOS and physical-device behavior remain untested. The service defines four enum statuses and no restricted transition graph, so there is no additional server transition rule to implement or claim.
