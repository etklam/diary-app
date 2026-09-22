# PRD: Complete diary-v3 native app

Status: ready-for-agent
Feature: diary-app-full-parity
Version: 1
Date: 2026-09-22
Owner: project owner
Delivery state: F0 foundation and F1 account/preferences/reader complete at recorded evidence layers; F2–F10 and full release acceptance remain open

## Problem

The current diary-app delivers only a subset of diary-v3: native sessions, basic Quick Diary, encrypted Quick/Review drafts, Timeline discovery, Calendar, Diary Detail and Diary Review authoring. It does not yet provide the complete investment workflow, research suite, collaboration, publishing or administration.

The owner explicitly requires the entire diary-v3 product in the app. Completing a small Diary beta is not sufficient. The app must preserve operations, permissions, financial calculations, data semantics, import/export and failure behavior, while adapting the interface to native devices.

## Outcome and users

Deliver an installable, supportable native investment workspace using the same authoritative diary-v3 service. Existing valid product capabilities must be available without relying on a desktop browser to finish ordinary or administrative workflows.

Users and representative stories:

- An investor records a plan, writes a Diary with BUY/SELL transactions, corrects mistakes and reviews outcomes against holdings/performance.
- A researcher compares market/ETF/company data, captures evidence, develops a thesis and connects it to a Diary or Portfolio Decision.
- A returning user follows reminders, reopens drafts, continues after an interrupted request and sees an accurate server-save state.
- A partner chooses what to share and compares dated observations without disclosing private trades or reflections.
- An Agent integration uses scoped keys and existing APIs, with provenance visible to the app user.
- A guest reads articles and uses public tools, exports and downloads before deciding to register.
- An administrator manages articles, users, authorized system views, ETF data and market jobs.
- A multilingual user completes the same operations in zh-TW, zh-CN or English, in either theme, using large text or assistive technology.

## Confirmed scope and provisional decisions

Confirmed by the owner: full diary-v3 feature parity, followed by complete-product launch. All 51 capability IDs below are in scope, including administration. Beta is an intermediate evidence activity.

Planning assumptions, not owner approvals:

- Android delivery precedes a complete iOS release; release order/platform targeting remains an explicit operator decision. Shared feature development does not wait for this decision.
- Current Expo SDK 57, React Native and shared API architecture are retained unless a demonstrated compatibility issue requires a change.
- Existing service/provider infrastructure is reused. Push delivery and safe offline synchronization require additional backend work.
- Staffing and the roadmap's 30–45 engineering-week Android estimate are provisional; re-estimate from completed vertical slices. Estimates are not acceptance criteria.

No new SSO, billing, brokerage execution, investment formulas or arbitrary analytics product is introduced by this PRD. Website SEO/SSR/sitemap/OG/PWA remain Web concerns with explicit native installation, link and sharing equivalents. This does not exclude the app's full public content or admin workflows.

## Source of truth and traceability

- [Full roadmap](../../docs/launch-roadmap.md).
- [51-capability matrix and all 52 route mappings](../../docs/feature-parity.md).
- [Source Product](../../../diary-v3/PRODUCT.md), [source Plan](../../../diary-v3/PLAN.md) and [114 source user stories](../../../diary-v3/.scratch/diary-v3-rebuild/PRD.md).
- [Source route registry](../../../diary-v3/apps/web/app/routes.ts), [tool access model](../../../diary-v3/docs/tools-access-matrix.md) and [native implementation history](../../docs/development-plan.md).

Reviewed diary-v3 HEAD: `ce2962f597ef56dc4e4cb8966c1ca1860369e006`; app HEAD at planning: `bb7e9791f34b6a14053ab636327c9021d8166ecc`. The source has existing test worktree changes; neither repository is treated as an immutable clean snapshot until the baseline issue records relevant content and hashes. F0 aligned shared packages to `ce2962f597ef`, retaining the prior dirty `7e3a39ad5c49` artifacts as a separately installed compatibility fixture.

Existing acceptance records describe their original code/build/device layers. They do not count as fresh native full-product acceptance. Every issue maps to requirement IDs; the [issue index](ISSUES.md) supplies requirement and individual source-story coverage.

## Functional requirements

Each row is mandatory for its source-defined roles. Existing native behavior is retained and extended, not discarded. Detailed operations must be checked against the frozen source; source defects are corrected with recorded evidence rather than silently reproduced.

