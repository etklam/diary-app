# [53] Read public articles, About and complete product guidance

Status: ready-for-agent
Execution: not-started
Type: AFK
Phase: F8
Work area: diary-app
Requirements: C01, C02
Source stories: US-090, US-091, US-092

## Parent and outcome

[Full-product PRD](../PRD.md) · [Issue index](../ISSUES.md) · [Common delivery rules](../ISSUE-BREAKDOWN.md)

Deliver public content and guidance for the complete product with native link/share behavior.

## Implementation boundary

Native app implementation; inspect referenced service contracts before changing behavior. Follow the source-defined roles, contracts, financial/date semantics and failure behavior. Extend existing working code where applicable. The concrete starting references below are evidence and entry points, not permission to import Web/server runtime into native.

## Acceptance criteria

- [ ] Provide article category/search/pagination and rich published article reading using the canonical public projection.
- [ ] Hide draft/archived content from ordinary public access; missing media/article has useful recovery.
- [ ] Support canonical article/share and legacy Blog links with safe native routing; retain Web SEO/sitemap/OG responsibilities.
- [ ] About/Guide explain complete current workflows and account/help access, with guest/user/admin-appropriate navigation.
- [ ] Apply relevant PRD invariants and common translation/accessibility/owner-isolation rules; explain any non-applicable check in evidence.
- [ ] Record actual commands/scenarios, source/build and results. No criterion is complete solely because code or an old screenshot exists.

## Blocked by

- [09: Render safe rich Markdown in Diary Detail](09-safe-markdown-reader.md)
- [31: Expose the complete public Tools directory and access model](31-public-tools-directory.md)

Triage readiness describes specification quality. Start implementation only when required predecessor outputs are accepted; missing unrelated release credentials do not block independent product work.

## Source and starting points

- [../diary-v3/apps/web/app/routes/articles.tsx](../../../../diary-v3/apps/web/app/routes/articles.tsx)
- [../diary-v3/apps/web/app/routes/article.tsx](../../../../diary-v3/apps/web/app/routes/article.tsx)
- [../diary-v3/apps/api/src/posts.ts](../../../../diary-v3/apps/api/src/posts.ts)

## Verification plan

Guest search/read/share/open-link and draft/archived denial plus long Markdown/locale/device reading checks.

Use synthetic data and controlled provider/service fixtures. Native storage/network/link/notification/upgrade claims require actual runtime evidence. If the implementation modifies a shared contract or backend, record current and previously supported client results.

## Evidence

NOT RUN. This ticket was created by the planning task; implementation and acceptance remain open.

## Comments

Planning baseline: full diary-v3 parity is mandatory; beta is an intermediate test activity. Append implementation decisions, findings and evidence here without rewriting history.
