# [05] Supply release, hosting, provider and device inputs

Status: ready-for-human
Execution: not-started
Type: HITL
Phase: F0–F10
Work area: operator
Requirements: X04, X05, X02
Source stories: US-109, US-110, US-111, US-112

## Parent and outcome

[Full-product PRD](../PRD.md) · [Issue index](../ISSUES.md) · [Common delivery rules](../ISSUE-BREAKDOWN.md)

Collect real operator-owned inputs early so signed builds, push delivery and deployment acceptance can proceed when their code is ready.

## Implementation boundary

Operator decisions, evidence and authorized release actions. Follow the source-defined roles, contracts, financial/date semantics and failure behavior. Extend existing working code where applicable. The concrete starting references below are evidence and entry points, not permission to import Web/server runtime into native.

## Acceptance criteria

- [ ] Record authorized API/support/data-policy destinations, signing identity/version history, store/project ownership and restricted delivery route.
- [ ] Provide protected credential sources for signing/providers/push; keep secrets out of tickets, public variables and command transcripts.
- [ ] Make two representative physical Android devices available; record iOS hardware/build access when that target is scheduled.
- [ ] Record individual test-account provisioning/recovery, isolated HTTPS fault ingress and hosting/backup operator responsibilities; mark unavailable inputs individually.
- [ ] Apply relevant PRD invariants and common translation/accessibility/owner-isolation rules; explain any non-applicable check in evidence.
- [ ] Record actual commands/scenarios, source/build and results. No criterion is complete solely because code or an old screenshot exists.

## Blocked by

None. This ticket may start immediately within its stated role.

Triage readiness describes specification quality. Start implementation only when required predecessor outputs are accepted; missing unrelated release credentials do not block independent product work.

## Source and starting points

- [docs/beta/release-runbook.md](../../../docs/beta/release-runbook.md)
- [config/release.cjs](../../../config/release.cjs)
- [eas.json](../../../eas.json)

## Verification plan

Operator input checklist with verifiable non-secret references and explicit ownership; no fabricated approval.

Use synthetic data and controlled provider/service fixtures. Native storage/network/link/notification/upgrade claims require actual runtime evidence. If the implementation modifies a shared contract or backend, record current and previously supported client results.

## Evidence

NOT RUN. This ticket was created by the planning task; implementation and acceptance remain open.

## Comments

Planning baseline: full diary-v3 parity is mandatory; beta is an intermediate test activity. Append implementation decisions, findings and evidence here without rewriting history.
