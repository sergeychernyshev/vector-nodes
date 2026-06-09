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

## Cutting a release

1. Bump versions (keep the four `@vector-nodes/*` packages in lockstep) and update the internal
   `^x.y.z` dependency ranges to match.
2. Merge the version bump to `main`.
3. Create a **GitHub Release** with a tag (e.g. `v0.1.0`). The Release workflow builds, tests,
   and publishes to npm with provenance.

> Coordinated versioning + changelogs via Changesets, the runtime semver pin in generated code,
> and the packed-tarball conformance test are **Phase 10** (release engineering). This phase
> (4.5) gets the packages onto npm so consumers and the editor's Cloudflare build can resolve
> them.
