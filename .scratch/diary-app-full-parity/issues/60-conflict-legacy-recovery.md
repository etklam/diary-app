# [60] Resolve cross-client conflicts and preserve legacy uncertain attempts

Status: ready-for-agent
Execution: not-started
Type: AFK
Phase: F9
Work area: diary-app
Requirements: X03, X01
Source stories: US-102, US-107

## Parent and outcome

[Full-product PRD](../PRD.md) · [Issue index](../ISSUES.md) · [Common delivery rules](../ISSUE-BREAKDOWN.md)

Complete user-visible conflict handling and safe coexistence of old and new write protocols.

## Implementation boundary

Native app implementation; inspect referenced service contracts before changing behavior. Follow the source-defined roles, contracts, financial/date semantics and failure behavior. Extend existing working code where applicable. The concrete starting references below are evidence and entry points, not permission to import Web/server runtime into native.

## Acceptance criteria

- [ ] Compare meaningful local/server versions and allow explicit preserve/rebase/discard choices without silent overwrite.
- [ ] Handle expiry/reauth, outbox order/dependency failure and remote deletion with retained local work.
- [ ] Never retrofit replay authorization onto a pre-protocol uncertain attempt; matching text/unchanged reads remain insufficient.
- [ ] New receipt-backed attempts recover committed lost responses; confirmed-save/read-refresh failures retry reads only.
- [ ] Apply relevant PRD invariants and common translation/accessibility/owner-isolation rules; explain any non-applicable check in evidence.
- [ ] Record actual commands/scenarios, source/build and results. No criterion is complete solely because code or an old screenshot exists.

## Blocked by

- [59: Queue and deliver eligible user-authorized offline submissions](59-encrypted-outbox.md)
- [07: Change password and revoke all sessions from the app](07-account-security.md)

Triage readiness describes specification quality. Start implementation only when required predecessor outputs are accepted; missing unrelated release credentials do not block independent product work.

## Source and starting points

- [src/quick/controller.ts](../../../src/quick/controller.ts)
- [src/reviews/controller.ts](../../../src/reviews/controller.ts)
- [tests/unit/review-authoring.test.ts](../../../tests/unit/review-authoring.test.ts)

## Verification plan

Two-client competing edits, commit-before-response-loss, expired receipt policy and legacy pending restart tests.

Use synthetic data and controlled provider/service fixtures. Native storage/network/link/notification/upgrade claims require actual runtime evidence. If the implementation modifies a shared contract or backend, record current and previously supported client results.

## Evidence

NOT RUN. This ticket was created by the planning task; implementation and acceptance remain open.

## Comments

Planning baseline: full diary-v3 parity is mandatory; beta is an intermediate test activity. Append implementation decisions, findings and evidence here without rewriting history.
