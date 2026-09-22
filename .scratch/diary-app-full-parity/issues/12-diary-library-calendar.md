# [12] Complete Library, Timeline and Calendar navigation parity

Status: ready-for-agent
Execution: not-started
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

- [ ] Provide source Library/Timeline filters, sort/pagination and date navigation with canonical server totals.
- [ ] Return from Detail/edit/Review without losing filters, scroll or selected date; successful writes invalidate relevant reads.
- [ ] Handle empty dates, existing drafts, invalid ranges, failed pages and stale request generations correctly.
- [ ] Test Chinese/English search and account civil-date/month boundaries; never imply unqueried data is absent.
- [ ] Apply relevant PRD invariants and common translation/accessibility/owner-isolation rules; explain any non-applicable check in evidence.
- [ ] Record actual commands/scenarios, source/build and results. No criterion is complete solely because code or an old screenshot exists.

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

NOT RUN. This ticket was created by the planning task; implementation and acceptance remain open.

## Comments

Planning baseline: full diary-v3 parity is mandatory; beta is an intermediate test activity. Append implementation decisions, findings and evidence here without rewriting history.
