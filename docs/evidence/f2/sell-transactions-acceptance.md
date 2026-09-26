# F2 #14 — SELL transaction acceptance

Date: 2026-09-27  
Ticket: [#14](../../../.scratch/diary-app-full-parity/issues/14-sell-transactions.md)

## Environment

- Expo SDK 57.0.25, React Native 0.86.3; Android 16 / API 36 x86_64 AVD `DiaryApp_API_36` (`emulator-5554`), package `com.etklam.diaryapp`, Traditional Chinese locale.
- Disposable API: `http://127.0.0.1:3101`; PostgreSQL test service: `127.0.0.1:55433`. API acceptance used synthetic accounts and removed its synthetic Diaries in `finally`; native rejection data was discarded in the app and verified absent from the database.
- The editor resolves local trade time in the device timezone (the AVD was `GMT` during this run). Diary detail labels and renders timestamps in the signed-in account timezone (`Asia/Taipei`). The UI labels these separately.

## Verification

- Live API acceptance command in PowerShell:

  ```powershell
  $env:DIARY_API_BASE_URL='http://127.0.0.1:3101'
  $env:DIARY_DISPOSABLE_TEST_ENV='1'
  npm test -- tests/api/diary-sell-transaction-api.test.ts
  ```

  The test passed against the disposable service. It covered partial and full SELL calculations, canonical remaining holdings, realized P&L, atomic oversell rejection, same-instant transaction order, and owner isolation. Rejected oversell did not alter server data; the test cleaned up both synthetic accounts and their test data.
- The focused ledger unit suite passed: `npm test -- tests/unit/diary-buy-transactions.test.ts` (4 tests). The Diary editor suite contains canonical SELL rejection retention and realized-result read-back, plus a controller test for persisting an uncertain BUY attempt without replay. Its current rerun is waiting on the `review-schedule` helper staged alongside ticket #16; the missing helper is unrelated to #14. Rerun that suite and `npm run verify` after #16's source lands.
- On the AVD, a synthetic BUY of `1.25` shares of `SELLTEST` at `10.1` was followed by a partial SELL of `0.5` at `20`. The server-backed result showed `0.75` remaining, average cost `10.1`, remaining cost `7.575`, and realized gain `4.95` (`98.02%`). Selling the remaining `0.75` at `8` left no open holding and showed realized loss `-1.58` (`-20.79%`) for that sale. Evidence: [partial sale confirmed](sell-transactions/partial-sale-confirmed.png), [full sale confirmed](sell-transactions/full-sale-confirmed.png), and [no holding remains](sell-transactions/no-holding-final.png).
- Native oversell rejection was checked through the full Diary editor. After a synthetic BUY of `1 NATIVESELL` at `10`, submitting a SELL of `2` at `20` showed the localized canonical message: “賣出數量超過可用持倉： NATIVESELL. 賣出遭拒絕，輸入內容已保留，伺服器資料未變更。” The Diary title and body remained, and the SELL symbol, quantity, price and time remained editable in the form. Evidence: [retained error and Diary fields](sell-transactions/oversell-error-retained.png), [native accessibility/UI hierarchy](sell-transactions/oversell-error-retained.xml), and [retained SELL values](sell-transactions/oversell-sale-retained.png).
- A no-holding SELL was rejected atomically by the live API with the canonical `No NOHOLD holding is available to sell` validation detail. Its native localized error-and-retained-input presentation has not yet been run on the AVD and remains an acceptance item.
- The oversell test draft was discarded through the app's own discard action. A read-only database check found zero Diaries with title `SELL-OVER-20260928` and zero ledger rows for `NATIVESELL`. An unrelated pre-existing Quick draft was left untouched.
- Accessibility labels and native control hierarchy were inspected through Android UI Automator. The editor labels entry-local time; Diary detail labels account-local time, as shown in [Diary detail timezone label](sell-transactions/diary-detail-timezone-label.png).

## Limits and remaining integrated check

Acceptance ran on the Android AVD; no physical handset was available. TalkBack speech was not tested. API acceptance and the native partial/full/oversell scenarios passed. Native no-holding rejection and the final complete repository test/typecheck/export rerun remain pending; the latter waits for ticket #16's staged editor tests to receive their implementation helper. This ticket is not declared complete until both remaining checks pass.
