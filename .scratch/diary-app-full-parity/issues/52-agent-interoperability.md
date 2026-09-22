# [52] Verify Agent ingestion, provenance and Partner integration

Status: ready-for-agent
Execution: not-started
Type: AFK
Phase: F7
Work area: diary-app + diary-v3 compatibility
Requirements: S04
Source stories: US-071, US-072, US-073, US-074

## Parent and outcome

[Full-product PRD](../PRD.md) · [Issue index](../ISSUES.md) · [Common delivery rules](../ISSUE-BREAKDOWN.md)

Prove existing external Agent operations remain usable and their results appear correctly in the complete native product.

## Implementation boundary

App/service integration; apply the instructions and permissions of each repository before changing it. Follow the source-defined roles, contracts, financial/date semantics and failure behavior. Extend existing working code where applicable. The concrete starting references below are evidence and entry points, not permission to import Web/server runtime into native.

## Acceptance criteria

- [ ] Use source scopes for Agent Diary create, allowed research batch ingestion, Note updates and Watchlist reads.
- [ ] Preserve source labels, owner identity, batch limits and immutable timeline idempotency; no privileged Agent bypass.
- [ ] Read newly ingested records and permitted partner content in native without manual server manipulation.
- [ ] Repeat a batch and revoke the key/relationship to prove deduplication and access boundaries; report any missing contract integration.
- [ ] Apply relevant PRD invariants and common translation/accessibility/owner-isolation rules; explain any non-applicable check in evidence.
- [ ] Record actual commands/scenarios, source/build and results. No criterion is complete solely because code or an old screenshot exists.

## Blocked by

- [51: Create, inspect and revoke scoped API keys](51-scoped-api-keys.md)
- [22: Capture Evidence and read immutable Stock Timeline records](22-evidence-stock-timeline.md)
- [49: Manage Partner invitations and independent sharing settings](49-partner-relationships.md)
- [50: Compare partner Diaries and read permitted Stock Notes](50-partner-timeline.md)

Triage readiness describes specification quality. Start implementation only when required predecessor outputs are accepted; missing unrelated release credentials do not block independent product work.

## Source and starting points

- [../diary-v3/apps/api/src/agent-stocks.ts](../../../../diary-v3/apps/api/src/agent-stocks.ts)
- [../diary-v3/packages/contracts/src/api-keys.ts](../../../../diary-v3/packages/contracts/src/api-keys.ts)
- [../diary-v3/packages/contracts/src/stock-timeline-source.ts](../../../../diary-v3/packages/contracts/src/stock-timeline-source.ts)

## Verification plan

Synthetic Agent → native evidence/Diary → partner view round trip with repeated batch and key revocation.

Use synthetic data and controlled provider/service fixtures. Native storage/network/link/notification/upgrade claims require actual runtime evidence. If the implementation modifies a shared contract or backend, record current and previously supported client results.

## Evidence

NOT RUN. This ticket was created by the planning task; implementation and acceptance remain open.

## Comments

Planning baseline: full diary-v3 parity is mandatory; beta is an intermediate test activity. Append implementation decisions, findings and evidence here without rewriting history.
