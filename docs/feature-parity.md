# diary-v3 to diary-app feature parity matrix

Inventory date: 2026-09-22. Target: the complete diary-v3 product in the native app, including administrative capabilities. Read with the [full launch roadmap](launch-roadmap.md).

This is a source-based planning inventory, not a runtime acceptance report. A route or shared API being present does not mean its mobile workflow is implemented or verified. The [full-app PRD](../.scratch/diary-app-full-parity/PRD.md) and [issue tracker](../.scratch/diary-app-full-parity/ISSUES.md) now map all 51 capability families to implementation and acceptance work. F0 verifies the exact operation-level source baseline before implementation.

## Evidence baseline

- Source: diary-v3 HEAD `ce2962f597ef56dc4e4cb8966c1ca1860369e006`. Existing modifications to `tests/unit/native-package-scripts.test.ts` and `tests/unit/pwa.test.ts` were observed and preserved. A final reproducible parity baseline needs the relevant source/worktree manifest.
- Scope: [Product](../../diary-v3/PRODUCT.md), [Plan](../../diary-v3/PLAN.md), [114-story PRD](../../diary-v3/.scratch/diary-v3-rebuild/PRD.md), [52-route registry](../../diary-v3/apps/web/app/routes.ts), [Web page matrix](../../diary-v3/docs/audits/uiux-page-matrix.md), [tool permissions](../../diary-v3/docs/tools-access-matrix.md), current contracts/domain/API source and behavioral tests.
- Route registry SHA-256: `c96bcf47821aefc9af5259c5ab5623ad2475843fd584a3e4086b2f20c159247e`.
- Native evidence: `src/app`, `src/auth`, `src/quick`, `src/reviews`, `src/diaries`, [development record](development-plan.md), [Beta-R2 record](evidence/beta-r2/acceptance.md) and [shared-artifact manifest](../vendor/shared-packages/manifest.json).
- F0 aligned current shared artifacts to `ce2962f597ef`; the prior `7e3a39ad5c49` artifacts remain as an independently installed compatibility fixture. See [package evidence](shared-packages.md).

Statuses: **Carry** = existing native implementation to retain and reverify; **Partial** = a subset exists; **Missing** = no corresponding product workflow found in the app; **Service/Web** = server/Web responsibility with native integration or equivalent behavior to verify. None means final acceptance is complete.

## Product operations

