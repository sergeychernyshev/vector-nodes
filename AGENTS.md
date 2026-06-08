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

## Commits

- End commit messages with the standard `Co-Authored-By` trailer for the agent.
