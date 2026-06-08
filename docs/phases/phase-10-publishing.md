# Phase 10 — npm publishing & release

**Goal:** ship the packages to npm so generated modules resolve for end users.

**Done when:** `@vector-nodes/runtime` (and the library packages) are published, and a generated
module installed from the registry into a clean project runs and matches interpreter output.

---

## Step 10.1 — Package metadata

- [ ] **Scope:** finalize `name`, `version`, `exports`, `types`, `files` allowlist,
      `repository`/`license`, `publishConfig.access: public` for `@vector-nodes/*`; ESM + `.d.ts`
      build output; `editor` stays private.
- **Branch:** `phase-10/step-10.1-package-metadata`

## Step 10.2 — Codegen pins runtime + tarball test

- [ ] **Scope:** generated output declares `@vector-nodes/runtime` at a compatible semver range
      (matching codegen version); conformance test consumes an `npm pack`ed tarball in a temp project.
- **Branch:** `phase-10/step-10.2-pin-runtime`

## Step 10.3 — Changesets

- [ ] **Scope:** set up Changesets for coordinated semver across the workspace.
- **Branch:** `phase-10/step-10.3-changesets`

## Step 10.4 — Release CI

- [ ] **Scope:** GitHub Actions release workflow: publish on release tag with `--provenance`
      using `NPM_TOKEN`; `npm publish --dry-run` / `npm pack` on PRs.
- **Branch:** `phase-10/step-10.4-release-ci`
