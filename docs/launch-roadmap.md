# Full diary-v3 app roadmap

Updated 2026-09-22 after the owner's scope correction.

**Target: implement every valid diary-v3 product capability in diary-app and launch the complete product.** Beta is an intermediate verification activity, not the delivery target. This document replaces the earlier small-cohort-first roadmap and its recommendation to defer major modules until after launch.

The companion [feature parity matrix](feature-parity.md) defines the scope, existing gaps, native destinations and evidence requirements. No application functionality was implemented as part of this planning update.

This roadmap has been converted into a [full-product PRD](../.scratch/diary-app-full-parity/PRD.md) and [70 implementation/acceptance/operator tickets](../.scratch/diary-app-full-parity/ISSUES.md). Their explicit dependency graph governs execution; foundational draft and backend-protocol tickets can start before their later roadmap phase.

## Baseline and definition of complete

The source baseline reviewed is sibling diary-v3 HEAD `ce2962f597ef56dc4e4cb8966c1ca1860369e006`, its current product/PRD, 52 registered Web routes, contracts, domain modules and relevant acceptance cases. Two existing modified test files were observed and left untouched; implementation must freeze an exact source/worktree manifest before claiming parity.

The native app currently implements a subset: login/session/logout, basic Quick Diary create/append, encrypted Quick/Review drafts, searchable Timeline, monthly Calendar, Diary Detail and Diary Review completion/update. These do not yet equal complete Diary functionality: detail currently renders body text directly and shows transaction counts, while full editing, ledger operations and rich Markdown remain missing.

Complete means:

- All capability rows in the matrix have an implementation home and passing native/API acceptance, including guest tools, sharing, export/import and admin operations.
- The app and Web use the same authoritative diary-v3 API and business rules. No parallel backend or independently calculated ledger is introduced.
- Existing source-language support (zh-TW, zh-CN, en), light/dark themes, timezone preferences and accessibility are retained.
- All source permissions, financial precision, dates, lifecycle transitions, errors and cross-module journeys are preserved.
- Push notifications and offline authoring/synchronization, explicitly reserved for the native phase in diary-v3's [Product](../../diary-v3/PRODUCT.md) and [Plan](../../diary-v3/PLAN.md), have their own work packages. They are additional native delivery work, not falsely described as existing Web features.
- Public Web SEO, sitemap, redirects and PWA remain Web responsibilities, with native equivalents for opening links, installation and updates. These mappings must be explicit; administrative product capabilities remain in app scope.
- The complete release passes standalone device, backend compatibility, install-over/data-migration and store acceptance.

Planning assumption pending platform preference: complete Android first, then complete iOS parity. iOS is a separate delivery milestone with its own platform validation, not excluded functionality.

## Implementation sequence and effort

Estimates are remaining focused engineering effort for Android, including module tests, assuming access to the existing backend and reuse of validated domain logic. They are planning ranges, not delivery commitments. Product decisions, unavailable hardware/credentials, provider access and store waiting time are additional dependencies.

| Phase | Scope and deliverable | Dependencies | Estimated effort |
| --- | --- | --- | --- |
| F0 | Freeze parity baseline, native navigation/design, API/package alignment and write/offline contracts | Existing app and diary-v3 | 1–2 weeks |
| F1 | Complete accounts, preferences, guest access and shared native UI foundations | F0 | 2–3 weeks |
| F2 | Complete Diary, Quick, Ledger, Diary Reviews and Trade Plans | F1; authoritative ledger API | 4–6 weeks |
| F3 | Company Hub, Watchlists, Notes, Evidence, Stock Timeline and Investment Thesis | F2 and research contracts | 3–5 weeks |
| F4 | Portfolio, exposure/attention, performance, export and complete Overview | F2–F3 | 3–4 weeks |
| F5 | All market/research tools and their capture/export/download flows | F1–F3; market/jobs API | 4–6 weeks |
| F6 | Discipline, reminders, price alerts, realtime and native push | F1–F3; scheduler and delivery backend | 3–4 weeks |
| F7 | Partners, comparison, API keys and Agent interoperability | F2–F3 and role/session lifecycle | 2–3 weeks |
| F8 | Public content, article publishing and all administration | F1, F5–F7 services | 2–3 weeks |
| F9 | Complete encrypted offline authoring, authorized queued writes and conflict recovery | F0 protocol work; F2–F3/F6 operation semantics | 3–5 weeks |
| F10 | Full-product regression, physical devices, operational readiness and Android launch | All capability and release gates | 3–4 weeks |

