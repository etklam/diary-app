# [25] Carry research context into Diary, Evidence and Trade Plans

Status: ready-for-agent
Execution: not-started
Type: AFK
Phase: F3
Work area: diary-app
Requirements: R06, D03
Source stories: US-026, US-050

## Parent and outcome

[Full-product PRD](../PRD.md) · [Issue index](../ISSUES.md) · [Common delivery rules](../ISSUE-BREAKDOWN.md)

Connect Company/tool research to actual saved records with deliberate draft precedence and return navigation.

## Implementation boundary

Native app implementation; inspect referenced service contracts before changing behavior. Follow the source-defined roles, contracts, financial/date semantics and failure behavior. Extend existing working code where applicable. The concrete starting references below are evidence and entry points, not permission to import Web/server runtime into native.

## Acceptance criteria

- [ ] Carry validated source/symbol/date context into Quick, Full Diary, Evidence or Plan according to source capability.
- [ ] Guests can authenticate and resume the same research state; no automatic private write follows login.
- [ ] Offer restore/discard when an existing draft conflicts, preserving manual changes and pending attempts.
- [ ] After confirmed save, read back the canonical record and return to the source; append retains all unrelated fields.
- [ ] Apply relevant PRD invariants and common translation/accessibility/owner-isolation rules; explain any non-applicable check in evidence.
- [ ] Record actual commands/scenarios, source/build and results. No criterion is complete solely because code or an old screenshot exists.

## Blocked by

- [20: Read Company quote, history and personal context](20-company-hub.md)
- [22: Capture Evidence and read immutable Stock Timeline records](22-evidence-stock-timeline.md)
- [10: Create and edit complete Diary content with durable recovery](10-full-diary-editor.md)
- [11: Complete Quick templates, related context and append behavior](11-quick-templates-context.md)
- [18: Create, manage and link complete Trade Plans](18-trade-plans.md)

Triage readiness describes specification quality. Start implementation only when required predecessor outputs are accepted; missing unrelated release credentials do not block independent product work.

## Source and starting points

- [../diary-v3/tests/e2e/research-diary-handoff.spec.ts](../../../../diary-v3/tests/e2e/research-diary-handoff.spec.ts)
- [../diary-v3/docs/design/research-diary-handoff-acceptance.md](../../../../diary-v3/docs/design/research-diary-handoff-acceptance.md)

## Verification plan

Company → capture → restore choice → explicit create/append → read-back → source round trip, including expiry/lost response.

Use synthetic data and controlled provider/service fixtures. Native storage/network/link/notification/upgrade claims require actual runtime evidence. If the implementation modifies a shared contract or backend, record current and previously supported client results.

## Evidence

NOT RUN. This ticket was created by the planning task; implementation and acceptance remain open.

## Comments

Planning baseline: full diary-v3 parity is mandatory; beta is an intermediate test activity. Append implementation decisions, findings and evidence here without rewriting history.
