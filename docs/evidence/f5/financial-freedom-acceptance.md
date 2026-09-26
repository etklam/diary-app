# F5 Financial Freedom calculator acceptance

The public `/tools/financial-freedom` screen uses the vendored, source-owned `calculateFinancialFreedom` and withdrawal-rate presets. It validates the same expense, asset, contribution, return, age and withdrawal inputs; displays assumptions separately from model results; handles already-reached, unreachable and numeric-overflow cases without fabricating numbers; shows month-end contribution projections in a horizontally scrollable accessible table; and copies localized Markdown only after an explicit action. Input state is not persisted. The source calculation uses a nominal monthly-compounding model and formats its target month in UTC.

## Initial verification (2026-09-26)

- `npx vitest run tests/unit/financial-freedom.test.ts` — 4/4 passed against the app's vendored shared domain package. Frozen source fixtures matched the 15,000,000 target, 227-month result and unrounded first-year projection. Invalid boundaries, an empty optional age, already-reached/unreachable scenarios and finite-input overflow were also checked.
- In `diary-v3`, `npm exec vitest run tests/unit/fire.test.ts` — 18/18 source formula cases passed, including month-end date clamping and the 100-year boundary.
- `npm run verify` — passed lint, typecheck, 236 tests passed and 11 database-gated API tests skipped; Android export succeeded.
- Expo 57 Android bundle: `dist/android/_expo/static/js/android/entry-a4287ac39f0a23d5594caa3f724f8b83.hbc`, 4,686,110 bytes, SHA-256 `6D0F800D889C3FA623FC155974EC88D515A1E221242A6DA854137FF0A38EF9F0`.

## Scope and remaining native evidence

The calculator is public and stateless, so account ownership and save-to-Diary/Plan actions do not apply; this source screen supports copy only. The copy action uses Expo Clipboard and exposes selectable text if the clipboard rejects. Values use one user-supplied currency without an exchange-rate claim. The numeric projection is rendered as the source table with accessible row labels; no market-data service or provider key is involved.

At the initial 2026-09-26 check, the Android AVD showed Expo Dev Launcher waiting for Metro. Native input/copy interaction, larger-font layout and TalkBack acceptance remain open; bundle export is compilation evidence only.

## Follow-up review (2026-09-27)

Read the exact [Expo SDK 57 reference](https://docs.expo.dev/versions/v57.0.0/) and [Clipboard reference](https://docs.expo.dev/versions/v57.0.0/sdk/clipboard/) before the change, together with the PRD, common delivery rules, accepted #03/#08/#31 outputs, native design rules, source `apps/web/app/routes/fire.tsx`, `packages/domain/src/fire.ts` and source formula tests. The existing stacked assumption/result panels, wrapping preset controls, horizontal numeric table and explicit copy action remain the native layout direction. The source provides a table and Markdown copy/preview; it has no separate chart, file-download or private-save action to port.

The review corrected five gaps:

- Required pasted blank fields no longer become zero through JavaScript coercion. Decimal/exponent input remains supported; hexadecimal/binary syntax is rejected. An optional blank age remains unknown.
- Copyable Markdown can be expanded before clipboard access, matching the source's manual export preview. Clipboard failure opens that text automatically.
- Clipboard success/failure is associated with the actual copied text, so a late response does not report the current changed result as copied. A false clipboard return is a failure.
- Custom withdrawal-rate exports use the translated `Custom` label in all three locales.
- Each projection row's accessibility label includes the translated column name alongside its value. Invalid return input no longer displays a misleading return-assumption band.

Commands and actual results:

- `npx vitest run tests/unit/financial-freedom.test.ts` — **18/18 passed**. Covers fixed formula fixtures; invalid/non-decimal pasted input; optional age; preset/custom boundaries; overflow; inclusive 100-year/month-end behavior; all three locale exports; exactly the first ten projection years; already-achieved and unreachable output.
- In `../diary-v3`, `npm exec vitest run tests/unit/fire.test.ts` — **18/18 passed**.
- `npx eslint src/tools/FinancialFreedomScreen.tsx src/tools/financial-freedom-input.ts src/tools/financial-freedom-output.ts tests/unit/financial-freedom.test.ts` — passed.
- `npm run typecheck` — passed for the current shared worktree.
- `node scripts/expo-command.mjs export --platform android --output-dir dist/fire-37` — passed, 1,719 modules. Bundle `dist/fire-37/_expo/static/js/android/entry-9492411a594f37dba86910ecb17c58ee.hbc`, 4,981,829 bytes, SHA-256 `E017DF30508F2E949B4C74C21E8FADAC7414F8EF19DC30A0332B8B054572DF42`. This is compilation evidence for the shared worktree at export time, not a newly installed native binary.

Source identity: app HEAD `471b63381bc3b612e6bdb0ae4d127554ded30f0b` plus the existing shared worktree and these uncommitted FIRE changes; diary-v3 HEAD `ce2962f597ef56dc4e4cb8966c1ca1860369e006`; installed domain artifact `diary-domain-0.0.0-dev.gce2962f597ef.cd45dfbb5046d.tgz`. No backend, shared contract, dependency, storage or device state changed for this follow-up. File SHA-256 values:

| File | SHA-256 |
| --- | --- |
| `src/tools/FinancialFreedomScreen.tsx` | `9DF1B44E589592E5E6CEE8FE9A063CC13935FCDEE144FC4333B322CDE12464A5` |
| `src/tools/financial-freedom-input.ts` | `8EEF4F22CAE606EC16C8047251882668D3C1E96F1A3A712D5C4518AC0DADB0E4` |
| `src/tools/financial-freedom-output.ts` | `5DCDF9AF93C4C862D2B2D7E64AD8A4468C58A259710092E69F155860B7328C6B` |
| `tests/unit/financial-freedom.test.ts` | `E6722289484E7BDCC3400B96A68D4C064F16FA6F8E0C98C085C3361DB6144F38` |

The AVD was reserved for another ticket during this review and was not touched. Still required on native: guest route/default results; custom/preset entry and keyboard/Back; invalid/overflow/already-achieved/unreachable states; first-ten/all-years table; actual copy and paste of its content; manual text selection; English/Traditional Chinese/Simplified Chinese; light/dark and 2× text; horizontal scrolling and spoken column/value labels. Screenshots and spoken TalkBack acceptance are not replaced by these host checks. This ticket remains in progress.
