# [50] Compare partner Diaries and read permitted Stock Notes

Status: ready-for-agent
Execution: not-started
Type: AFK
Phase: F7
Work area: diary-app
Requirements: S02, R03
Source stories: US-068, US-069

## Parent and outcome

[Full-product PRD](../PRD.md) · [Issue index](../ISSUES.md) · [Common delivery rules](../ISSUE-BREAKDOWN.md)

Add Partner comparison as a Timeline reading mode with strict server projections.

## Implementation boundary

Native app implementation; inspect referenced service contracts before changing behavior. Follow the source-defined roles, contracts, financial/date semantics and failure behavior. Extend existing working code where applicable. The concrete starting references below are evidence and entry points, not permission to import Web/server runtime into native.

## Acceptance criteria

- [ ] Group own/partner entries by persisted civil date, including one-sided dates and source history limits.
- [ ] Partner content stays read-only and excludes transactions, holdings, private Review, reminders and other disallowed fields.
- [ ] Selecting a partner or changing access cancels stale reads and retains meaningful Back/filter state.
- [ ] Read only permitted shared Stock Notes; distinguish not-shared from no-record and revoke subsequent reads on resume.
- [ ] Apply relevant PRD invariants and common translation/accessibility/owner-isolation rules; explain any non-applicable check in evidence.
- [ ] Record actual commands/scenarios, source/build and results. No criterion is complete solely because code or an old screenshot exists.

## Blocked by

- [49: Manage Partner invitations and independent sharing settings](49-partner-relationships.md)
- [12: Complete Library, Timeline and Calendar navigation parity](12-diary-library-calendar.md)
- [21: Create and maintain mutable Stock Notes](21-stock-notes.md)
- [09: Render safe rich Markdown in Diary Detail](09-safe-markdown-reader.md)

Triage readiness describes specification quality. Start implementation only when required predecessor outputs are accepted; missing unrelated release credentials do not block independent product work.

## Source and starting points

- [../diary-v3/docs/design/partner-timeline-parity.md](../../../../diary-v3/docs/design/partner-timeline-parity.md)
- [../diary-v3/tests/e2e/partner-timeline-parity.spec.ts](../../../../diary-v3/tests/e2e/partner-timeline-parity.spec.ts)
- [../diary-v3/tests/e2e/stock-note-sharing.spec.ts](../../../../diary-v3/tests/e2e/stock-note-sharing.spec.ts)

## Verification plan

A/B synthetic secret-marker assertions plus native comparison/note read, share withdrawal and unlink recovery.

Use synthetic data and controlled provider/service fixtures. Native storage/network/link/notification/upgrade claims require actual runtime evidence. If the implementation modifies a shared contract or backend, record current and previously supported client results.

## Evidence

NOT RUN. This ticket was created by the planning task; implementation and acceptance remain open.

## Comments

Planning baseline: full diary-v3 parity is mandatory; beta is an intermediate test activity. Append implementation decisions, findings and evidence here without rewriting history.