| ID | Required user capability | Minimum acceptance focus |
| --- | --- | --- |
| A01 | Register; login; renew/restore session; logout this client | Add registration and continuation; retain secure pair storage. `account-security`, `native-session`, `first-diary` tests. |
| A02 | Change password; logout all devices; session/role revocation | Old Web/native/realtime credentials lose their specified access; failed changes retain inputs. |
| A03 | Profile/name, timezone, locale, theme, default workspace and investment preferences; holiday exclusion in statistics | Round-trip current settings schema, including exact zero/decimal values and `excludeHolidaysInStats`. |
| A04 | Full public/private/admin navigation, safe link continuation, errors, translations and accessibility | Guest tools/articles, role routes, zh-TW/zh-CN/en, light/dark, large text, screen-reader labels. |
| D01 | Full Diary create/read/edit/delete; title/body/tags/symbols; original thesis/risk/execution | One owner/day; structured aggregate preservation; dirty-state recovery. `diary-editor`, `diary-stocks` tests. |
| D02 | Safe Markdown authoring/preview/reading, links/images, code and wide tables | No arbitrary HTML execution; long content and accessible links; same underlying Markdown content. |
| D03 | Quick free writing, templates/snippets, create/append, related-trade/context discovery and source return | Existing-draft precedence, concurrent append, source/date/symbol preservation. `quick-*`, `research-diary-handoff` tests. |
| D04 | Library plus Timeline search/filter/sort/pagination; monthly Calendar/day navigation | Preserve implemented discovery, complete source view/actions, Back/restore and invalid range behavior. |
| D05 | BUY/SELL transaction create/edit/delete/corrections within Diary | Exact decimals/instants; no oversell; full-ledger historical validation; atomic Diary/transaction rollback. `buy-ledger`, `sell-ledger`, `ledger-corrections`, `transaction-instant` tests. |
| D06 | Diary follow-up/reminder links and Review scheduling fields in authoring | Transaction/reminder/review links retain IDs/timestamps; failed aggregate writes leave no partial changes. |
| D07 | Diary Review outcome/reflections, complete/update, schedule/reschedule and return-to-queue | Add scheduling/transitions; private reflection fields; current state and exact time semantics. |
| D08 | Combined Review Queue: Diary and Thesis, buckets/counts/filters/pages | Both target types, authoritative totals, applicable source history limits, correct return context. |
| D09 | Trade Plan create/read/update/delete, filters, lifecycle, price/risk inputs and Diary link/unlink | Same-owner links, exact decimal-string fields, failed transitions retain state. `trade-plans` tests. |
| R01 | Stock Watchlist add/edit/status/remove | Owner isolation, symbol normalization, duplicate/uncertain-save behavior. |
| R02 | Company Hub quote/history, position/research/activity projections and capture entrances | Guest research versus private data; quote provenance; partial/unavailable results. `company-hub`, `company-context` tests. |
| R03 | Stock Note create/update/delete; current opinion and permitted partner reading | Mutable note semantics and sharing projections; no invented immutable replacement. |
| R04 | Immutable Stock Timeline, provenance/source records, Evidence capture and supported management/link operations | Source context, bounded activity, stable evidence and permission rules. `evidence`, `stock-timeline-capture` tests. |
| R05 | Investment Thesis CRUD/lifecycle/activation, Thesis Review and Portfolio Decision | Distinguish original thesis from later reflection; integrate combined Review Queue. |
| R06 | Research → Evidence/Quick/Full Diary/Trade Plan handoffs and safe return | Existing draft wins unless user chooses otherwise; guest login preserves context without auto-writing. |
| P01 | Holdings, costs, realized/unrealized results and valuation coverage | Match authoritative ledger results; show stale/missing quotes and partial totals correctly. |
| P02 | Allocation/beta, exposure/concentration and Portfolio attention actions | Preserve fixtures/rounding, distinguish unknown from zero, navigate to actionable source records. |
| P03 | Strategy Performance, transaction statistics/history and closed-trade export | Filters, dates/holiday exclusion, large numbers, actual exported content. `performance`, `trade-export` tests. |
| P04 | Complete Overview/daily workspace: attention, reviews, decisions, plans, Portfolio and Watchlist | Bounded independent sections, partial errors, first-use state and correct drill-down. |
| T01 | Public tool index and signed-in research workspace | No forced login for public use; private capture still requires explicit authenticated submission. |
| T02 | ETF research profile, quote/risk/valuation/relative-return and ETF Watchlist | ETF research remains separate from personal stock ledger; unavailable catalog/quote behavior. |
| T03 | Market State, sector breadth and supporting confirmation | Correct observation times, missing/warmup/stale data and stable source formulas. |
| T04 | Market Rotation scopes, signals, filters/sorts, qualified comparison dates and trends | Same-scope snapshot comparisons, missing-value gaps, refresh races; no invented live ranking. |
| T05 | Rotation CSV, table copy and PNG export | Export exactly the selected/filter/sorted snapshot, metadata and locale; inspect actual file/image. |
| T06 | Position Sizing, input/result copy/export and Diary/Plan handoff | Shared formula fixtures; private save guarded; result and assumptions preserved. |
| T07 | Financial Freedom/FIRE assumptions, projections and source output actions | Pure calculation parity and numeric validation; expose any missing package exports through F0. |
| T08 | Relative Value quotes/manual inputs/history/scenarios/copy/capture | Correct timestamp pairing, missing/zero handling and exact displayed-input provenance. |
| T09 | Seasonality fixed monthly reference, timezone, chart/table/interpretation/copy/capture | Preserve current fixed S&P 500 dataset and source disclosure; not symbol-specific live history. |
| T10 | SEC company search, filing filters/details, original documents, bounded downloads and ZIP packages | Native download/share round trip, cancellation/errors, existing server validation and limits. |
| N01 | Diary single/WEEK/MONTH reminders, root/child dismissal and time rules | Account timezone, weekend/cutoff rules, recurrence and root-versus-child cancellation. |
| N02 | Price Alert thresholds/percentage/moving-average conditions, CRUD and explicit rearm | Preserve triggered-state edits, source polling cadence and no duplicate trigger claims. |
| N03 | Authenticated foreground realtime, reconnect/foreground REST refresh and revocation | REST stays authoritative; no native cookie dependence or private events after revoked access. |
| N04 | Discipline CRUD/reorder/random, import preview/merge, JSON export/share/public import | Full round trip, dedup/source behavior, copy failure and selected-content privacy. |
| S01 | Partner invite/accept/withdraw/unlink and independent Diary/Note sharing settings | Directional sharing and state distinctions; revoked sharing revalidates on resume. |
| S02 | Timeline Partner comparison, civil-date pairing and bounded history | Own and partner views, missing-day versus withheld-data states, no ledger/private Review leakage. |
| S03 | Scoped API-key create/display/revoke | One-time secret UI, approved scopes, revoked-key enforcement, no keys in diagnostics. |
| S04 | Agent Diary provenance, scoped research batch ingestion/idempotency, Notes/Watchlist and ordinary Partner integration | Preserve external contracts; create with synthetic Agent then read/share/revoke from app. |
| C01 | Public home/product information, About and Guide | Full product guidance and public access appropriate to native, working internal links. |
| C02 | Public article list/search/category, detail Markdown and sharing | Published-only projection, safe images/links, missing article and app/Web URL continuity. |
| C03 | Admin article draft/create/edit/preview/recovery, publish/update/archive/republish/delete/bulk | Lifecycle, latest server visibility, unsaved content preservation and ordinary-user denial. |
| C04 | Admin users/search/pagination/roles/delete, system statistics and authorized admin Diary list | Self-action guards, server role checks, dependent cleanup/access revocation, private Review exclusion. |
| C05 | Admin ETF catalog/history and existing market batch triggers/status | Admin-only controls, valid jobs and authoritative status; no provider secrets in app. |
| X01 | Encrypted persistent drafts, process death, account isolation and upgrades | Extend to full authoring modules and migrations; local draft is never falsely called server-saved. |
| X02 | Native push, device association, server delivery/receipts and notification links | Physical-device permission/receive/tap/logout flows; protect private notification content. |
| X03 | Offline authoring, eligible queued writes, receipt-based recovery and cross-client conflicts | Server idempotency/version protocol precedes replay; finance/admin operations remain explicitly online when required. |
| X04 | API compatibility, providers/jobs, Docker/K3s, health/logs, migrations, backup/restore and CI | Mobile + previous-client regression against accepted backend; service operations demonstrated separately. |
| X05 | Signed builds, native links/file sharing, updates, support/privacy and distribution | Actual accepted release binary and physical devices; no inference from bundle/host tests. |

