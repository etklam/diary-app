# F2 complete Diary editor acceptance

Date: 2026-09-26  
Ticket: [#10](../../../.scratch/diary-app-full-parity/issues/10-full-diary-editor.md)

## Environment and build

- Android 16 / API 36 x86_64 AVD `DiaryApp_API_36` (`emulator-5554`), package `com.etklam.diaryapp`.
- Expo SDK 57 development client loaded the app JavaScript from Metro at `192.168.0.167:8081`; the emulator API origin was `http://10.0.2.2:3101`.
- The API used the user's disposable service and PostgreSQL container at `127.0.0.1:3101` and `127.0.0.1:55433`. The test created no Diary records in the service; the editor lifecycle scenarios used a synthetic signed-in owner and local encrypted drafts only.
- Final Android export: `dist/android/_expo/static/js/android/entry-43de54a56fa86f76c34879396981a13f.hbc`, 4,837,511 bytes, SHA-256 `76435EE7656F7DC315E94FE9A6B4A51B3642AB9148C4084CCA527CD5C3BA62C6`.

## Verification

- `npm run verify` — passed lint, typecheck, 247 tests; 12 API tests were gated/skipped in this non-API run; Android export passed.
- `npm test -- tests/unit/diary-editor.test.ts tests/unit/authoring-drafts.test.ts` — 12 tests passed, including manager eviction and same-owner/date reopen after discard.
- With `DIARY_API_BASE_URL=http://127.0.0.1:3101` and `DIARY_DISPOSABLE_TEST_ENV=1`, `npm test -- tests/api/diary-editor-api.test.ts` — 1 live API test passed: explicit-date create/update/clear, related-record preservation, duplicate-day conflict and owner isolation.
- AVD route `diaryapp://diaries/editor?date=2026-09-26` — entered synthetic title/body and waited for “Encrypted draft saved on this device”; force-stopped `com.etklam.diaryapp`, relaunched the development client and route, and verified the restored banner plus exact title/body.
- Android Back showed Stay, Keep encrypted draft and Discard draft choices. Stay left the fields intact. Keep returned to Timeline and same-process re-entry restored the draft. Discard returned to Timeline; same-process re-entry opened a fresh editor showing “No local edits,” with no old title/body or restored banner. A subsequent process restart also remained clean.
- The same-process test found that the manager reused the closed controller after deleting its encrypted row. `createDiaryEditorManager` now evicts that owner/date controller after successful discard. The regression test fails against the old caching behavior and passes with the fix.

## Screenshots

- [Restored encrypted draft after force-stop](native-editor-restored.png) — SHA-256 `7F229DA3D59E2D83962FA4A9D51D075AB37DAC3346500A7AD7477B922625AF35`.
- [Dirty-navigation choices](native-editor-navigation-choice.png) — SHA-256 `B51369D2D464EB16239747AEB944DFB6D20E81017BF4B5367AD1B8225AFFA9CA`.
- [Fresh same-process editor after discard](native-editor-discarded-same-process.png) — SHA-256 `8F85ADD3E712C66BA5D90ECBED150E9171A0A41177D9A31D86A072801B33D755`.
- [Fresh editor after discard and process restart](native-editor-discarded-after-restart.png) — SHA-256 `FC4AE20E43F7E5651B813582E1A64C27118EC86C97AD287132784E48F5829D0B`.

The AVD exposed the translated field labels and editor state through its accessibility tree. No physical Android handset or spoken TalkBack pass was available; that device-layer limitation remains part of the overall Android acceptance ticket, not a blocker for #10's tested editor lifecycle.
