# [41] Download and share SEC documents and bounded ZIP packages

Status: ready-for-agent
Execution: not-started
Type: AFK
Phase: F5
Work area: diary-app
Requirements: T10
Source stories: US-088, US-089

## Parent and outcome

[Full-product PRD](../PRD.md) · [Issue index](../ISSUES.md) · [Common delivery rules](../ISSUE-BREAKDOWN.md)

Complete the source single/batch document download capabilities as native file operations.

## Implementation boundary

Native app implementation; inspect referenced service contracts before changing behavior. Follow the source-defined roles, contracts, financial/date semantics and failure behavior. Extend existing working code where applicable. The concrete starting references below are evidence and entry points, not permission to import Web/server runtime into native.

## Acceptance criteria

- [ ] Keep server URL/file validation, allowed hosts, size/count/time bounds and canonical filenames.
- [ ] Support single files and selected bounded ZIP bundles with actual content verification.
- [ ] Cancellation/network/disk/share errors leave a clear state and do not claim a completed download.
- [ ] Preserve guest access; no provider credentials or unrestricted arbitrary URL fetcher enters the app.
- [ ] Apply relevant PRD invariants and common translation/accessibility/owner-isolation rules; explain any non-applicable check in evidence.
- [ ] Record actual commands/scenarios, source/build and results. No criterion is complete solely because code or an old screenshot exists.

## Blocked by

- [40: Search SEC companies and read filings and document lists](40-sec-filings-reader.md)

Triage readiness describes specification quality. Start implementation only when required predecessor outputs are accepted; missing unrelated release credentials do not block independent product work.

## Source and starting points

- [../diary-v3/apps/api/src/sec-edgar/download.ts](../../../../diary-v3/apps/api/src/sec-edgar/download.ts)
- [../diary-v3/apps/api/src/sec-edgar/package.ts](../../../../diary-v3/apps/api/src/sec-edgar/package.ts)

## Verification plan

Inspect synthetic document/ZIP contents after native save/share and exercise boundary/cancellation cases.

Use synthetic data and controlled provider/service fixtures. Native storage/network/link/notification/upgrade claims require actual runtime evidence. If the implementation modifies a shared contract or backend, record current and previously supported client results.

## Evidence

NOT RUN. This ticket was created by the planning task; implementation and acceptance remain open.

## Comments

Planning baseline: full diary-v3 parity is mandatory; beta is an intermediate test activity. Append implementation decisions, findings and evidence here without rewriting history.
