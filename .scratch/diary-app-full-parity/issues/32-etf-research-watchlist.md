# [32] Deliver ETF research and the personal ETF Watchlist

Status: ready-for-agent
Execution: not-started
Type: AFK
Phase: F5
Work area: diary-app
Requirements: T02
Source stories: US-075, US-076

## Parent and outcome

[Full-product PRD](../PRD.md) · [Issue index](../ISSUES.md) · [Common delivery rules](../ISSUE-BREAKDOWN.md)

Read source ETF profiles/analysis and manage the separate personal research Watchlist.

## Implementation boundary

Native app implementation; inspect referenced service contracts before changing behavior. Follow the source-defined roles, contracts, financial/date semantics and failure behavior. Extend existing working code where applicable. The concrete starting references below are evidence and entry points, not permission to import Web/server runtime into native.

## Acceptance criteria

- [ ] Show profile, quote, risk, valuation and relative-return data with correct source timestamps/status.
- [ ] Support authenticated ETF Watchlist add/read/remove without altering stock ledger holdings.
- [ ] Keep guest research functional and preserve unavailable catalog/quote recovery.
- [ ] Render wide/long research data accessibly with precise numeric labels.
- [ ] Apply relevant PRD invariants and common translation/accessibility/owner-isolation rules; explain any non-applicable check in evidence.
- [ ] Record actual commands/scenarios, source/build and results. No criterion is complete solely because code or an old screenshot exists.

## Blocked by

- [31: Expose the complete public Tools directory and access model](31-public-tools-directory.md)
- [08: Implement complete preferences, localization and themes](08-preferences-localization.md)

Triage readiness describes specification quality. Start implementation only when required predecessor outputs are accepted; missing unrelated release credentials do not block independent product work.

## Source and starting points

- [../diary-v3/apps/api/src/etf-profile.ts](../../../../diary-v3/apps/api/src/etf-profile.ts)
- [../diary-v3/apps/api/src/etf-watchlist.ts](../../../../diary-v3/apps/api/src/etf-watchlist.ts)
- [../diary-v3/tests/e2e/etf-research.spec.ts](../../../../diary-v3/tests/e2e/etf-research.spec.ts)

## Verification plan

Guest research and user Watchlist round trips under partial quotes/catalog failure.

Use synthetic data and controlled provider/service fixtures. Native storage/network/link/notification/upgrade claims require actual runtime evidence. If the implementation modifies a shared contract or backend, record current and previously supported client results.

## Evidence

NOT RUN. This ticket was created by the planning task; implementation and acceptance remain open.

## Comments

Planning baseline: full diary-v3 parity is mandatory; beta is an intermediate test activity. Append implementation decisions, findings and evidence here without rewriting history.
