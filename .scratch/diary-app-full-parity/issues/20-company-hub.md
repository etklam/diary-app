# [20] Read Company quote, history and personal context

Status: ready-for-agent
Execution: in-progress (public and owner data, API/model checks and Android bundle complete; native screen acceptance pending)
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

- [x] Show quote/history provenance, currency/time and unavailable/stale/partial states without zero substitution.
- [x] Separate public research from authorized holding/Diary/Thesis context and enforce bounded requests.
- [x] Rapid symbol changes and partial failures cannot replace the current symbol with stale data.
- [ ] Provide native chart plus accessible values and real entrances to implemented research modules. Emulator interaction and TalkBack review remain open.
- [x] Apply relevant PRD invariants and common translation/accessibility/owner-isolation rules; explain any non-applicable check in evidence.
- [x] Record actual commands/scenarios, source/build and results. No criterion is complete solely because code or an old screenshot exists.

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

See [Company Hub acceptance](../../../../docs/evidence/f3/company-hub-acceptance.md). API ownership, partial failures, request ordering and long-history sampling are verified. Native screen interaction remains open.

## Comments

Planning baseline: full diary-v3 parity is mandatory; beta is an intermediate test activity. Append implementation decisions, findings and evidence here without rewriting history.

Implementation note: public `/api/market/quote` and `/api/market/historical` reads are used for guest and signed-in users; `/api/stocks/:symbol/hub` is requested only for a verified owner scope. The private route was moved to the public Expo route tree so public quote/history do not pass through the private auth guard. The Hub UI shows at most ten reviews, notes, evidence items and related Diaries; chart rendering is capped at 64 points and read-aloud values at six samples.
