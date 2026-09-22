# [20] Read Company quote, history and personal context

Status: ready-for-agent
Execution: not-started
Type: AFK
Phase: F3
Work area: diary-app
Requirements: R02
Source stories: US-047, US-054, US-089

## Parent and outcome

[Full-product PRD](../PRD.md) · [Issue index](../ISSUES.md) · [Common delivery rules](../ISSUE-BREAKDOWN.md)

Build Company Hub from existing public/private projections, with usable price history and source context.

## Implementation boundary

Native app implementation; inspect referenced service contracts before changing behavior. Follow the source-defined roles, contracts, financial/date semantics and failure behavior. Extend existing working code where applicable. The concrete starting references below are evidence and entry points, not permission to import Web/server runtime into native.

## Acceptance criteria

- [ ] Show quote/history provenance, currency/time and unavailable/stale/partial states without zero substitution.
- [ ] Separate public research from authorized holding/Diary/Thesis context and enforce bounded requests.
- [ ] Rapid symbol changes and partial failures cannot replace the current symbol with stale data.
- [ ] Provide native chart plus accessible values and real entrances to implemented research modules.
- [ ] Apply relevant PRD invariants and common translation/accessibility/owner-isolation rules; explain any non-applicable check in evidence.
- [ ] Record actual commands/scenarios, source/build and results. No criterion is complete solely because code or an old screenshot exists.

## Blocked by

- [19: Manage stock Watchlist and enter Company research](19-stock-watchlist.md)
- [02: Align shared packages and prove previous-client compatibility](02-shared-package-compatibility.md)
- [08: Implement complete preferences, localization and themes](08-preferences-localization.md)

Triage readiness describes specification quality. Start implementation only when required predecessor outputs are accepted; missing unrelated release credentials do not block independent product work.

## Source and starting points

- [../diary-v3/apps/api/src/company-hub.ts](../../../../diary-v3/apps/api/src/company-hub.ts)
- [../diary-v3/packages/contracts/src/company-hub.ts](../../../../diary-v3/packages/contracts/src/company-hub.ts)
- [../diary-v3/tests/e2e/company-hub.spec.ts](../../../../diary-v3/tests/e2e/company-hub.spec.ts)

## Verification plan

Controlled quote/history failures and guest/A/B Company native flows with chart and long-data review.

Use synthetic data and controlled provider/service fixtures. Native storage/network/link/notification/upgrade claims require actual runtime evidence. If the implementation modifies a shared contract or backend, record current and previously supported client results.

## Evidence

NOT RUN. This ticket was created by the planning task; implementation and acceptance remain open.

## Comments

Planning baseline: full diary-v3 parity is mandatory; beta is an intermediate test activity. Append implementation decisions, findings and evidence here without rewriting history.
