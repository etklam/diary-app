# F8 public articles and guidance acceptance

Date: 2026-09-26  
App source: `471b63381bc3b612e6bdb0ae4d127554ded30f0b` plus the recorded uncommitted ticket changes  
Source API: `ce2962f597ef56dc4e4cb8966c1ca1860369e006`

## Delivered

- Added guest-readable Articles list and detail screens using the vendored `postPublicListResponseSchema` and `postPublicDetailSchema`. The list has category, search and pagination; the reader uses the existing safe native Markdown renderer.
- Added safe article slug routing, canonical `/articles/:slug` routes and legacy `/blog/:slug` redirects. Missing or unpublished detail, unavailable API, and missing cover media each have a useful recovery message.
- Added canonical website-share support through optional `EXPO_PUBLIC_WEB_ORIGIN`. It accepts only a bare HTTPS origin; the value is never inferred from the API origin. With no approved website origin, native sharing uses the `diaryapp://articles/:slug` app link. Site-relative cover URLs resolve only against a validated origin; safe HTTPS CDN URLs remain supported.
- Added Articles, About and workflow guidance links on guest Start, signed-in Account, Guide, About, and the More destination. Guidance describes current native tool availability and leaves publishing controls to the separate admin ticket.
- Kept SEO, canonical metadata, sitemap and Open Graph output on the existing website Article route; no web/server source was modified.

## Verification

- `npm run verify` — passed lint, typecheck, **246 tests passed**, 12 separately gated app API tests skipped, Android export passed. Bundle: `entry-673bbccce731ff0894d821f2aa3b694c.hbc`, 4,837,297 bytes, SHA-256 `4C6234C1783BE2A8A4EA08057E6B96BE5306F1E676A6DF85EEA0668951E4DCA3`.
- `npm run android:build` — Gradle build succeeded and installed the current SDK 57 debug app on `DiaryApp_API_36` (`emulator-5554`, Android 16/API 36, x86_64). APK: 101,980,015 bytes, SHA-256 `D0241A70C5219FDF22DCAC89B07D369981674F1294FE5F17DC809D8A44C81623`.
- `npx vitest run tests/integration/posts.test.ts` in `diary-v3` — all 8 source API integration tests passed against a newly provisioned and disposed PostgreSQL test database. They cover draft exclusion from public list/detail, public author email omission, admin authorization, publish/archive/republish lifecycle and public search behavior.
- `npm test -- tests/unit/articles.test.ts` — 3 passed, covering safe canonical/deep-link routes, HTTPS/origin/media validation and translation coverage for English-to-Traditional/Simplified Chinese.
- Android emulator scenarios used a read-only synthetic API fixture at port 3102; it did not connect to or write PostgreSQL. Guest Start opened Articles. Search and Market category filters retained the fixture result. Page 1 showed `Page 1 / 2`; Next opened page 2 and showed only the tenth row, with Next disabled. The article screen rendered heading, emphasis, bullets, GFM table, link, author/date and missing-cover recovery. Android’s share chooser displayed `diaryapp://articles/synthetic-acceptance-article`; opening that URL returned to the article. `diaryapp://blog/unpublished` safely redirected to the unpublished-article recovery screen.
- Changed the app language to Traditional Chinese on the emulator and verified localized Articles filters, detail actions, cover recovery and missing-article text. The app exposes labeled search input, radio-style category choices and labeled buttons in the Android accessibility hierarchy.
- Screenshot: [Android article detail](article-detail-android.png), SHA-256 `77EE7C0186704991710C849FCCC9BBAE98831B98457C009C8FE0BD4CB1DDC9FC`.
- Live `GET http://127.0.0.1:3101/api/blog` returned HTTP 200 with an empty public list. No content was added to that shared test database. The temporary Metro server and read-only fixture were stopped after emulator checks; the approved PostgreSQL service on `127.0.0.1:55433` and API on `3101` remain available.

## Remaining acceptance

