# Agent guidelines — Vector Nodes

**Read this file at the start of every session in this project, and follow it.**

## Pull requests

- **Never merge a PR without the maintainer's explicit approval.** Open the PR, report it, and
  wait. Do not squash-merge, rebase-merge, or merge-commit on your own — not even when CI is
  green, and not even if a previous instruction said "merge as you go." Only merge when the
  maintainer explicitly says to merge that PR.
- Do not enable auto-merge on PRs.
- Work one step at a time using the per-step branches defined in [docs/phases/](docs/phases/):
  branch → implement → push → open PR → **stop and wait**.

## Branching

- Branch naming: `phase-<n>/step-<n.m>-<slug>` (e.g. `phase-0/step-0.1-root-tooling`).
- Branch off the latest `main`. Keep each PR scoped to a single step.

## Runtime & language baseline

- **Node.js 24+ is required**, everywhere — local dev, CI, and every package's `engines` field
  (`"node": ">=24"`). `.nvmrc` pins `24`.
- **Write for Node 24+.** Prefer modern, built-in platform APIs over legacy patterns and
  third-party shims:
  - Use native `fetch`, `structuredClone`, `AbortController`, `node:test`-era APIs, top-level
    `await`, and the Web Crypto / Streams globals instead of polyfills.
  - Use **ESM** (`import`/`export`) and `node:` import specifiers for built-ins
    (e.g. `import { readFile } from 'node:fs/promises'`) — no CommonJS `require`.
  - Avoid deprecated Node APIs (e.g. `fs.rmdir` recursive, `url.parse`, `new Buffer()`,
    `punycode`) and packages that only exist to backfill features now built into Node 24.
- Rationale: a high baseline keeps the codebase on current practices and minimizes deprecation
  churn. Do not add compatibility code for older Node versions.

## Commits

- End commit messages with the standard `Co-Authored-By` trailer for the agent.
