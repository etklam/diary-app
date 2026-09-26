# F6 #44 — Diary reminders acceptance

Date: 2026-09-27 (Asia/Taipei)

## Source and scope

- App baseline: `471b63381bc3b612e6bdb0ae4d127554ded30f0b`, with existing uncommitted work retained. Service baseline: `ce2962f597ef56dc4e4cb8966c1ca1860369e006`, existing disposable service at `http://127.0.0.1:3101`.
- Read repository `AGENTS.md`, [Expo SDK 57 docs](https://docs.expo.dev/versions/v57.0.0/), full-product PRD/common delivery rules, accepted #08/#10 predecessor records, `diary-v3/apps/api/src/alerts.ts`, `diary.ts`, `packages/contracts/src/alerts.ts`, `packages/domain/src/recurring-alerts.ts`, Web `alert-fields.tsx`, and `tests/e2e/alerts.spec.ts` before implementation.
- Canonical recurrence runs at 09:00 in the account timezone. WEEK enumerates weekdays through Friday; a weekend start advances to Monday. MONTH enumerates remaining weekdays through month end, possibly yielding no occurrences. The selected input instant determines the account-local start day; there is no new after-09:00 cutoff rule. One-off authoring uses the displayed device timezone, rejects nonexistent local minutes, requires a repeated-hour occurrence, and retains unchanged seconds/milliseconds.
- The standalone service provides list/create/dismiss, but no individual update endpoint. Source editing replaces the Diary reminder aggregate. The native editor integration uses that source operation, omitting an unchanged collection to preserve IDs/dismissed children. Changing the collection explains its regeneration semantics. No backend, package contract, native module or push-delivery changes are included.

## Commands and results

- `npm test -- tests/unit/diary-reminders.test.ts tests/unit/navigation.test.ts tests/unit/continuation.test.ts` — 12 tests passed. Navigation expectations include the concurrent #18 Trade Plan entries.
- `npx eslint src/reminders 'src/app/(private)/alerts.tsx' tests/unit/diary-reminders.test.ts tests/api/diary-reminders-api.test.ts` — passed.
- `npm run typecheck` — passed after reminder service, fields, manager, screen and tests were added.
- Editor integration subsequently passed `npm test -- tests/unit/diary-reminders.test.ts tests/unit/diary-editor.test.ts tests/unit/diary-buy-transactions.test.ts` — 25 tests. The added controller cases verify exact uncertain reminder attempts after closing/reopening a file-backed host draft database, no replay, rejected edit retention, reminder-only concurrent dismissal detection even with unchanged Diary `updatedAt`, and adoption of the current server baseline while retaining an unsaved SELL and local reminder edit. This is host persistence evidence, not native encrypted-storage acceptance.
- After integration, `npm run typecheck` and `npx eslint src/reminders src/diary-editor 'src/app/(private)/alerts.tsx' 'src/app/(private)/diaries/editor.tsx' tests/unit/diary-editor.test.ts tests/unit/diary-reminders.test.ts tests/api/diary-reminders-api.test.ts` passed.
- The disposable API scenario was rerun successfully after integration; the exact reminder edit now passes through native `fieldsFor` / `payloadFor` and the real `createDiaryEditorApi.write` bridge. Returned reminder identities/content and exact one-off times are validated by the model; recurring occurrence materialization remains authoritative on the service.
- Disposable API command:

  ```powershell
  $env:DIARY_API_BASE_URL='http://127.0.0.1:3101'
  $env:DIARY_DISPOSABLE_TEST_ENV='1'
  npm test -- tests/api/diary-reminders-api.test.ts
  ```

  Passed. Two unique synthetic native sessions created a Diary with one single, five weekly and two monthly occurrences. Account timezone `America/New_York` produced exact `13:00Z` triggers after the March DST transition. Foreign owner list was empty; foreign dismissal and creation against the Diary returned not-found. Child dismissal retained the root and siblings; untouched aggregate save retained every ID and the child dismissal. Root dismissal removed the complete weekly series. One-off message edit retained `2026-11-01T06:30:42.123Z`. An invalid replacement returned 400 without changing title/content. A transport that discarded a successful dismissal response left the manager uncertain; a subsequent GET observed the committed result, retained the replay lock, and a second requested dismissal sent no PUT. A May 31 monthly start produced no reminders. The test deleted only its exact synthetic Diary and logged both synthetic sessions out.
- Unit cases additionally cover reminder form DST gaps/repeated-hour selection, preserving old draft omission, explicit removal of every reminder, recurring-root projection, root/child list changes only after acknowledgement, stale owner results, identity-mismatched success rejection, no automatic session retry, locale keys and `/alerts` continuation.

## Pending acceptance

Editor integration and focused model/controller/API regression checks are complete. Full final verification/export and native Android evidence remain pending. The shared emulator was reserved for concurrent #14 verification; this agent has not interacted with it. These unit/API results do not prove native keyboard, process-death persistence, TalkBack, routing or screenshots. No iOS or physical-device acceptance is claimed. Do not mark #44 done until this section is replaced by actual remaining evidence or explicit limitations.

Native scenarios remaining: create one-off/WEEK/MONTH reminders in the Diary editor and inspect the list; edit a one-off and inspect its exact server timestamp; dismiss a child then its root series; open the related Diary; restart with an unsaved reminder draft; inspect the nonexistent/repeated local-time controls, translations, themes and accessibility hierarchy. The form keeps pre-reminder encrypted drafts readable and requires saving/discarding and reopening before editing reminders, so older drafts cannot clear unobserved server reminder collections.
