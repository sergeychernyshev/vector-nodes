# Phase 10 — npm publishing & release

**Goal:** ship the packages to npm so generated modules resolve for end users.

**Done when:** `@vector-nodes/runtime` (and the library packages) are published, and a generated
module installed from the registry into a clean project runs and matches interpreter output.

---

## Step 10.1 — Package metadata

- [x] **Scope:** publishable metadata for `@vector-nodes/*` (`exports`, `types`, `files`,
      `publishConfig.access: public`, ESM + `.d.ts`); `editor` private. _Delivered early in
      Phase 4.5 (PR #28)._
- **Branch:** `phase-10/step-10.1-package-metadata`

## Step 10.2 — Codegen pins runtime + tarball test

- [x] **Scope:** generated modules pin `@vector-nodes/runtime` at `RUNTIME_RANGE` (`generate`
      returns `runtimeDependency`; `generatedPackageJson` emits a `package.json`). The
      packed-tarball conformance test packs the runtime, installs it in a temp project, and runs a
      generated module against it — matching the interpreter.
- **Branch:** `phase-10/step-10.2-pin-runtime`

## Step 10.3 — Changesets

- [x] **Scope:** Changesets configured (`.changeset/config.json`) — the four `@vector-nodes/*`
      packages are a **fixed** lockstep group, `access: public`, `editor` ignored; root
      `changeset` / `version-packages` scripts.
- **Branch:** `phase-10/step-10.3-changesets`

## Step 10.4 — Release CI

- [x] **Scope:** release workflow publishes on a GitHub Release via **OIDC trusted publishing**
      (provenance automatic) — delivered in Phase 4.5 (PR #29); this phase adds the
      `npm publish --dry-run` (`pack:check`) gate to CI on every PR.
- **Branch:** `phase-10/step-10.4-release-ci`
