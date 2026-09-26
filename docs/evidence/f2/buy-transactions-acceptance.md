# F2 #13 — BUY transaction acceptance

Date: 2026-09-27  
Ticket: [#13](../../../.scratch/diary-app-full-parity/issues/13-buy-transactions.md)

## Environment and build

- Expo SDK 57.0.25, React Native 0.86.3; Android 16 / API 36 x86_64 AVD `DiaryApp_API_36` (`emulator-5554`), package `com.etklam.diaryapp`, Traditional Chinese locale.
- Disposable API: `http://127.0.0.1:3101`; PostgreSQL test service: `127.0.0.1:55433`. Live API acceptance used synthetic test accounts and deleted its synthetic Diary; no production origin was used.
- `npm run verify` produced Android bundle `dist/android/_expo/static/js/android/entry-713fbd9c90a0c4051e6c703bc861c944.hbc`, 4,921,162 bytes, SHA-256 `E6E70F39B53DD8065C24C5DF12F6302B060508AEB5EA9222258FF47F27F57EDA`.

## Verification

- `npm run verify` passed lint, TypeScript, the complete Vitest run (264 passed; 14 environment-gated API tests skipped in this general run) and the SDK 57 Android export.
- Unit coverage in `tests/unit/diary-buy-transactions.test.ts` and `tests/unit/diary-editor.test.ts` passed. It exercises normalized decimal/symbol fields; source strategy, emotion and notes; existing transaction preservation; unchanged content-only edits; exact seconds/milliseconds; DST gap and repeated-hour resolution; explicit UTC occurrence selection; refreshed server transactions after adopting the latest Diary; and an uncertain BUY attempt that reads back without replay.
- Live API acceptance command in PowerShell:

  ```powershell
  $env:DIARY_API_BASE_URL='http://127.0.0.1:3101'
  $env:DIARY_DISPOSABLE_TEST_ENV='1'
  npm test -- tests/api/diary-buy-transaction-api.test.ts
  ```

  The test passed against the disposable service. Excess decimal precision returned 400 with no Diary. A Diary request containing a valid BUY followed by an overselling SELL returned 400, left no Diary and created no holding. A successful BUY read back the exact `2021-04-05T12:30:45.678Z` instant and normalized `BUYTEST`, quantity `1.25`, price/average cost `10.1`, and total cost `12.625`. A second synthetic owner received not-found for the Diary and did not see that holding. The acceptance test deletes its synthetic Diary in `finally` and logs both synthetic sessions out.
- On the AVD, full Diary authoring saved a synthetic `BUY` with fractional quantity/price, local trade date/time, strategy, emotion and notes. The confirmation showed the server transaction and canonical holding values; Diary detail showed the same transaction fields. Screenshots: [editor form](buy-transactions/editor-form.png), [trade fields](buy-transactions/trade-fields.png), [confirmed transaction and holding](buy-transactions/confirmed.png), [Diary detail](buy-transactions/diary-detail.png).
- For timezone acceptance, the AVD was temporarily set to `America/New_York`. The repeated local minute `2026-11-01T01:30` offered both `2026-11-01T05:30:00.000Z` and `2026-11-01T06:30:00.000Z`; the AVD showed the second occurrence selected in the editor. The unit tests verify the selected instant resolves exactly, and live API read-back separately verifies an exact UTC instant including seconds and milliseconds. Editing the AVD control to the DST-gap minute `2026-03-08T02:30` showed the localized invalid-time message and no UTC choices. Screenshots: [repeated-time choices](buy-transactions/dst-choices.png), [selected occurrence](buy-transactions/dst-selected.png), [DST gap validation](buy-transactions/dst-gap.png).
- Native UI hierarchy exposed Traditional Chinese labels for symbol, quantity, price, local trade time, strategy, emotion and notes; occurrence controls have 48 dp minimum height and descriptive accessibility labels. The AVD hierarchy captures include [the repeated-time choices](../../../.scratch/diary-app-full-parity/ui-buy-dst-choices.xml) and [the in-editor draft discard confirmation](../../../.scratch/diary-app-full-parity/ui-buy-discard-confirm.xml).
- The synthetic AVD Diary and its ledger transaction were removed by exact owner/id predicate and verified absent. I discarded the DST editor draft through the editor's own discard control, force-stopped the app and reopened the same date. The fresh editor showed “No local edits,” no restored-draft banner and no BUY row in the [post-discard screenshot](buy-transactions/dst-discarded-clean.png) and [UI hierarchy](../../../.scratch/diary-app-full-parity/ui-buy-post-discard-clean.xml). `adb shell getprop persist.sys.timezone` returned `GMT`. A pre-existing Quick draft was left unchanged.

## Limits

Acceptance ran on the Android AVD; no physical Android handset was available. Accessibility labels, selected states and touch targets were inspected through the native hierarchy, but spoken TalkBack output was not tested. iOS coverage is outside this Android-first ticket.
