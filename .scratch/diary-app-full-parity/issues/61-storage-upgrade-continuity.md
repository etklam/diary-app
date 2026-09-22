# [61] Prove encrypted draft and outbox continuity across native upgrades

Status: ready-for-agent
Execution: not-started
Type: AFK
Phase: F9
Work area: diary-app
Requirements: X01, X03, X05
Source stories: US-101, US-107

## Parent and outcome

[Full-product PRD](../PRD.md) · [Issue index](../ISSUES.md) · [Common delivery rules](../ISSUE-BREAKDOWN.md)

Verify schema and signed install-over updates preserve all existing authoring and synchronization state.

## Implementation boundary

Native app implementation; inspect referenced service contracts before changing behavior. Follow the source-defined roles, contracts, financial/date semantics and failure behavior. Extend existing working code where applicable. The concrete starting references below are evidence and entry points, not permission to import Web/server runtime into native.

## Acceptance criteria

- [ ] Use stable package/certificate/environment and increasing versionCode for controlled N → N+1 updates.
- [ ] Preserve session, Quick, multiple Review, full authoring drafts and new/legacy pending attempts with original keys.
- [ ] Exercise real schema migration and failure interruption; do not substitute a same-schema version bump as migration evidence.
- [ ] Demonstrate post-upgrade reads/writes and safe failure behavior without uninstall, data clearing or key rotation.
- [ ] Apply relevant PRD invariants and common translation/accessibility/owner-isolation rules; explain any non-applicable check in evidence.
- [ ] Record actual commands/scenarios, source/build and results. No criterion is complete solely because code or an old screenshot exists.

## Blocked by

- [05: Supply release, hosting, provider and device inputs](05-operator-release-inputs.md)
- [60: Resolve cross-client conflicts and preserve legacy uncertain attempts](60-conflict-legacy-recovery.md)

Triage readiness describes specification quality. Start implementation only when required predecessor outputs are accepted; missing unrelated release credentials do not block independent product work.

## Source and starting points

- [plugins/with-draft-backup.cjs](../../../plugins/with-draft-backup.cjs)
- [scripts/preview-build.cjs](../../../scripts/preview-build.cjs)
- [docs/beta/release-runbook.md](../../../docs/beta/release-runbook.md)

## Verification plan

Physical-device migration/install-over with exact synthetic field comparison and failed-migration recovery evidence.

Use synthetic data and controlled provider/service fixtures. Native storage/network/link/notification/upgrade claims require actual runtime evidence. If the implementation modifies a shared contract or backend, record current and previously supported client results.

## Evidence

NOT RUN. This ticket was created by the planning task; implementation and acceptance remain open.

## Comments

Planning baseline: full diary-v3 parity is mandatory; beta is an intermediate test activity. Append implementation decisions, findings and evidence here without rewriting history.
