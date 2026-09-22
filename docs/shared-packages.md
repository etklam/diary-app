# Shared packages

The standalone app installs portable tarballs from `vendor/shared-packages`. A sibling repository is required only to repack or run authoritative service acceptance, not to install/typecheck/export this app.

F0 source: `ce2962f597ef56dc4e4cb8966c1ca1860369e006`. OpenAPI SHA-256: `677a8123be01ef09256cf9b42bfd4b3717a965f2d76bf911e7d4344517917df0` (unchanged).

| Package | Version | Tarball SHA-256 |
| --- | --- | --- |
| `@diary/contracts` | `0.0.0-dev.gce2962f597ef.c4432072b759f` | `740c98b4c58ff3b635c24620fbe7cdde66e8269bb90b78c817661055a531bba7` |
| `@diary/api-client` | `0.0.0-dev.gce2962f597ef.c1fa41733b80a` | `7ca9f10e7803ec4866ebbf0ec66428fd951ba6b61feaa00d31c3209f230abbb5` |
| `@diary/domain` | `0.0.0-dev.gce2962f597ef.cd45dfbb5046d` | `4ee48bcc7c8adf5bcaa90e438e59f783606640fae7b6ba53159c6949e01d6e70` |

The manifest records `sourceDirty: true`: existing changes in `tests/unit/native-package-scripts.test.ts` and `tests/unit/pwa.test.ts` were preserved. Product package source was not edited in this task. Every package records source tree, packer, artifact input and build hashes. Two fresh pack runs produced identical manifests/artifact hashes. Upstream declares no license metadata; this app invents none.

## Reviewed differences

- Contracts and API client source trees and generated OpenAPI are unchanged from `7e3a39ad5c49`. Version/provenance identifiers change with the selected commit. Native session and mutation retry behavior are unchanged.
- Domain adds `us-equity-calendar` at the root and a subpath, with curated market closures and explicit supported years. Rotation monitor changes its calendar handling. The relevant source calendar/monitor and native boundary tests passed.
- FIRE is already exported through the domain root; there is no missing FIRE export to invent. Pure chart-series, FIRE and authoring computations are available without Web runtime.
- Exact local date/time editing helpers remain in `apps/web/app/trade-time.ts`, outside the portable package. Tickets 08/13/17 must extract or adapt these with the source repeated-hour/seconds fixtures before transaction/review scheduling UI. Native code must not import that Web path. No current Quick date-only flow needs this helper.

## Previous-client gate

The previous manifest is retained under `previous/manifest.json`; its three tarballs remain in `artifacts/`. `tests/compatibility/package.json` and its lockfile install that exact client/contracts/domain set independently. The F0 compatibility script exercises both clients against the selected API: session restore, Diary create/append/detail, Review, USER admin denial and logout. Additional synthetic ADMIN/Partner/provider fixtures verify the harness.

`npm run shared:check` verifies actual tarball hashes, installed provenance, additive exports and the unchanged OpenAPI baseline. An API schema change fails this gate until deliberately reviewed; it is not silently accepted because generated types compile. Future endpoint evolution must be additive or explicitly negotiated/versioned, with the prior client re-run. See [write protocol](offline-write-contract.md).

## Reproduce

From diary-app, with diary-v3 dependencies installed:

```powershell
npm --prefix ../diary-v3 run native:packages:pack -- --out-dir C:/Users/cas/Desktop/project/diary-app/.scratch/f0-packages
npm --prefix ../diary-v3 run native:packages:test -- --packages-dir C:/Users/cas/Desktop/project/diary-app/.scratch/f0-packages
npm ci
npm run shared:check
npm --prefix tests/compatibility ci --ignore-scripts
```

Adjust absolute output paths for another checkout. The upstream packer replaces its output directory, so use a dedicated generated directory. Copy the complete artifact set and manifest, normalize `file:` paths to forward slashes, update the root lockfile, then run clean install and app verification. Never overwrite the previous-client fixture as part of an ordinary update.

[F0 acceptance](evidence/f0/acceptance.md) records current evidence and limits. Historical P1B used the previous artifacts unchanged for `calendarDateInTimezone` and `deriveQuickTitle`.
