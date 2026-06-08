# Implementation phases — step-by-step

Each phase from [../IMPLEMENTATION_PLAN.md](../IMPLEMENTATION_PLAN.md) is broken here into
**PR-sized steps**. Every step is one branch → one pull request, with a defined scope, the
packages it touches, and acceptance criteria.

Branch naming: `phase-<n>/step-<n.m>-<slug>` (e.g. `phase-0/step-0.1-root-tooling`).

| Phase | File                                                               | Theme                               |
| ----- | ------------------------------------------------------------------ | ----------------------------------- |
| 0     | [phase-00-scaffold.md](phase-00-scaffold.md)                       | Monorepo, tooling, CI               |
| 1     | [phase-01-core-model.md](phase-01-core-model.md)                   | Types, graph model, `.vnodes`       |
| 2     | [phase-02-runtime-interpreter.md](phase-02-runtime-interpreter.md) | Runtime + interpreter, basic nodes  |
| 3     | [phase-03-editor-mvp.md](phase-03-editor-mvp.md)                   | React Flow editor                   |
| 4     | [phase-04-preview.md](phase-04-preview.md)                         | SVG (2D) + Three.js (3D)            |
| 5     | [phase-05-meta-nodes.md](phase-05-meta-nodes.md)                   | Group / window-edit / inline        |
| 6     | [phase-06-codegen.md](phase-06-codegen.md)                         | TS/JS codegen + wrappers            |
| 7     | [phase-07-expanded-nodes.md](phase-07-expanded-nodes.md)           | Transforms, curves, fields, utility |
| 8     | [phase-08-mesh.md](phase-08-mesh.md)                               | Mesh geometry                       |
| 9     | [phase-09-polish-docs.md](phase-09-polish-docs.md)                 | Examples, conformance, docs         |
| 10    | [phase-10-publishing.md](phase-10-publishing.md)                   | npm publishing & release            |

Status is tracked by checking off steps in each file as their PRs merge.
