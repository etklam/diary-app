# [43] Import, export and publicly share selected Discipline

Status: ready-for-agent
Execution: not-started
Type: AFK
Phase: F6
Work area: diary-app
Requirements: N04
Source stories: US-064, US-065

## Parent and outcome

[Full-product PRD](../PRD.md) · [Issue index](../ISSUES.md) · [Common delivery rules](../ISSUE-BREAKDOWN.md)

Complete the JSON/file and public-link round trip with preview before private import.

## Implementation boundary

Native app implementation; inspect referenced service contracts before changing behavior. Follow the source-defined roles, contracts, financial/date semantics and failure behavior. Extend existing working code where applicable. The concrete starting references below are evidence and entry points, not permission to import Web/server runtime into native.

## Acceptance criteria

- [ ] Read source JSON via native file/text input and show accepted/skipped/invalid preview without writing.
- [ ] Apply source merge/dedup semantics only after explicit import; export selected content and optional permitted attribution.
- [ ] Open/share public links safely and preserve guest login continuation before import.
- [ ] Clipboard/file denial or uncertain import retains a usable selection and avoids duplicating content.
- [ ] Apply relevant PRD invariants and common translation/accessibility/owner-isolation rules; explain any non-applicable check in evidence.
- [ ] Record actual commands/scenarios, source/build and results. No criterion is complete solely because code or an old screenshot exists.

## Blocked by

- [42: Create, reorder and randomly review Discipline entries](42-discipline-management.md)

Triage readiness describes specification quality. Start implementation only when required predecessor outputs are accepted; missing unrelated release credentials do not block independent product work.

## Source and starting points

- [../diary-v3/packages/contracts/src/discipline-share.ts](../../../../diary-v3/packages/contracts/src/discipline-share.ts)
- [../diary-v3/apps/web/app/routes/discipline-share.tsx](../../../../diary-v3/apps/web/app/routes/discipline-share.tsx)
- [../diary-v3/tests/e2e/discipline-share.spec.ts](../../../../diary-v3/tests/e2e/discipline-share.spec.ts)

## Verification plan

Export → OS share/link → guest preview → authenticated import, including malformed input and duplicate import.

Use synthetic data and controlled provider/service fixtures. Native storage/network/link/notification/upgrade claims require actual runtime evidence. If the implementation modifies a shared contract or backend, record current and previously supported client results.

## Evidence

NOT RUN. This ticket was created by the planning task; implementation and acceptance remain open.

## Comments

Planning baseline: full diary-v3 parity is mandatory; beta is an intermediate test activity. Append implementation decisions, findings and evidence here without rewriting history.
