# [12] Complete Library, Timeline and Calendar navigation parity

Status: ready-for-agent
Execution: complete (live API, controller tests and Android 16/API 36 acceptance passed; see [F2 Library/Timeline/Calendar acceptance](../../../docs/evidence/f2/library-timeline-calendar-acceptance.md))
Type: AFK
Phase: F2
Work area: diary-app
Requirements: D04
Source stories: US-022, US-024, US-025, US-026, US-027

## Parent and outcome

[Full-product PRD](../PRD.md) · [Issue index](../ISSUES.md) · [Common delivery rules](../ISSUE-BREAKDOWN.md)

Finish the source discovery modes and actions while retaining the existing bounded search and Calendar state.

## Implementation boundary

Native app implementation; inspect referenced service contracts before changing behavior. Follow the source-defined roles, contracts, financial/date semantics and failure behavior. Extend existing working code where applicable. The concrete starting references below are evidence and entry points, not permission to import Web/server runtime into native.

## Acceptance criteria

- [x] Provide source Library/Timeline filters, sort/pagination and date navigation with canonical server totals.
- [x] Return from Detail/edit/Review without losing filters, scroll or selected date; successful writes invalidate relevant reads.
- [x] Handle empty dates, existing drafts, invalid ranges, failed pages and stale request generations correctly.
- [x] Test Chinese/English search and account civil-date/month boundaries; never imply unqueried data is absent.
- [x] Apply relevant PRD invariants and common translation/accessibility/owner-isolation rules; explain any non-applicable check in evidence.
- [x] Record actual commands/scenarios, source/build and results. No criterion is complete solely because code or an old screenshot exists.

## Blocked by

- [10: Create and edit complete Diary content with durable recovery](10-full-diary-editor.md)

Triage readiness describes specification quality. Start implementation only when required predecessor outputs are accepted; missing unrelated release credentials do not block independent product work.

## Source and starting points

- [src/diaries/discovery-state.ts](../../../src/diaries/discovery-state.ts)
- [../diary-v3/tests/e2e/diary-discovery.spec.ts](../../../../diary-v3/tests/e2e/diary-discovery.spec.ts)
- [../diary-v3/apps/web/app/routes/diary-list.tsx](../../../../diary-v3/apps/web/app/routes/diary-list.tsx)

## Verification plan

Bounded multi-page/month fixtures and native search → detail/edit → Back/context recovery.

Use synthetic data and controlled provider/service fixtures. Native storage/network/link/notification/upgrade claims require actual runtime evidence. If the implementation modifies a shared contract or backend, record current and previously supported client results.

## Evidence

See [F2 Library/Timeline/Calendar acceptance](../../../docs/evidence/f2/library-timeline-calendar-acceptance.md) for the live API and emulator scenarios, cleanup, verification results, bundle hash, limits and captured artifacts.

## Comments

Planning baseline: full diary-v3 parity is mandatory; beta is an intermediate test activity. Append implementation decisions, findings and evidence here without rewriting history.

2026-09-27: Added the Library route with the source summary filters, four sorts, bounded page sizes and canonical page totals; Timeline now renders localized month groups and retains loaded pages across refresh. Live API, unit/controller and AVD acceptance passed. A real edit refreshed Library page 2 in place; Calendar retained its selected day through Detail/Review/Edit, showed an empty date accurately, and prompted before reopening the device's existing encrypted draft. Synthetic API and emulator Diaries were removed; no physical Android device or spoken TalkBack test was available. See the evidence report for exact commands and artifacts.