## End-to-end acceptance journeys

1. Register → set preferences → create Trade Plan → create Diary with BUY → append observation → partial/full SELL → view holdings/performance → Review → correct or safely delete historical data.
2. Guest tool → compare/calculate → choose private capture → sign in without losing context → explicitly save Evidence/Diary/Plan → read the confirmed result and return to research.
3. Watchlist → Company quote/history → Stock Note/immutable Evidence → Thesis activation → Thesis Review → Portfolio Decision → combined Review Queue.
4. Create single/recurring/price reminder → server evaluates it → foreground or background delivery → notification tap → authorized source; reconnect recovers missed state through REST.
5. Invite Partner → accept and selectively share → compare by civil date → withdraw sharing/unlink; scoped Agent ingestion appears with provenance and stops after key revocation.
6. Admin draft/preview/publish → public reader sees the article → archive removes public visibility; user-role changes/deletion and ETF/job operations obey current authorization.
7. Write offline → restart → reconnect → explicit submission or previously authorized queued submission → resolve a server conflict → confirmed read-back, with no duplicate trade or silent overwrite.
8. Install release N → accumulate sessions/drafts/queued operations → install N+1 without uninstalling → preserve valid data and continue; older compatible app clients still work with the updated API.

Every journey must distinguish loading, empty, partial data, rejected mutation, uncertain mutation, confirmed save and failed subsequent refresh.

