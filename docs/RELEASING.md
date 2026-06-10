# Releasing

The `@vector-nodes/*` library packages publish to npm from CI via **OIDC trusted publishing** —
no `NPM_TOKEN` secret is stored. The workflow is
[`.github/workflows/release.yml`](../.github/workflows/release.yml); it runs on a published
GitHub Release (or manual dispatch), builds, tests, and runs `npm publish --workspaces` (the
private `editor` is skipped).

Published packages: `@vector-nodes/core`, `@vector-nodes/runtime`, `@vector-nodes/engine`,
`@vector-nodes/codegen`.

## One-time setup

### 1. Configure the trusted publisher (per package, on npmjs.com)

For each package, go to **npmjs.com → the package → Settings → Trusted Publisher** and add a
**GitHub Actions** publisher:

- **Organization / user:** `sergeychernyshev`
- **Repository:** `vector-nodes`
- **Workflow filename:** `release.yml`
- **Environment:** _(leave blank)_

This lets the workflow mint a short-lived OIDC token to publish — no password or token needed.

### 2. First publish (bootstrap)

npm's trusted publishing can only be configured on a package that **already exists**, so the very
first publish of each brand-new package must be done once by hand by a maintainer with npm access:

```bash
npm login
npm publish --workspaces   # from the repo root; publishes 0.1.0 of all four
```

After that initial publish, complete step 1 for each package and all subsequent releases go
through CI.

## Versioning (Changesets)

Coordinated semver across the workspace is managed by **Changesets**
([`.changeset/config.json`](../.changeset/config.json)). The four `@vector-nodes/*` packages are a
**fixed** group (they version in lockstep), `access` is `public`, and the private `editor` is
ignored.

1. With each change, add a changeset describing it and the bump:
   ```bash
   npm run changeset
   ```
2. To apply pending changesets — bump versions, update internal `^x.y.z` ranges, and write
   changelogs:
   ```bash
   npm run version-packages
   ```
   Because the library packages are fixed-grouped, codegen's `RUNTIME_RANGE` (the runtime pin in
   generated modules) stays compatible automatically.

## Cutting a release

1. Run `npm run version-packages`, review the changelogs/version bumps, and merge to `main`.
2. Create a **GitHub Release** with a matching tag (e.g. `v0.1.2`). The
   [Release workflow](../.github/workflows/release.yml) builds, tests, and publishes to npm via
   OIDC trusted publishing (provenance automatic).

CI runs `npm run pack:check` (`npm pack --dry-run` for the public packages — local, no registry) on
every PR to catch packaging regressions early, and the codegen **packed-tarball conformance test**
verifies a generated module runs against the actual npm-packed runtime.
