# [10] Create and edit complete Diary content with durable recovery

Status: ready-for-agent
Execution: complete (live API, unit, Android 16/API 36 restart and dirty-navigation acceptance passed; see [F2 editor acceptance](../../../docs/evidence/f2/full-diary-editor-acceptance.md))
Type: AFK
Phase: F2
Work area: diary-app
Requirements: D01, D02, X01
Source stories: US-011, US-012, US-013, US-014, US-018, US-028, US-102

## Parent and outcome

[Full-product PRD](../PRD.md) · [Issue index](../ISSUES.md) · [Common delivery rules](../ISSUE-BREAKDOWN.md)

Add full Diary authoring for title/body/tags/symbols and original thesis/risk/execution, using the existing API aggregate.

## Implementation boundary

Native app implementation; inspect referenced service contracts before changing behavior. Follow the source-defined roles, contracts, financial/date semantics and failure behavior. Extend existing working code where applicable. The concrete starting references below are evidence and entry points, not permission to import Web/server runtime into native.

## Acceptance criteria

- [x] Create no-transaction Diaries for explicit civil dates; edit/clear supported fields and preview Markdown.
- [x] Respect one-per-day conflicts and existing related records; do not replace transaction/reminder/review arrays accidentally.
- [x] Restore encrypted owner-scoped edits after process death and warn on dirty navigation with deliberate keep/discard choices.
- [x] Separate confirmed saves, rejected changes, unknown outcomes and refresh failures; preserve exact attempted payloads.
- [x] Apply relevant PRD invariants and common translation/accessibility/owner-isolation rules; explain any non-applicable check in evidence.
- [x] Record actual commands/scenarios, source/build and results. No criterion is complete solely because code or an old screenshot exists.

## Blocked by

- [06: Complete registration and guest-to-account continuation](06-registration-guest-continuation.md)
- [08: Implement complete preferences, localization and themes](08-preferences-localization.md)
- [09: Render safe rich Markdown in Diary Detail](09-safe-markdown-reader.md)
- [58: Extend encrypted draft persistence to complete-product authoring](58-encrypted-authoring-drafts.md)

Triage readiness describes specification quality. Start implementation only when required predecessor outputs are accepted; missing unrelated release credentials do not block independent product work.

## Source and starting points

- [../diary-v3/apps/web/app/routes/diary-edit.tsx](../../../../diary-v3/apps/web/app/routes/diary-edit.tsx)
- [../diary-v3/apps/api/src/diary.ts](../../../../diary-v3/apps/api/src/diary.ts)
- [src/quick/native-storage.ts](../../../src/quick/native-storage.ts)

## Verification plan

Real create/read/edit/clear/conflict API cases plus native force-stop, navigation and response-loss scenarios.

Use synthetic data and controlled provider/service fixtures. Native storage/network/link/notification/upgrade claims require actual runtime evidence. If the implementation modifies a shared contract or backend, record current and previously supported client results.

## Evidence

See [F2 editor acceptance](../../../docs/evidence/f2/full-diary-editor-acceptance.md) and the earlier [P1F API/editor acceptance](../../../docs/evidence/p1f/acceptance.md). Live PostgreSQL create/update/clear/conflict/related-record/owner scenarios pass. The Android 16/API 36 AVD verified SQLCipher recovery after force-stop, keep/stay/discard navigation, and clean same-process re-entry. A regression found and fixed the manager retaining a discarded, closed editor controller; unit coverage now checks fresh same-owner/date re-entry. Full verification passes; API cases were run separately against the disposable service.

## Comments

Planning baseline: full diary-v3 parity is mandatory; beta is an intermediate test activity. Append implementation decisions, findings and evidence here without rewriting history.

2026-09-26: Added an owner/environment-scoped controller over the shared SQLCipher authoring repository, safe content-only create/update payloads, Markdown preview, one-diary-per-civil-date checks, full supported content fields, server-baseline conflict handling, explicit local-draft discard, dirty-navigation choices, and no-replay handling for uncertain writes. Updates intentionally omit transactions, alerts/reminders, review and trade-plan collections. Read-after-unknown only reports a match/pending/ambiguous snapshot; it never marks the write confirmed because the original request may still commit. The editor is reachable from Diary detail, Timeline and Calendar.
2026-09-26: Native same-process re-entry exposed that a successful discard removed the SQLCipher row but left the closed editor controller cached for the same owner/date. The manager now evicts that controller only after successful deletion. A regression test and AVD revisit both confirm a fresh editor opens with no local edits; keep still restores the draft.