## Data and authorization invariants

- INV-01: The diary-v3 API remains the authoritative business entry point. Native code imports only portable contracts/client/domain packages, never database/server/Web runtime modules.
- INV-02: IDs and persisted monetary quantities/prices remain decimal strings. Civil dates remain YYYY-MM-DD; instants retain precision and UTC semantics. Local date editing handles DST gaps/folds explicitly.
- INV-03: One Diary per owner/civil day. Diary, transaction, reminder and linked-record changes preserve existing atomicity and chronological no-oversell rules.
- INV-04: Unknown or stale quotes never become zero/current data. Financial calculations, calendar/holiday exclusions and rounding match authoritative fixtures.
- INV-05: Every read/write enforces server-side ownership, scope and current role. Partner/admin projections cannot expose private Review text through secondary views.
- INV-06: Guest tools stay public; private capture requires an explicit authenticated action. A login return path or notification link cannot authorize a write or bypass ownership.
- INV-07: Session storage and drafts stay owner/environment-bound. Expiry preserves eligible drafts; explicit discard/logout follows clear user choice; late callbacks cannot repopulate another account.
- INV-08: Uncertain mutations retain their exact attempt. Before the receipt protocol is adopted, retries/refresh/reconnect must not silently replay them. Old uncertain attempts remain on their conservative recovery path.
- INV-09: Realtime and push signal change; authenticated REST supplies authoritative state. Revoke device association on logout/account change; minimize private push payloads.
- INV-10: Native upgrade/schema migration never resolves failure by clearing data, rotating keys or uninstalling. Local encryption is not a claim of end-to-end encryption.
- INV-11: Three locales, both themes, accessible labels, large text and long/wide content are requirements of every new surface, not a final translation-only task.
- INV-12: Sensitive content, credentials, keys and database files are excluded from diagnostics and fixtures. Use disposable synthetic accounts/data and controlled market/provider responses.

## Native offline behavior

The initial offline protocol must explicitly classify each operation rather than imply every mutation works offline.

| Operation | Required offline behavior |
| --- | --- |
| Quick create/append; content-only Full Diary create/update; Diary Review completion/update; Stock Note create/update | Preserve encrypted edits. Queue a user-authorized submit only after server receipts/idempotency/version conditions are implemented and tested for that operation. Preserve ordering and owner context. |
| Full Diary containing ledger/reminder changes; Trade Plan/Thesis/article authoring | Preserve supported editable drafts. Submission may require online authoritative validation; state this clearly. Any later queued support must meet the same protocol gates. |
| Deletes, account/security/admin/role/key operations and financial corrections | Online authoritative validation; no blind offline destructive replay. Retain appropriate non-secret input and explain availability. |
| Previously uncertain attempts without protocol IDs | Preserve current locked recovery; never synthesize an ID and replay an operation whose outcome is unknown. |
| Reads and exports while disconnected | Display only deliberately retained data with scope/freshness labels. Do not introduce an unbounded private cache or imply live provider results. |

