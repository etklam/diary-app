# F5 SEC company, filing and document acceptance

Date: 2026-09-26 (Asia/Taipei)

## Build and source

- App commit: `471b63381bc3b612e6bdb0ae4d127554ded30f0b` (working tree contains the implementation under review).
- Source API/contracts commit: `ce2962f597ef56dc4e4cb8966c1ca1860369e006`.
- Android static bundle: `dist/android/_expo/static/js/android/entry-9d07eb46bb54ddccd380ba22e4eb88e8.hbc`.
- Bundle size: 4,783,003 bytes.
- SHA-256: `DADD53660D7AB1D643877736BDF0F0B68E3EC812EE2B7AE35196651061037D12`.
- Read the exact SDK 57 [Expo Linking documentation](https://docs.expo.dev/versions/v57.0.0/sdk/linking/) before using the native OS URL opener.

## Implemented behavior

- Guest search normalizes 1–10 digit CIK values to ten digits and normalizes ticker queries while preserving company-name text. The company and filing responses are validated against the vendored source contracts.
- Filing filters cover source form choices, filed/report-period bounds, amendment mode, and 50-row cursor pages. Date ranges are contract-validated before sending.
- Filing detail is opened on a separate safe CIK/accession route. The previous search screen remains on the stack with company, filters and page state intact. Detail validates identifiers again and opens only constructed `https://www.sec.gov/Archives/edgar/data/...` URLs after checking the returned basename.
- Filing and detail responses retain cache metadata and stale state. Provider/configuration/rate-limit errors have distinct translated messages; nullable report fields and filings without PDF remain explicit.
- Search and filing requests are abortable and sequence-fenced so late responses do not replace a newer company or filter result.

## Commands and results

- `npx vitest run tests/unit/sec-filings.test.ts tests/unit/continuation.test.ts tests/unit/public-tools.test.ts` — 8 passed. The SEC tests cover identifier normalization, safe original-document URLs, date bounds and provider error envelopes.
- `npx vitest run tests/integration/sec-filings-http.test.ts` in `diary-v3` — 2 passed using its controlled synthetic SEC provider and newly created/disposed PostgreSQL test database. Verified company search, form-filtered filings, detail, document boundary, bounded ZIP package, batch package, malformed date and unsafe document rejection.
- Live request `GET http://127.0.0.1:3101/api/tools/sec-filings/companies?q=SYN` — returned HTTP 500 `SYS_INTERNAL_ERROR`. This response is recorded as an unavailable-server observation, not as SEC provider acceptance; the source fixture integration is the success-path evidence.
- `npm run verify` — lint and typecheck passed; 243 tests passed and 12 gated API tests skipped; Android export passed.

## Still open

- Native search/filter/detail navigation, external browser handoff and TalkBack were not exercised in the AVD. The available development client is still waiting for Metro, and no physical Android device is available. The bundle is compile evidence only.
- The live API’s generic 500 response remains a server/environment issue outside this native-reader slice. SEC success, filter, detail and document paths were verified through the controlled source integration fixture.