- The release owner has not supplied the canonical public website origin. The app uses the tested native-link fallback until `EXPO_PUBLIC_WEB_ORIGIN` is set, so canonical website sharing and site-relative covers still need a check against the approved host.
- No spoken TalkBack session or physical Android device check was available. Native controls expose labels/roles in the emulator accessibility tree; spoken and physical-device review remains part of platform acceptance.
- Public owner isolation is not applicable to guest projections; source integration tests confirmed public authors contain only `id` and `name`, not email. Article publishing/admin actions belong to ticket #54.

## Independent acceptance audit and cover recovery (2026-09-27)

The existing `ui-article-share-final.xml` / `ui-article-share-sheet.xml` evidence contains `diaryapp://articles/synthetic-acceptance-article`; `ui-article-deeplink.xml` contains the corresponding published article, and `ui-legacy-unpublished-zh-TW.xml` contains translated unpublished-article recovery. These are installed-app fallback and legacy-path proofs. They do **not** prove that a recipient without the app can open a canonical public HTTPS article. No additional canonical-sharing criterion can be closed from these artifacts.

Read-only source review confirmed:

- `src/articles/model.ts` builds `${origin}/articles/${encodedSlug}` only from a valid bare HTTPS origin. `ArticleScreen.tsx` uses it before the native-link fallback; `app.config.ts` supplies `extra.publicWebOrigin` from `EXPO_PUBLIC_WEB_ORIGIN`. The API host is not substituted.
- Native `/blog/:slug` redirects to the canonical native `/articles/:slug` path through validated slug routing. Native continuation accepts the app schemes; there is no claim of verified HTTPS universal/app-link association.
- The source Web `routes/article.tsx` owns canonical/description/Open Graph metadata, `routes/sitemap.ts` builds canonical article sitemap entries, and `routes/blog-redirect.tsx` issues the legacy 308 redirect. These files were inspected, not modified or redeployed.
- The smallest canonical-sharing completion input is the release owner's approved bare HTTPS website origin. Configure it, then capture the native share payload for a published article and open that URL as a guest to verify the matching public page. Also check a site-relative cover against that origin. Domain-association/native interception of HTTPS links is not established by this check and is not claimed.

The audit found a separate missing-media gap: the earlier fixture's relative `/uploads/synthetic-article.png` tested URL-unavailable recovery with no configured web origin. A valid HTTPS image URL that failed at load time previously had no `onError` recovery. `ArticleCover.tsx` now replaces the failed image with the existing localized recovery text and a polite accessibility announcement; text can wrap with font scaling. The component is keyed by its validated URI, so a different cover gets a fresh load attempt. Article text and share controls stay available. This change adds no SDK module, dependency, backend operation or API contract.

Fresh commands:

- `npx vitest run tests/unit/articles.test.ts tests/unit/article-cover.test.ts` — **6/6 passed**. The three added host component-contract cases invoke the native image's `onError` callback and verify replacement with translated, accessible, wrapping recovery text in English, Traditional Chinese and Simplified Chinese. React state/preferences and native primitives are mocked; this is not a native network/image test.
- `npx eslint src/articles/ArticleScreen.tsx src/articles/ArticleCover.tsx tests/unit/article-cover.test.ts` — passed without warnings.
- `npm run typecheck` — passed for the shared worktree.

App source remains HEAD `471b63381bc3b612e6bdb0ae4d127554ded30f0b` plus recorded shared-worktree changes. SHA-256: `src/articles/ArticleScreen.tsx` = `45E2247C67F9EFE0CB84B6FD3E1CB7BFF21A64835E18243D3C0577F9A5C3C212`; `src/articles/ArticleCover.tsx` = `60BF222515B3792A9B40933747787ACE15F805B33DBE87E178E32B3B5567ED80`; `tests/unit/article-cover.test.ts` = `97C1453E21237409156E461B9927B8CF9A252ECFEFCB21EC45C30FEBDD62478F`.

No AVD interaction occurred in this follow-up. The new cover recovery still needs one native controlled HTTPS 404/load-failure scenario, confirming visible recovery and continuing article readability; the historical APK/screenshot above does not contain this fix. Canonical HTTPS sharing remains open pending the owner origin and the checks described above.