Server protocol acceptance covers owner-bound operation IDs and payload hashes, atomic deduplication with the actual mutation, retrievable terminal outcomes, version conflicts, ordering, retention/expiry behavior and concurrent duplicate requests. A same-text GET is not a receipt. Outbox UI distinguishes a saved draft, queued submission, sending, conflict, uncertain legacy attempt and confirmed server result.

## Native notifications

Deliver server-triggered reminders to associated devices using an explicitly selected provider/credential configuration. Device enrollment, rotation, logout/unlink, event deduplication and delivery failure handling are backend responsibilities. Permission denial must leave in-app reminders usable.

Validate foreground/background/cold-start taps on physical devices, account changes, expired sessions and deleted/unshared targets. Reuse authoritative recurrence and price-check jobs; do not create a second mobile scheduler for server price conditions. SDK integration follows [Expo 57 Notifications](https://docs.expo.dev/versions/v57.0.0/sdk/notifications/).

## Architecture and sequencing

Keep the standalone app repository and the existing shared-package distribution model while verifying package provenance/compatibility. Extend existing native session/draft/write protections. Do not replace the whole auth or storage stack to implement feature parity.

The roadmap's F0–F10 groups organize delivery. The issue dependency graph determines actual start order: backend receipts, draft migration foundations, operator inputs and native build probes start early where possible. One module includes its native UI, API integration and meaningful acceptance; architectural tasks must deliver a real tracer flow or a tested contract.

Backend work is identified explicitly in this local tracker, with diary-v3 paths and compatibility expectations. Implementing those tickets later requires the applicable repository instructions and filesystem authorization; creating this plan does not grant deployment or secret access.

## Validation and quality gates

- Compare user-visible outputs and persisted results using the same synthetic scenarios as source tests. Preserve existing source tests; add focused native/device evidence.
- Use pure tests for calculations/state, disposable PostgreSQL/API tests for integrity/concurrency/permissions, and native runtime tests for navigation, storage, lifecycle, notifications, file sharing and upgrades.
- Keep existing lint/typecheck/unit/export checks and shared contract drift/previous-client checks. Choose additional checks for the changed behavior rather than treating screenshots or bundle compilation as runtime evidence.
- Test representative guest/USER/ADMIN, locales/themes, long content, narrow/large-text screens, missing market data, interrupted writes and revoked access. Establish measured performance budgets during baseline work and record regressions; do not invent current latency measurements.
- No accepted module may have an unresolved data-loss, duplicate-financial-write, cross-owner disclosure or core-workflow blocker.
- A completed ticket records exact source/build, commands/scenarios, actual results, device/OS where relevant and remaining limitations. Checkboxes stay open until evidence exists.

## Full-product release gates

All capability requirements and applicable platform mappings must have passing current evidence. Complete cross-module journeys, physical-device release/network/encryption checks, signed install-over upgrades and backend compatibility are mandatory.

Operations must prove hosted HTTPS, providers/seeds/jobs, migrations, restore, monitoring/support and recovery. A server backup is not recovery for unsent device drafts. Privacy/account data controls, store declarations, reviewer access and signing/version history must reflect reality.

Preview and production identities are distinct; plan server continuity and user handling of local drafts before switching. Store rules are rechecked at submission. Public distribution and permanent signing/hosting choices remain release-owner actions; this planning task creates no deployment or invitation.

Android and iOS have separate platform evidence and release tickets. A successful Android binary does not verify iOS networking, storage, notifications or links.

## Open decisions and external inputs

- Platform release order: provisional Android then iOS; record the owner's choice without blocking common implementation.
- Hosted API/support/privacy/data-retention details, permanent signing identities, provider credentials, store accounts and physical devices.
- Push provider and backend receipt/conflict/storage design: resolve in explicit architecture/implementation issues, supported by synthetic proofs.
- Final product name and store positioning; preserve complete functionality regardless of marketing choices.

These decisions do not reopen the confirmed full-parity scope. No module becomes “after beta” by default.

## Planning artifacts

[ISSUES.md](ISSUES.md) lists the work, triage roles, dependencies and coverage. [ISSUE-BREAKDOWN.md](ISSUE-BREAKDOWN.md) defines common implementation/evidence rules. Individual tickets live under `issues/`.

Acceptance state: **F0 and F1 complete at recorded layers; full-product acceptance remains open**. Existing native slices are reusable baseline evidence, not completed tickets in the new tracker.
