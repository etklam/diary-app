# Shared packages

The app consumes tarballs from `vendor/shared-packages`; standalone `npm ci`, typechecking, and bundling do not depend on a sibling diary-v3 checkout or a public registry entry for internal packages.

Source baseline: diary-v3 commit `7e3a39ad5c4900f88d9d8193b7077610d48f9418`.

OpenAPI SHA-256: `677a8123be01ef09256cf9b42bfd4b3717a965f2d76bf911e7d4344517917df0`.

| Package | Artifact | SHA-256 |
| --- | --- | --- |
| `@diary/contracts` | `diary-contracts-0.0.0-dev.g7e3a39ad5c49.c5dac3e3a66e9.tgz` | `b04957410eaa814936b275188f4bb920ae241b8d8665f0981d06e83c51436b82` |
| `@diary/api-client` | `diary-api-client-0.0.0-dev.g7e3a39ad5c49.c79912c20cec7.tgz` | `d6f374ada725ef8fd276ca705ade9f4db2323b6b1556409172f0640ac567c4d6` |
| `@diary/domain` | `diary-domain-0.0.0-dev.g7e3a39ad5c49.c7c695de05093.tgz` | `bfc579d1ccc3efb4bcdc93dbae70514078c566d3153168f9c04fa31256e0ebe0` |

The manifest records `sourceDirty: true`: the exact source commit had only two uncommitted Windows portability fixes in the native pack and verification scripts when these artifacts were generated. No product package source was changed. The manifest and each `PROVENANCE.json` contain source tree, packer, artifact input, OpenAPI, and build hashes. Upstream declares no license metadata or license files; this repository does not invent one.

To update artifacts in diary-v3:

```powershell
npm ci
npm run native:packages:pack
npm run native:packages:test -- --packages-dir dist/native-packages
```

Read the manifest for exact filenames, copy the complete output into `vendor/shared-packages`, update the `file:` dependencies, update the lockfile, then run `npm ci` and app verification from a standalone checkout.