| ID | Capability and required operations | Native status | Phase | Acceptance focus / source evidence |
| --- | --- | --- | --- | --- |
| A01 | Register; login; renew/restore session; logout this client | Partial | F1 | Add registration and continuation; retain secure pair storage. `account-security`, `native-session`, `first-diary` tests. |
| A02 | Change password; logout all devices; session/role revocation | Missing | F1 | Old Web/native/realtime credentials lose their specified access; failed changes retain inputs. |
| A03 | Profile/name, timezone, locale, theme, default workspace and investment preferences; holiday exclusion in statistics | Partial: identity/timezone display only | F1 | Round-trip current settings schema, including exact zero/decimal values and `excludeHolidaysInStats`. |
| A04 | Full public/private/admin navigation, safe link continuation, errors, translations and accessibility | Partial: small private shell | F0–F1 | Guest tools/articles, role routes, zh-TW/zh-CN/en, light/dark, large text, screen-reader labels. |
| D01 | Full Diary create/read/edit/delete; title/body/tags/symbols; original thesis/risk/execution | Partial | F2 | One owner/day; structured aggregate preservation; dirty-state recovery. `diary-editor`, `diary-stocks` tests. |
| D02 | Safe Markdown authoring/preview/reading, links/images, code and wide tables | Missing: body rendered as plain Text | F1–F2 | No arbitrary HTML execution; long content and accessible links; same underlying Markdown content. |
| D03 | Quick free writing, templates/snippets, create/append, related-trade/context discovery and source return | Partial: basic explicit create/append | F2–F3 | Existing-draft precedence, concurrent append, source/date/symbol preservation. `quick-*`, `research-diary-handoff` tests. |
| D04 | Library plus Timeline search/filter/sort/pagination; monthly Calendar/day navigation | Partial | F2 | Preserve implemented discovery, complete source view/actions, Back/restore and invalid range behavior. |
| D05 | BUY/SELL transaction create/edit/delete/corrections within Diary | Missing | F2 | Exact decimals/instants; no oversell; full-ledger historical validation; atomic Diary/transaction rollback. `buy-ledger`, `sell-ledger`, `ledger-corrections`, `transaction-instant` tests. |
| D06 | Diary follow-up/reminder links and Review scheduling fields in authoring | Missing | F2/F6 | Transaction/reminder/review links retain IDs/timestamps; failed aggregate writes leave no partial changes. |
| D07 | Diary Review outcome/reflections, complete/update, schedule/reschedule and return-to-queue | Partial: completion/update and encrypted drafts | F2 | Add scheduling/transitions; private reflection fields; current state and exact time semantics. |
| D08 | Combined Review Queue: Diary and Thesis, buckets/counts/filters/pages | Partial: Diary target only | F2–F3 | Both target types, authoritative totals, applicable source history limits, correct return context. |
| D09 | Trade Plan create/read/update/delete, filters, lifecycle, price/risk inputs and Diary link/unlink | Missing | F2 | Same-owner links, exact decimal-string fields, failed transitions retain state. `trade-plans` tests. |
| R01 | Stock Watchlist add/edit/status/remove | Missing | F3 | Owner isolation, symbol normalization, duplicate/uncertain-save behavior. |
| R02 | Company Hub quote/history, position/research/activity projections and capture entrances | Missing | F3 | Guest research versus private data; quote provenance; partial/unavailable results. `company-hub`, `company-context` tests. |
| R03 | Stock Note create/update/delete; current opinion and permitted partner reading | Missing | F3/F7 | Mutable note semantics and sharing projections; no invented immutable replacement. |
| R04 | Immutable Stock Timeline, provenance/source records, Evidence capture and supported management/link operations | Missing | F3 | Source context, bounded activity, stable evidence and permission rules. `evidence`, `stock-timeline-capture` tests. |
| R05 | Investment Thesis CRUD/lifecycle/activation, Thesis Review and Portfolio Decision | Missing | F3 | Distinguish original thesis from later reflection; integrate combined Review Queue. |
| R06 | Research → Evidence/Quick/Full Diary/Trade Plan handoffs and safe return | Missing | F2–F5 | Existing draft wins unless user chooses otherwise; guest login preserves context without auto-writing. |
| P01 | Holdings, costs, realized/unrealized results and valuation coverage | Missing | F4 | Match authoritative ledger results; show stale/missing quotes and partial totals correctly. |
| P02 | Allocation/beta, exposure/concentration and Portfolio attention actions | Missing | F4 | Preserve fixtures/rounding, distinguish unknown from zero, navigate to actionable source records. |
| P03 | Strategy Performance, transaction statistics/history and closed-trade export | Missing | F4 | Filters, dates/holiday exclusion, large numbers, actual exported content. `performance`, `trade-export` tests. |
| P04 | Complete Overview/daily workspace: attention, reviews, decisions, plans, Portfolio and Watchlist | Missing | F4 | Bounded independent sections, partial errors, first-use state and correct drill-down. |
| T01 | Public tool index and signed-in research workspace | Missing | F1/F5 | No forced login for public use; private capture still requires explicit authenticated submission. |
| T02 | ETF research profile, quote/risk/valuation/relative-return and ETF Watchlist | Missing | F5 | ETF research remains separate from personal stock ledger; unavailable catalog/quote behavior. |
| T03 | Market State, sector breadth and supporting confirmation | Missing | F5 | Correct observation times, missing/warmup/stale data and stable source formulas. |
| T04 | Market Rotation scopes, signals, filters/sorts, qualified comparison dates and trends | Missing | F5 | Same-scope snapshot comparisons, missing-value gaps, refresh races; no invented live ranking. |
| T05 | Rotation CSV, table copy and PNG export | Missing | F5 | Export exactly the selected/filter/sorted snapshot, metadata and locale; inspect actual file/image. |
| T06 | Position Sizing, input/result copy/export and Diary/Plan handoff | Missing | F5 | Shared formula fixtures; private save guarded; result and assumptions preserved. |
| T07 | Financial Freedom/FIRE assumptions, projections and source output actions | Missing | F5 | Pure calculation parity and numeric validation; expose any missing package exports through F0. |
| T08 | Relative Value quotes/manual inputs/history/scenarios/copy/capture | Missing | F5 | Correct timestamp pairing, missing/zero handling and exact displayed-input provenance. |
| T09 | Seasonality fixed monthly reference, timezone, chart/table/interpretation/copy/capture | Missing | F5 | Preserve current fixed S&P 500 dataset and source disclosure; not symbol-specific live history. |
| T10 | SEC company search, filing filters/details, original documents, bounded downloads and ZIP packages | Missing | F5 | Native download/share round trip, cancellation/errors, existing server validation and limits. |
| N01 | Diary single/WEEK/MONTH reminders, root/child dismissal and time rules | Missing | F6 | Account timezone, weekend/cutoff rules, recurrence and root-versus-child cancellation. |
| N02 | Price Alert thresholds/percentage/moving-average conditions, CRUD and explicit rearm | Missing | F6 | Preserve triggered-state edits, source polling cadence and no duplicate trigger claims. |
| N03 | Authenticated foreground realtime, reconnect/foreground REST refresh and revocation | Missing | F6 | REST stays authoritative; no native cookie dependence or private events after revoked access. |
| N04 | Discipline CRUD/reorder/random, import preview/merge, JSON export/share/public import | Missing | F6 | Full round trip, dedup/source behavior, copy failure and selected-content privacy. |
| S01 | Partner invite/accept/withdraw/unlink and independent Diary/Note sharing settings | Missing | F7 | Directional sharing and state distinctions; revoked sharing revalidates on resume. |
| S02 | Timeline Partner comparison, civil-date pairing and bounded history | Missing | F7 | Own and partner views, missing-day versus withheld-data states, no ledger/private Review leakage. |
| S03 | Scoped API-key create/display/revoke | Missing | F7 | One-time secret UI, approved scopes, revoked-key enforcement, no keys in diagnostics. |
| S04 | Agent Diary provenance, scoped research batch ingestion/idempotency, Notes/Watchlist and ordinary Partner integration | Service/Web; native integration missing | F7 | Preserve external contracts; create with synthetic Agent then read/share/revoke from app. |
| C01 | Public home/product information, About and Guide | Partial: beta Help/intro only | F1/F8 | Full product guidance and public access appropriate to native, working internal links. |
| C02 | Public article list/search/category, detail Markdown and sharing | Missing | F8 | Published-only projection, safe images/links, missing article and app/Web URL continuity. |
| C03 | Admin article draft/create/edit/preview/recovery, publish/update/archive/republish/delete/bulk | Missing | F8 | Lifecycle, latest server visibility, unsaved content preservation and ordinary-user denial. |
| C04 | Admin users/search/pagination/roles/delete, system statistics and authorized admin Diary list | Missing | F8 | Self-action guards, server role checks, dependent cleanup/access revocation, private Review exclusion. |
| C05 | Admin ETF catalog/history and existing market batch triggers/status | Missing | F5/F8 | Admin-only controls, valid jobs and authoritative status; no provider secrets in app. |
| X01 | Encrypted persistent drafts, process death, account isolation and upgrades | Carry for Quick/Review only | All; F9 | Extend to full authoring modules and migrations; local draft is never falsely called server-saved. |
| X02 | Native push, device association, server delivery/receipts and notification links | Missing; native-phase extension | F6 | Physical-device permission/receive/tap/logout flows; protect private notification content. |
| X03 | Offline authoring, eligible queued writes, receipt-based recovery and cross-client conflicts | Partial: local drafts only; native-phase extension | F0/F9 | Server idempotency/version protocol precedes replay; finance/admin operations remain explicitly online when required. |
| X04 | API compatibility, providers/jobs, Docker/K3s, health/logs, migrations, backup/restore and CI | Service/Web | F0–F10 | Mobile + previous-client regression against accepted backend; service operations demonstrated separately. |
| X05 | Signed builds, native links/file sharing, updates, support/privacy and distribution | Partial: preparation only | F0–F10 | Actual accepted release binary and physical devices; no inference from bundle/host tests. |

