# [62] Build and audit the complete standalone Android candidate

Status: ready-for-agent
Execution: not-started
Type: AFK
Phase: F10
Work area: diary-app
Requirements: X05
Source stories: US-101, US-104, US-105, US-106, US-107, US-108

## Parent and outcome

[Full-product PRD](../PRD.md) · [Issue index](../ISSUES.md) · [Common delivery rules](../ISSUE-BREAKDOWN.md)

Extend existing packaging/auditing to an exact full-product production candidate ready for parity acceptance.

## Implementation boundary

Native app implementation; inspect referenced service contracts before changing behavior. Follow the source-defined roles, contracts, financial/date semantics and failure behavior. Extend existing working code where applicable. The concrete starting references below are evidence and entry points, not permission to import Web/server runtime into native.

## Acceptance criteria

- [ ] Build a clean committed source with accepted HTTPS/support/configuration, stable signing and recorded version/hash/provenance.
- [ ] Audit actual release manifest/modules/config and embedded secrets; verify SQLCipher and single-attempt networking at runtime.
- [ ] Use a store-compatible AAB and test actual Play-delivered installation where relevant; separate preview/production identity and draft transition.
- [ ] Run standalone with Metro stopped, verify native installed version and exercise representative write/notification/export/admin flows.
- [ ] Apply relevant PRD invariants and common translation/accessibility/owner-isolation rules; explain any non-applicable check in evidence.
- [ ] Record actual commands/scenarios, source/build and results. No criterion is complete solely because code or an old screenshot exists.

## Blocked by

- [02: Align shared packages and prove previous-client compatibility](02-shared-package-compatibility.md)
- [05: Supply release, hosting, provider and device inputs](05-operator-release-inputs.md)
- [48: Receive native push and open authorized destinations](48-native-push-links.md)
- [54: Author and manage the complete article publishing lifecycle](54-article-administration.md)
- [55: Manage users, system statistics and authorized admin Diaries](55-user-system-administration.md)
- [56: Administer ETF data and existing market jobs](56-etf-market-administration.md)
- [61: Prove encrypted draft and outbox continuity across native upgrades](61-storage-upgrade-continuity.md)
- [63: Verify compatible hosting, jobs, deployment and restore](63-service-operations.md)
- [64: Complete account recovery, deletion access and accurate support/privacy](64-account-data-support.md)

Triage readiness describes specification quality. Start implementation only when required predecessor outputs are accepted; missing unrelated release credentials do not block independent product work.

## Source and starting points

- [eas.json](../../../eas.json)
- [scripts/audit-preview-apk.py](../../../scripts/audit-preview-apk.py)
- [plugins/with-single-attempt-writes.cjs](../../../plugins/with-single-attempt-writes.cjs)
- [docs/beta/release-runbook.md](../../../docs/beta/release-runbook.md)

## Verification plan

Actual signed binary audit plus physical-device HTTPS/standalone smoke and exact download-byte verification.

Use synthetic data and controlled provider/service fixtures. Native storage/network/link/notification/upgrade claims require actual runtime evidence. If the implementation modifies a shared contract or backend, record current and previously supported client results.

## Evidence

NOT RUN. This ticket was created by the planning task; implementation and acceptance remain open.

## Comments

Planning baseline: full diary-v3 parity is mandatory; beta is an intermediate test activity. Append implementation decisions, findings and evidence here without rewriting history.
