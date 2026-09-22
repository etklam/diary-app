# [35] Export the exact Rotation view as CSV, table text and PNG

Status: ready-for-agent
Execution: not-started
Type: AFK
Phase: F5
Work area: diary-app
Requirements: T05
Source stories: US-081

## Parent and outcome

[Full-product PRD](../PRD.md) · [Issue index](../ISSUES.md) · [Common delivery rules](../ISSUE-BREAKDOWN.md)

Preserve source Rotation export capabilities through native copy/file/image sharing.

## Implementation boundary

Native app implementation; inspect referenced service contracts before changing behavior. Follow the source-defined roles, contracts, financial/date semantics and failure behavior. Extend existing working code where applicable. The concrete starting references below are evidence and entry points, not permission to import Web/server runtime into native.

## Acceptance criteria

- [ ] Pin the displayed payload/filter/sort/locale for each export; refresh cannot mix datasets.
- [ ] Retain source metadata and columns, escaping Unicode/quotes/newlines correctly.
- [ ] PNG remains legible for long names/wide rows and represents missing values accurately.
- [ ] Support empty results, clipboard denial, cancelled sharing and write failure with honest feedback.
- [ ] Apply relevant PRD invariants and common translation/accessibility/owner-isolation rules; explain any non-applicable check in evidence.
- [ ] Record actual commands/scenarios, source/build and results. No criterion is complete solely because code or an old screenshot exists.

## Blocked by

- [34: Compare Market Rotation scopes, rankings and historical trends](34-market-rotation.md)

Triage readiness describes specification quality. Start implementation only when required predecessor outputs are accepted; missing unrelated release credentials do not block independent product work.

## Source and starting points

- [../diary-v3/docs/design/market-rotation-brief.md](../../../../diary-v3/docs/design/market-rotation-brief.md)
- [../diary-v3/apps/web/app/routes/market-rotation.tsx](../../../../diary-v3/apps/web/app/routes/market-rotation.tsx)

## Verification plan

Inspect actual CSV/text/PNG from a synthetic filtered view; device share/copy failure and concurrent-refresh cases.

Use synthetic data and controlled provider/service fixtures. Native storage/network/link/notification/upgrade claims require actual runtime evidence. If the implementation modifies a shared contract or backend, record current and previously supported client results.

## Evidence

NOT RUN. This ticket was created by the planning task; implementation and acceptance remain open.

## Comments

Planning baseline: full diary-v3 parity is mandatory; beta is an intermediate test activity. Append implementation decisions, findings and evidence here without rewriting history.