## Every registered Web route has a destination

These are capability mappings, not a requirement to copy Web URL structure or desktop layout into Expo Router. The root `/` has both a public landing and authenticated Overview role. Together the following rows cover all 52 entries in the reviewed registry.

| Source route(s) | Native destination or explicit platform mapping | Phase |
| --- | --- | --- |
| `/`, `/about`, `/guide` | Guest introduction/product information, full Guide/About; signed-in Overview | F1/F4/F8 |
| `/login`, `/register` | Native authentication and safe continuation | F1 |
| `/timeline`, `/diaries`, `/calendar` | Diary Timeline, Library and Calendar views | F2 |
| `/diaries/new`, `/diaries/quick`, `/diaries/:id/edit`, `/diaries/:id`, `/diaries/:id/review` | Full/Quick authoring, read/edit and Diary Review | F2 |
| `/reviews` | Combined Diary/Thesis Review Queue | F2/F3 |
| `/trade-plans`, `/trade-plans/new`, `/trade-plans/:id` | Plan list, editor and detail/lifecycle | F2 |
| `/stocks` | Portfolio/holdings/attention/exposure | F4 |
| `/strategy-performance` | Performance/history/export | F4 |
| `/stocks/watchlist` | Stock Watchlist | F3 |
| `/stocks/:symbol` | Company Hub, Notes, Timeline and Evidence | F3 |
| `/stocks/:symbol/thesis` | Investment Thesis and review | F3 |
| `/alerts`, `/stocks/alerts` | Follow-up reminders and Price Alerts | F6 |
| `/discipline`, `/discipline/share` | Discipline management, native share/import and public-link reader | F6 |
| `/partners`, `/partners/compare` | Relationship/sharing administration and Timeline comparison mode | F7 |
| `/tools` | Public/native Research and Tools directory | F1/F5 |
| `/tools/etf`, `/etf/watchlist` | ETF research and personal ETF Watchlist | F5 |
| `/tools/market-rotation` | Rotation, Market State, comparison and exports | F5 |
| `/tools/position-sizing`, `/tools/financial-freedom` | Native calculators and handoffs | F5 |
| `/tools/relative-value`, `/tools/seasonality` | Native research views/capture | F5 |
| `/tools/sec-filings`, `/tools/sec-filings/:cik/:accession` | SEC search, filing/documents and downloads | F5 |
| `/settings`, `/settings/security`, `/settings/api-keys` | Preferences/account security/API-key management | F1/F7 |
| `/articles`, `/articles/:slug` | Public article browsing/reading/sharing | F8 |
| `/admin/users` | Native admin users, system statistics and authorized Diary listings | F8 |
| `/admin/etf` | Native ETF administration | F8 |
| `/admin/blog`, `/admin/blog/new`, `/admin/blog/:id/edit` | Native publishing administration | F8 |
| `/design-preview` | Internal design/test surface mapped to native component previews; not a missing public product screen | F0 |
| `/sitemap.xml` | Remains a Web-generated SEO resource; verify public links and native association separately | F8/F10 |
| `/blog`, `/blog/:slug` | Keep Web compatibility redirects; map supported incoming links to native article destinations | F8 |

