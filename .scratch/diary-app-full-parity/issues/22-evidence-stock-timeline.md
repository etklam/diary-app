# [22] Capture Evidence and read immutable Stock Timeline records

Status: ready-for-agent
Execution: not-started
Type: AFK
Phase: F3
Work area: diary-app
Requirements: R04
Source stories: US-049, US-050

## Parent and outcome

[Full-product PRD](../PRD.md) · [Issue index](../ISSUES.md) · [Common delivery rules](../ISSUE-BREAKDOWN.md)

Implement source Evidence capture/link/management operations and immutable sourced company history.

## Implementation boundary

Native app implementation; inspect referenced service contracts before changing behavior. Follow the source-defined roles, contracts, financial/date semantics and failure behavior. Extend existing working code where applicable. The concrete starting references below are evidence and entry points, not permission to import Web/server runtime into native.

## Acceptance criteria

- [ ] Preserve source types, timestamps, links and author provenance in capture and read-back.
- [ ] Separate immutable timeline operations from editable Evidence/Note operations according to contracts.
- [ ] Bound queries, preserve pagination/context and reject cross-owner record/Diary associations.
- [ ] A duplicate/uncertain capture retains input and uses only actual source receipt/idempotency semantics.
- [ ] Apply relevant PRD invariants and common translation/accessibility/owner-isolation rules; explain any non-applicable check in evidence.
- [ ] Record actual commands/scenarios, source/build and results. No criterion is complete solely because code or an old screenshot exists.

## Blocked by

- [20: Read Company quote, history and personal context](20-company-hub.md)
- [09: Render safe rich Markdown in Diary Detail](09-safe-markdown-reader.md)

Triage readiness describes specification quality. Start implementation only when required predecessor outputs are accepted; missing unrelated release credentials do not block independent product work.

## Source and starting points

- [../diary-v3/apps/api/src/evidence.ts](../../../../diary-v3/apps/api/src/evidence.ts)
- [../diary-v3/apps/api/src/stock-timeline-capture.ts](../../../../diary-v3/apps/api/src/stock-timeline-capture.ts)
- [../diary-v3/packages/contracts/src/stock-timeline-source.ts](../../../../diary-v3/packages/contracts/src/stock-timeline-source.ts)

## Verification plan

Capture → company history → linked evidence read-back, owner isolation and immutable-record assertions.

Use synthetic data and controlled provider/service fixtures. Native storage/network/link/notification/upgrade claims require actual runtime evidence. If the implementation modifies a shared contract or backend, record current and previously supported client results.

## Evidence

NOT RUN. This ticket was created by the planning task; implementation and acceptance remain open.

## Comments

Planning baseline: full diary-v3 parity is mandatory; beta is an intermediate test activity. Append implementation decisions, findings and evidence here without rewriting history.
