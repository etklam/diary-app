# [21] Create and maintain mutable Stock Notes

Status: ready-for-agent
Execution: not-started
Type: AFK
Phase: F3
Work area: diary-app
Requirements: R03, X01
Source stories: US-048, US-054

## Parent and outcome

[Full-product PRD](../PRD.md) · [Issue index](../ISSUES.md) · [Common delivery rules](../ISSUE-BREAKDOWN.md)

Expose current Stock Note authoring, reading and deletion while keeping historical evidence separate.

## Implementation boundary

Native app implementation; inspect referenced service contracts before changing behavior. Follow the source-defined roles, contracts, financial/date semantics and failure behavior. Extend existing working code where applicable. The concrete starting references below are evidence and entry points, not permission to import Web/server runtime into native.

## Acceptance criteria

- [ ] Create/update/delete source note fields with author/source context and owner checks.
- [ ] Preserve local edits across read refresh, failure and process death; explicitly handle competing server changes.
- [ ] Render safe Markdown and current opinion distinctly from immutable timeline records.
- [ ] Leave partner projection to sharing integration while verifying owner-only mutation now.
- [ ] Apply relevant PRD invariants and common translation/accessibility/owner-isolation rules; explain any non-applicable check in evidence.
- [ ] Record actual commands/scenarios, source/build and results. No criterion is complete solely because code or an old screenshot exists.

## Blocked by

- [20: Read Company quote, history and personal context](20-company-hub.md)
- [58: Extend encrypted draft persistence to complete-product authoring](58-encrypted-authoring-drafts.md)
- [09: Render safe rich Markdown in Diary Detail](09-safe-markdown-reader.md)

Triage readiness describes specification quality. Start implementation only when required predecessor outputs are accepted; missing unrelated release credentials do not block independent product work.

## Source and starting points

- [../diary-v3/apps/api/src/stock-notes.ts](../../../../diary-v3/apps/api/src/stock-notes.ts)
- [../diary-v3/packages/contracts/src/stock-note.ts](../../../../diary-v3/packages/contracts/src/stock-note.ts)
- [../diary-v3/tests/e2e/stock-notes.spec.ts](../../../../diary-v3/tests/e2e/stock-notes.spec.ts)

## Verification plan

Native note create/edit/reopen/delete and API ownership/conflicting-read tests.

Use synthetic data and controlled provider/service fixtures. Native storage/network/link/notification/upgrade claims require actual runtime evidence. If the implementation modifies a shared contract or backend, record current and previously supported client results.

## Evidence

NOT RUN. This ticket was created by the planning task; implementation and acceptance remain open.

## Comments

Planning baseline: full diary-v3 parity is mandatory; beta is an intermediate test activity. Append implementation decisions, findings and evidence here without rewriting history.