Additional non-route operations are explicitly covered above: transaction correction, Evidence/Notes, trade export, Agent ingestion, admin statistics/Diary projections, realtime/scheduler jobs, push and offline support. Route coverage alone is insufficient.

## Source PRD coverage index

| Source stories | Covered capabilities |
| --- | --- |
| 1–10: accounts/preferences/permissions | A01–A04, X01 |
| 11–22: Diary/Quick/ledger/discovery | D01–D06, R06 |
| 23–27: Overview/Timeline/Calendar | D04, D08, P04 |
| 28–37: Review/Trade Plans | D01, D07–D09, R05 |
| 38–54: Portfolio/Company/research | R01–R06, P01–P03 |
| 55–65: reminders/Discipline | N01–N04 |
| 66–74: Partner/Agent | S01–S04 |
| 75–89: markets/tools/SEC | T01–T10 |
| 90–97: public content/admin | C01–C05 |
| 98–108: cross-platform experience/native compatibility | A04, X01, X04–X05; Web PWA/SEO mapping below |
| 109–114: service operations/full acceptance | X04–X05 and all feature evidence |

Later changes already identified include richer research-to-Diary handoffs, daily workspace, exact-instant authoring preservation and US equity holiday/statistics settings. F0 must inspect the source's current tests/contracts for further operation-level additions; this grouping is not a claim to have replayed all 114 stories.

## Native adaptation rules and completion evidence

Web PWA install/update maps to native installation/update with preserved data. Web SSR/SEO/sitemap/OG stay on the public website; native readers and shared links consume the same public content. Browser keyboard shortcuts become equivalent global native actions, with external-keyboard support assessed where applicable. OS file selection/share replaces browser download mechanics while keeping the actual import/export capability and payload. Keep role-restricted administration in the app.

Each completed work item records: source baseline; operation/role; endpoint/contract; native screen/action; success and rejected/uncertain outcome; synthetic API/native test; screenshot where visual inspection matters; device/build version; outstanding limitations. Required tests include meaningful permissions, integrity, financial precision, timezone, draft restoration and cross-client behavior, not just UI existence.

The public launch requires all baseline capability rows to have passing evidence or a documented platform-equivalent implementation. No module is silently reclassified as “after beta.” New SSO, payments or unrelated features are not invented as parity requirements. Push/offline are tracked separately because source planning reserved them for the native phase.