Total: approximately **30–45 engineering weeks**, or roughly 7–11 months of uninterrupted single-developer work. For calendar planning, allow approximately **9–13 months** including integration/rework buffer; re-estimate after F0 and the first full Diary/Ledger slice. Do not reuse the previous 6–10-week small-scope launch estimate.

A subsequent iOS release has a provisional **6–10 engineering-week** allowance for native modules/networking, notifications, link/file behavior, devices, signing and App Store acceptance, plus review waiting time. This allowance is low confidence until the first iOS native build. Running iOS checks during each feature phase can move that effort earlier.

These ranges assume one developer. Independent module work can overlap if staffing changes, but API dependencies and integration still control the completion date.

## F0 — Fix the scope and reusable foundations

Engineering foundation completed on 2026-09-22 at the [recorded acceptance layers](evidence/f0/acceptance.md). Operator inputs and release follow-ups remain open.

1. Expand the matrix into operation-level work items: source reference, role, request/response, data changes, native destination, failure cases and acceptance evidence. Cover all 114 source PRD stories and later implemented changes, not just the 52 route names.
2. Freeze source commit plus relevant uncommitted source content/hashes. Review future diary-v3 additions as explicit scope changes rather than chasing a moving target.
3. Compare vendored shared artifacts with the selected source baseline. The pre-F0 artifacts referenced `7e3a39ad5c49` and a recorded dirty source tree, whereas the reviewed backend HEAD differs. Do not infer compatibility from names or replace packages blindly; inspect contracts, publish reproducible packages and retain a previous-client compatibility fixture.
4. Define native navigation: Overview, Diary, Portfolio, Research and More, with a global Quick action. All modules remain reachable; More contains Reviews, Plans, Alerts, Discipline, Partners, Articles, Settings and role-gated Admin. Guest Tools/Articles must be usable before login.
5. Define shared native rendering for Markdown, decimal inputs, precise date/time entry, charts/tables, search/filter/pagination, file import/export and recovery states. Adapt the presentation; preserve actual operations and outputs.
6. Specify operation receipts/idempotency, expected-version checks, draft schema upgrades and offline operation eligibility with the backend before implementing automatic replay. Existing Agent evidence idempotency is not blanket protection for Diary or trade writes.

**Exit:** every feature has a mapped owner/module and acceptance task; selected shared packages and API contracts are compatible; one complete cross-screen native flow demonstrates the common UI foundation.

## F1 — Accounts, settings and consistent native experience

Complete registration, native login/refresh/logout, logout-all, password change, profile/name, language, theme, timezone and investment preferences. Include default workspace page and the US trading-holiday exclusion preference from current settings.

Add safe signed-out continuation for public research and shared links, error recovery, complete translation coverage, accessible labels/large text and deep-link destinations. A guest may calculate/read/export public tools; signing in must not silently submit a private write.

Preserve session/draft ownership through expiry, explicit logout, account switching and remote revocation. Account deletion/recovery required for distribution must have a real service process; distinguish new launch requirements from existing password-change functionality.

**Exit:** guest, USER and ADMIN routes work according to server permissions; saved preferences affect all relevant screens; old sessions are revoked as specified after security operations.

## F2 — Complete Diary and the trading workflow

- Full create/edit/delete with Markdown preview/reading, title, tags, symbols, original thesis/risk/execution, related records and dirty-navigation/durable-draft protection.
- Quick templates/snippets, source context, related-trade/context discovery, explicit append/create, existing-draft precedence and saved return navigation.
- Native BUY/SELL transaction authoring, correction and deletion through the Diary aggregate. Preserve exact decimal strings, precise instants/DST choices, stable transaction IDs, chronological validation, no-oversell rules and atomic rollback.
- Full Library/Timeline/Calendar behavior, date/search/filter/sort/pagination and context preservation. Keep one Diary per owner/civil day.
- Diary Review scheduling, rescheduling, return-to-queue, completion and revision. Include associated alerts and aggregate-field preservation; Thesis-target queue integration completes in F3.
- Trade Plan CRUD, filters, exact price/risk inputs, lifecycle and same-owner Diary links.

**Exit:** create plan → write Diary with BUY → append observation → partial/full SELL → Review → edit/correct/delete all yield the same server results as Web. Invalid historical corrections leave all prior data intact.

## F3 — Company research and investment theses

