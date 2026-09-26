# F5 public Tools directory acceptance

The directory and status routes are public navigation surfaces. The directory lists all seven source registry entries in the supported locales; each card links to a stable `/tools/{slug}` route. The screens have no calculator, research request, export, download, or private save controls, so they make no tool API calls and expose no login-gated action.

## Checks

- `npx vitest run tests/unit/public-tools.test.ts` — 2 tests passed for the seven-slug inventory, route lookup and English / Traditional Chinese / Simplified Chinese copy.
- `npm run verify` — passed for current app source: lint, typecheck, 222 tests, and Android Hermes export. Nine disposable API tests remain intentionally skipped by this environment-free command.
- `npm run android:build` — passed on 2026-09-26; installed debug APK SHA-256 `06f18bc515fd16d043e7c4c3d412ca95b8250c906e652d2f286c3cc6822541ee`.
- Android 16 / API 36 `DiaryApp_API_36` (`emulator-5554`): from the signed-out sign-in screen, Explore public tools opened the directory; UIAutomator found all seven tool IDs across scroll, clickable nodes with accessible labels, and the SEC filings status route. `diaryapp://tools/unknown` returned to the directory. No sign-in was required for these routes.

## Scope boundaries

The public/private access gate is accepted for the directory and status routes. There are no save actions in those screens, so state-preserving login and save confirmation do not apply here; each tool ticket must test its own public operation and any private save handoff. The registry is static and contains no owner data, so owner-isolation checks do not apply. English/Chinese strings and native link labels are present; the native hierarchy was inspected, while a spoken TalkBack walkthrough remains part of full-platform acceptance.
