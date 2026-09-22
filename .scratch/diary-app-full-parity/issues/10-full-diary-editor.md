# [10] Create and edit complete Diary content with durable recovery

Status: ready-for-agent
Execution: not-started
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

- [ ] Create no-transaction Diaries for explicit civil dates; edit/clear supported fields and preview Markdown.
- [ ] Respect one-per-day conflicts and existing related records; do not replace transaction/reminder/review arrays accidentally.
- [ ] Restore encrypted owner-scoped edits after process death and warn on dirty navigation with deliberate restore/discard choices.
- [ ] Separate confirmed saves, rejected changes, unknown outcomes and refresh failures; preserve exact attempted payloads.
- [ ] Apply relevant PRD invariants and common translation/accessibility/owner-isolation rules; explain any non-applicable check in evidence.
- [ ] Record actual commands/scenarios, source/build and results. No criterion is complete solely because code or an old screenshot exists.

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

NOT RUN. This ticket was created by the planning task; implementation and acceptance remain open.

## Comments

Planning baseline: full diary-v3 parity is mandatory; beta is an intermediate test activity. Append implementation decisions, findings and evidence here without rewriting history.
