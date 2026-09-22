# [58] Extend encrypted draft persistence to complete-product authoring

Status: ready-for-agent
Execution: not-started
Type: AFK
Phase: F0/F9
Work area: diary-app
Requirements: X01
Source stories: US-098, US-102

## Parent and outcome

[Full-product PRD](../PRD.md) · [Issue index](../ISSUES.md) · [Common delivery rules](../ISSUE-BREAKDOWN.md)

Deliver an additive draft foundation exercised by current Quick/Review, ready for full Diary, Note, Thesis, Plan and article editors.

## Implementation boundary

Native app implementation; inspect referenced service contracts before changing behavior. Follow the source-defined roles, contracts, financial/date semantics and failure behavior. Extend existing working code where applicable. The concrete starting references below are evidence and entry points, not permission to import Web/server runtime into native.

## Acceptance criteria

- [ ] Specify per-entity owner/environment keys, schema versioning, serialization and lifecycle without replacing existing Quick/Review namespaces.
- [ ] Opening a reader creates no draft; real edits persist; late reads/writes cannot overwrite newer local content.
- [ ] Define source-compatible expiry/logout/discard and sensitive-field exclusions, with recovery/parse/storage-failure behavior.
- [ ] Prove coexistence/reopen of Quick, multiple Reviews and one new synthetic authoring draft before consumers adopt the adapter.
- [ ] Apply relevant PRD invariants and common translation/accessibility/owner-isolation rules; explain any non-applicable check in evidence.
- [ ] Record actual commands/scenarios, source/build and results. No criterion is complete solely because code or an old screenshot exists.

## Blocked by

- [02: Align shared packages and prove previous-client compatibility](02-shared-package-compatibility.md)
- [04: Establish repeatable API and device acceptance for full parity](04-native-acceptance-harness.md)

Triage readiness describes specification quality. Start implementation only when required predecessor outputs are accepted; missing unrelated release credentials do not block independent product work.

## Source and starting points

- [src/quick/native-storage.ts](../../../src/quick/native-storage.ts)
- [src/quick/repository.ts](../../../src/quick/repository.ts)
- [src/reviews/repository.ts](../../../src/reviews/repository.ts)
- [plugins/with-draft-backup.cjs](../../../plugins/with-draft-backup.cjs)

## Verification plan

Storage/state tests plus native process-death/encryption evidence on an additive schema and owner-switch fixtures.

Use synthetic data and controlled provider/service fixtures. Native storage/network/link/notification/upgrade claims require actual runtime evidence. If the implementation modifies a shared contract or backend, record current and previously supported client results.

## Evidence

F0 specification delivered: [offline/write contract](../../../docs/offline-write-contract.md). Backend receipts and generalized authoring implementation/acceptance remain open; no automatic replay is enabled.

## Comments

Planning baseline: full diary-v3 parity is mandatory; beta is an intermediate test activity. Append implementation decisions, findings and evidence here without rewriting history.
