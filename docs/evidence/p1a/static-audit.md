# P1A pre-implementation static audit

App baseline: `e68c04127c20ef3483308bcde9d6545213571442` (`feat: implement Android native auth P0`). The initial working tree had only an unrelated untracked `.idea/` directory; it was left alone.

Read before implementation: [Expo SDK 57 reference](https://docs.expo.dev/versions/v57.0.0/) and [SDK 57 Router reference](https://docs.expo.dev/versions/v57.0.0/sdk/router/). SDK 57 uses React Native 0.86; Router imports remain from `expo-router`, without direct React Navigation dependencies.

## Findings

- `src/auth/runtime.ts` constructs one native session and one generated API client. The minimum extension is to return that existing client; neither read screen should construct a session or manage credentials.
- `AuthProvider` owns the lifecycle, SecureStore adapter, bootstrap and AppState verification. The lifecycle already provides synchronous owner transitions and guards late auth operations. Private read capabilities can subscribe to it, invalidate immediately on logout, and remain available during recoverable verification errors with a previously verified owner.
- The private route contained only the P0 account proof screen. Timeline and Account can become a two-tab navigator under the existing private Stack, with detail pushed above the tabs. No native dependency is needed.
- The pinned `@diary/contracts/diary-summary` exports `diarySummaryListResponseSchema` and `DiarySummary`. Its strict payload is `{ data, pagination: { page, limit, total, totalPages } }`; summary items exclude content and private review text. The generated client includes `GET /api/diaries/summary` with `date-desc`, page and limit.
- `diaryResponseSchema` / `DiaryResponse` describe the direct detail response (not a `data` envelope). The generated detail path takes a string ID. Detail includes `userId`, allowing an additional owner check before display.
- Civil diary dates are strings; timestamps such as `createdAt` and `reviewDueAt` are UTC instants. Displaying the civil date verbatim avoids any timezone conversion.
- Native transport enforces same-origin, bearer auth, `credentials: omit`, paired persistence and refresh coalescing. Ordinary read transport failures do not invoke session clearing. The pinned transport's existing terminal refresh-failure policy is unchanged; this phase does not introduce a new auth protocol.
- Existing auth colors used a dark green action color. Product structural/navigation colors will use neutral grays.
- P0 evidence and 23 existing tests must be retained. Add deterministic store/transport tests, real API fixtures and observed VM evidence.

## Boundary chosen

`AuthProvider` builds the existing auth runtime once and attaches an owner-scoped diary read service to its client. Each scope captures an owner epoch and checks it before requests, after responses and before reporting failures to auth. React observes scope changes through `useSyncExternalStore`; reading a mutable getter during render alone is unsafe with React Compiler memoization.

Screen-local external stores own pagination/detail state. Request generations discard superseded refresh/page/detail responses; logout invalidates the entire owner scope synchronously. No persistent diary cache, token copy, Redux, React Query, Markdown WebView or additional native module is introduced.

## Shared baseline

Vendored source remains `7e3a39ad5c4900f88d9d8193b7077610d48f9418`, OpenAPI SHA-256 `677a8123be01ef09256cf9b42bfd4b3717a965f2d76bf911e7d4344517917df0`. The manifest's `sourceDirty: true` provenance remains unchanged.

The available local API checkout is `2764b815d4d6dd87ee8b6704e59cb461dd798d81`. `git diff 7e3a39a HEAD` contains only the two packaging portability scripts, with no API/product/contract source differences. Tests use that existing checkout and a newly provisioned disposable PostgreSQL database. P1A makes no upstream edits or artifact updates.
