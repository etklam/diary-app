# [63] Verify compatible hosting, jobs, deployment and restore

Status: ready-for-agent
Execution: not-started
Type: AFK
Phase: F10
Work area: diary-v3 + operator
Requirements: X04
Source stories: US-109, US-110, US-111, US-112, US-113

## Parent and outcome

[Full-product PRD](../PRD.md) · [Issue index](../ISSUES.md) · [Common delivery rules](../ISSUE-BREAKDOWN.md)

Make the shared service operationally ready for the full app using isolated, authorized deployment evidence.

## Implementation boundary

App/service integration; apply the instructions and permissions of each repository before changing it. Follow the source-defined roles, contracts, financial/date semantics and failure behavior. Extend existing working code where applicable. The concrete starting references below are evidence and entry points, not permission to import Web/server runtime into native.

## Acceptance criteria

- [ ] Verify accepted HTTPS ingress, API versions, external providers, required seeds and one active scheduler across rollout.
- [ ] Exercise migrations, backup/restore and compatible deployment recovery with synthetic data and documented operator commands.
- [ ] Demonstrate health/readiness and privacy-safe request/job/delivery diagnostics with clear ownership/escalation.
- [ ] Run source contract/integrity/previous-client checks in CI and verify built deployment artifacts; reassess historical RC2 blockers with current evidence.
- [ ] Apply relevant PRD invariants and common translation/accessibility/owner-isolation rules; explain any non-applicable check in evidence.
- [ ] Record actual commands/scenarios, source/build and results. No criterion is complete solely because code or an old screenshot exists.

## Blocked by

- [05: Supply release, hosting, provider and device inputs](05-operator-release-inputs.md)
- [02: Align shared packages and prove previous-client compatibility](02-shared-package-compatibility.md)
- [47: Add owner-bound device enrollment and server push delivery](47-push-delivery-service.md)
- [57: Implement receipt-based writes and optimistic concurrency in the API](57-write-receipts-concurrency.md)

Triage readiness describes specification quality. Start implementation only when required predecessor outputs are accepted; missing unrelated release credentials do not block independent product work.

## Source and starting points

- [../diary-v3/ops/k8s/production/README.md](../../../../diary-v3/ops/k8s/production/README.md)
- [../diary-v3/docs/operations/environment-contract.md](../../../../diary-v3/docs/operations/environment-contract.md)
- [../diary-v3/docs/acceptance/rc2.md](../../../../diary-v3/docs/acceptance/rc2.md)

## Verification plan

Authorized isolated deployment/restore smoke, jobs/provider fixtures and observed CI/artifact compatibility results.

Use synthetic data and controlled provider/service fixtures. Native storage/network/link/notification/upgrade claims require actual runtime evidence. If the implementation modifies a shared contract or backend, record current and previously supported client results.

## Evidence

NOT RUN. This ticket was created by the planning task; implementation and acceptance remain open.

## Comments

Planning baseline: full diary-v3 parity is mandatory; beta is an intermediate test activity. Append implementation decisions, findings and evidence here without rewriting history.
