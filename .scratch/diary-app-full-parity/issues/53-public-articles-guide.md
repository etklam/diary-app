# [53] Read public articles, About and complete product guidance

Status: ready-for-agent
Execution: in-progress
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

- [x] Provide article category/search/pagination and rich published article reading using the canonical public projection.
- [ ] Hide draft/archived content from ordinary public access; missing media/article has useful recovery. Public denial and missing-URL/article recovery are verified; newly fixed HTTPS cover-load failure still needs native confirmation.
- [ ] Support canonical article/share and legacy Blog links with safe native routing; retain Web SEO/sitemap/OG responsibilities.
- [x] About/Guide explain complete current workflows and account/help access, with guest/user/admin-appropriate navigation.
- [x] Apply relevant PRD invariants and common translation/accessibility/owner-isolation rules; explain any non-applicable check in evidence.
- [x] Record actual commands/scenarios, source/build and results. No criterion is complete solely because code or an old screenshot exists.

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

See [F8 public articles and guidance acceptance](../../../docs/evidence/f8/public-articles-guide-acceptance.md) and the [Android article detail](../../../docs/evidence/f8/article-detail-android.png). App list/detail and guidance were exercised on the Android 16 emulator with a read-only synthetic API fixture; source post API integration tests also passed. Canonical website sharing remains open until the release owner records the public website origin.

## Implementation evidence

- Added schema-validated public list/detail routes, safe slug normalization, legacy Blog redirects, safe Markdown display, localized About/Guide content and guest/user entry points. The optional `EXPO_PUBLIC_WEB_ORIGIN` is validated as a bare HTTPS origin and is not derived from the API origin. With no value, the share sheet uses a native `diaryapp://` article link.
- The source website Article route continues to own canonical metadata, sitemap and Open Graph behavior. Native article administration is not exposed here; it belongs to #54.
- The emulator showed category and search results, both pagination pages, rich Markdown, the Android share chooser, direct app-link opening, legacy Blog fallback, missing article/media recovery and Traditional Chinese copy. Accessible labels/roles were present in the Android UI hierarchy. No production website origin, spoken TalkBack session or physical device was available.
- The live public list on API 3101 was empty. Emulator content came from a read-only fixture on 3102; the shared PostgreSQL database was not modified. The fixture and Metro were stopped after testing, leaving the authorized API/database services running.

## Commands and results

- `npm run verify` — lint/typecheck passed; 246 tests passed and 12 gated app API tests skipped; Android export passed.
- `npm run android:build` — Gradle build succeeded and installed the SDK 57 app on `DiaryApp_API_36` (Android 16/API 36, x86_64). APK SHA-256: `D0241A70C5219FDF22DCAC89B07D369981674F1294FE5F17DC809D8A44C81623`.
- `npx vitest run tests/integration/posts.test.ts` in `diary-v3` — 8 passed using a newly provisioned/disposed PostgreSQL database; verified draft/archived public denial, public author privacy, role authorization and lifecycle/search behavior.
- `npm test -- tests/unit/articles.test.ts` — 3 passed, covering safe article routes, canonical origin/media validation and Chinese translations.

## Still open

- The canonical public website origin is not recorded in #05. Until it is supplied and `EXPO_PUBLIC_WEB_ORIGIN` is configured, public canonical sharing and site-relative media cannot be accepted against the production website.
- Spoken TalkBack and physical-device review remain part of full-platform acceptance.
- Confirm the new HTTPS image `onError` recovery on native with a controlled failed load; its three-locale host component checks passed, but the previous APK did not contain this fix.

## Comments

Planning baseline: full diary-v3 parity is mandatory; beta is an intermediate test activity. Append implementation decisions, findings and evidence here without rewriting history.

2026-09-27: Independent audit confirmed that the tested `diaryapp://` fallback and legacy redirects do not close canonical HTTPS sharing. No origin was invented; that criterion remains open for an owner-approved bare HTTPS origin plus actual share/open/site-relative-cover checks. Found and fixed missing recovery when a valid HTTPS cover fails to load: the isolated ArticleCover component now displays localized wrapping text with a polite accessibility announcement. Six focused article tests, focused ESLint and full TypeScript pass. The media criterion is reopened only for native confirmation of this newly discovered load-failure scenario; prior draft/archived denial and missing article/URL evidence remains valid. No AVD, backend or Diary editor was touched. See the follow-up audit in the evidence document for exact layers and file hashes.
