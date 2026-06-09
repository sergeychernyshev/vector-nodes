# Phase 4.5 — npm package publishing

**Goal:** publish the `@vector-nodes/*` packages to npm so they resolve for consumers and CI
(e.g. the editor's Cloudflare deploy) instead of relying only on the local workspace.

**Done when:** `@vector-nodes/runtime`, `core`, `engine`, and `codegen` are published, and a clean
`npm install` of them in an empty project resolves and imports successfully.

> Moved up from Phase 10 so the packages are consumable early. The full release engineering
> (changesets, provenance release CI, codegen runtime-pin + tarball conformance) stays in
> [Phase 10](phase-10-publishing.md).

---

## Step 4.5.1 — Publishable package metadata

- [x] **Scope:** finalize `name`, `version`, `exports`, `types`, `files` allowlist,
      `repository`/`license`, and `publishConfig.access: public` for each `@vector-nodes/*`
      package; ensure ESM + `.d.ts` build output ships; `editor` stays private.
- **Acceptance:** `npm pack` for each package contains only the intended files with correct
  `exports`/`types`.
- **Branch:** `phase-4.5/step-4.5.1-package-metadata`

## Step 4.5.2 — Release CI (npm trusted publishing)

- [x] **Scope:** GitHub Actions release workflow that publishes `@vector-nodes/runtime`, `core`,
      `engine`, and `codegen` via **OIDC trusted publishing** (no `NPM_TOKEN`), with automatic
      provenance, on a published GitHub Release. Setup + first-publish bootstrap documented in
      [../RELEASING.md](../RELEASING.md).
- **Acceptance:** cutting a release publishes the packages; a fresh project can
  `npm install @vector-nodes/runtime` (and the others) and import them; the editor's Cloudflare
  build no longer fails on unresolved workspace packages.
- **Branch:** `phase-4.5/step-4.5.2-release-ci`
- **Operational (maintainer):** configure the trusted publisher per package on npmjs.com and do
  the one-time first publish (see RELEASING.md).
