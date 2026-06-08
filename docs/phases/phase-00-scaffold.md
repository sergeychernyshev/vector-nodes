# Phase 0 — Scaffold

**Goal:** an installable, CI-green npm-workspaces monorepo skeleton.

**Done when:** `npm install && npm run build --workspaces && npm test --workspaces` passes on a
clean checkout and in CI.

---

## Step 0.1 — Root tooling

- [ ] **Scope:** Root `package.json` with `workspaces`, root `tsconfig.base.json`, `.nvmrc`,
      `.editorconfig`, Prettier, ESLint (flat config, TS), Vitest config, npm scripts
      (`build`, `lint`, `typecheck`, `test`).
- **Touches:** repo root.
- **Acceptance:** `npm install` succeeds; `npm run lint` and `npm test` run (no packages yet).
- **Branch:** `phase-0/step-0.1-root-tooling`

## Step 0.2 — Workspace packages

- [x] **Scope:** Create empty packages `@vector-nodes/core`, `@vector-nodes/runtime`,
      `@vector-nodes/engine`, `@vector-nodes/codegen`, and private `editor`. Each gets
      `package.json` (with `"engines": { "node": ">=24" }`, and stub `exports`, `types`, `files`,
      `publishConfig.access: public` for the scoped ones), `tsconfig.json` with project references,
      and an `src/index.ts` stub + one trivial passing test.
- **Touches:** `packages/*`.
- **Acceptance:** `npm run build --workspaces` and `npm test --workspaces` pass; references resolve.
- **Branch:** `phase-0/step-0.2-workspace-packages`

## Step 0.3 — CI

- [x] **Scope:** GitHub Actions workflow: matrix on Node 24+ (e.g. `24`, `latest`), `npm ci` →
      typecheck → lint → test.
- **Touches:** `.github/workflows/ci.yml`.
- **Acceptance:** CI green on the PR.
- **Branch:** `phase-0/step-0.3-ci`