Implement stock Watchlist CRUD/status, Company quote/history/context, current Stock Notes, immutable sourced Stock Timeline, evidence collection and its existing management operations. Preserve the distinction between editable opinions and historical evidence.

Implement Investment Thesis authoring/lifecycle, activation and review, Portfolio Decision and full Diary/Thesis Review Queue. Carry Company/tool context into Quick or Full Diary, restore existing drafts deliberately and return to the research source after confirmation.

**Exit:** Watchlist → Company → Note/Evidence → Thesis → Review/Portfolio Decision → Diary works without leaving the app, with owner/source boundaries and current/stale/missing market data intact.

## F4 — Portfolio, performance and Overview

Implement holdings, average cost, realized/unrealized results, valuation coverage, allocation/beta, exposure/concentration, attention actions, strategy performance and transaction history/export. Use existing API projections/domain fixtures; missing prices remain missing and decimal precision is preserved.

Complete the Overview composition after its contributing modules exist: due work, review queues, recent decisions/plans, tracked companies and Portfolio context. Each section must recover independently from failed requests.

**Exit:** the same synthetic ledger produces matching Web/native results, including historical corrections, partial valuation, holiday/statistical preferences and exported trades. Overview navigation reaches the corresponding actionable records.

## F5 — Every market and research tool

Deliver all of the following before declaring feature parity:

- ETF catalog research/profile/risk/valuation/relative performance and personal ETF Watchlist.
- Market State, sector breadth, confirmation, timestamps and unavailable/stale states.
- Market Rotation scope/filter/sort, qualified snapshot dates, two-week comparisons/trends and CSV/table-copy/PNG export.
- Position Sizing calculations and Diary/Trade Plan handoff.
- Financial Freedom/FIRE assumptions, results and existing output actions.
- Relative Value input/quote/history comparisons, scenarios, copy and research capture.
- Seasonality's existing fixed monthly S&P 500 reference, timezone-aware current/next month, chart/table/copy/capture. Do not turn the fixed dataset into a claimed live symbol forecast.
- SEC company search, filters, filing/detail/original documents, bounded single/batch download and ZIP sharing.

Use native chart/table/file/share capabilities and retain accessible numeric alternatives. The existing backend handles external providers, cache/rate limits and market jobs; mobile does not receive server credentials or create a second scheduler.

**Exit:** all tools work for guests with the existing access boundaries; signed-in users complete real capture/save flows; actual exported files match the selected data and parameters.

## F6 — Discipline, reminders, realtime and push

Complete Discipline CRUD/reorder/random, import preview/merge, JSON export and public share/import round trips.

Complete Diary one-off and WEEK/MONTH recurrence, child/root cancellation, Price Alert conditions/edit/delete/rearm and their existing scheduling rules. Add authenticated native realtime updates, refresh/revalidation on foreground/reconnect and revocation on logout/role changes.

Implement the native push delivery extension: user/device registration, token rotation/removal, server event delivery and deduplication, denied-permission UX, notification taps and authorized deep links. Decide payload privacy and stale/deleted-target behavior. Server scheduling remains authoritative.

**Exit:** the correct user receives the correct reminder on a physical device, tapping reaches an authorized record, missed notifications recover through REST, and logout prevents delivery to the previous owner's app context.

Use the requested [Expo 57 Notifications reference](https://docs.expo.dev/versions/v57.0.0/sdk/notifications/). Native configuration and a release binary/device check are part of delivery.

## F7 — Partners and external Agent workflows

Implement invite/accept/withdraw/unlink, both users' Diary/Stock Note sharing controls, comparison as a Timeline mode and civil-date pairing. Partner views must continue to exclude transaction/Portfolio/private Review and other disallowed fields.

Implement scoped API-key creation, one-time secret presentation and revoke. Preserve Agent Diary provenance, batch Stock Timeline ingestion/idempotency, Stock Note updates and authorized Watchlist access in the shared service; show their results in the app. AI Agent Partners remain ordinary users/partners without elevated privileges.

**Exit:** synthetic accounts A/B plus a scoped Agent complete sharing and research round trips; changing sharing permissions or revoking keys removes subsequent access, including after app resume.

## F8 — Articles and complete administration

Provide public Home/About/Guide and article list/search/category/detail, safe rich Markdown, sharing and link handling.

Implement ADMIN-only article drafts/edit/preview, durable recovery, publish/update/archive/republish/delete and batch operations. Also implement user search/roles/deletion, system statistics, authorized admin Diary listings, ETF catalog/history administration and existing market batch controls.

Preserve self-administration restrictions, immediate server-side role checks and private Review exclusions. Public content SEO/sitemap/OG remains served by Web; article URLs open the corresponding app screen where appropriate.

**Exit:** administrators can perform all existing product administration from the app, ordinary users cannot, and published/archived content has the same visibility in Web and native.

## F9 — Offline authoring and reliable synchronization

Current encrypted drafts protect writing on one device; they are not a durable server synchronization protocol.

Build an explicit operation-support table in F0 and complete it here. Offline authoring covers Diary/Quick/Review and appropriate research drafts. Any submitted offline operation requires an encrypted owner/environment-bound queue, stable operation ID, atomic server deduplication/result receipt, dependency ordering and an explicit conflict policy.

Resolve cross-device edits using server versions and user-visible decisions. Refresh expired sessions safely, retain pending work across process death and app upgrades, and never reinterpret a pre-protocol uncertain attempt as safe to replay. Financial or administrative operations that require authoritative online validation remain online-only with clear retained-input behavior; offline parity does not mean blindly queuing every destructive action.

Define draft/cache retention, schema migrations and backup exclusions. Test connectivity loss before dispatch, commit-before-response-loss, retries, delayed commits, simultaneous Web edits, account switching and upgrade recovery.

**Exit:** eligible offline work converges to the intended server result without duplicate transactions or silent overwrites. Unsupported offline operations explain their requirement and do not lose input. Storage implementation follows [Expo 57 SQLite](https://docs.expo.dev/versions/v57.0.0/sdk/sqlite/), while correctness comes from the application/server protocol.

## F10 — Full-product acceptance and launch

Run module regression throughout development. The final gate verifies complete journeys, not just the existing small Diary beta:

1. Plan → Diary BUY/SELL → holdings/performance → correction → Review.
2. Tool → evidence/Company/Thesis → Diary → follow-up.
3. Reminder/price condition → background notification → authenticated destination.
4. Partner/Agent creation → sharing → revocation.
5. Admin publishing/user/ETF operations → correct public and private results.
6. Offline draft/queued operation → restart/reconnect → conflict resolution → confirmed result.
7. Signed N → N+1 installation → preserved sessions/drafts/queued operations and compatible older-client API.

Exercise guest/USER/ADMIN, all three locales, themes, large text, keyboard, long Markdown, narrow screens, representative data sizes and multiple physical Android devices. Confirm generated exports/imports, installed release bytes, native encryption/network behavior and clean-install/upgrade paths.

The backend release lane must validate hosting/TLS, required providers/seeds/jobs, source-compatible API, migrations, backups/restore, monitoring, support and deployment recovery. Source diary-v3's old RC2 deployment findings are historical risks to recheck, not assertions about today's live service.

Finish public identity, signing/version ledger, screenshots, privacy/Data safety, account/data-deletion access and review credentials. Preview and production package IDs differ; explicitly plan server data continuity and local-draft transition. Reuse the existing [release runbook](beta/release-runbook.md) for artifact/safety mechanics, extending its test scope to the complete app.

If applicable, account for [Google Play's personal-account closed testing requirement](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en). Internal/beta builds collect evidence while the product is built; no feature is dropped to satisfy a beta date.

**Exit:** every parity row has current passing evidence, no unresolved launch-critical defect remains, the real backend/release artifact is accepted, and store/release-owner requirements are satisfied.

## Work that starts early without blocking feature development

- Hosting, signing, Play account, physical devices and support/policy preparation begin in F0 and run alongside F1–F9.
- Backend changes for operation receipts/conflicts and push begin after F0 design, before their dependent native milestones.
- Localization, accessibility, owner isolation and API compatibility are checked in every module.
- Signed development/internal builds should be exercised regularly; unavailable release credentials do not prevent unrelated feature implementation against the disposable API.
- Do not rewrite existing working auth/draft logic just to create a new phase; extend it with migration and regression evidence.

## Next implementation slice

Start with F0's operation checklist and native shell, then complete F1 and **F2 full Diary authoring/ledger/review/plans**. That establishes the dependencies needed by Portfolio, Company research, reminders and tools.

Existing P0–P1C and Beta-R1/R2 reports remain historical evidence. Their old “deferred until beta feedback” scope restrictions are superseded by this owner's full-product target. The requested [Expo SDK 57 reference](https://docs.expo.dev/versions/v57.0.0/) remains the implementation documentation baseline.
