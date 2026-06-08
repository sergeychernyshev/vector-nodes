# Vector Nodes — Implementation Plan

This is the phased build plan for Vector Nodes. The **active scope is TypeScript/JavaScript
only**; Rust + WASM is documented as a future target (last section) with its own plan.

See [../README.md](../README.md) for the full requirements and design.

## Guiding principles

- **One declarative node definition** per node type (sockets, params, types, default values) is
  the single source of truth consumed by the editor, validator, interpreter, and codegen. A node
  cannot drift between how it looks, runs, and compiles.
- **One shared runtime** package, `@vector-nodes/runtime`: the interpreter calls it _and_
  generated code imports from it, so interpreted preview == compiled output for free.
- **3D is the native model**; 2D is the same model projected to the X–Y plane (drop Z).
- Ship each phase behind tests; later phases depend on earlier ones being solid.

## Monorepo layout (target)

```
packages/
  core/        # Types, graph model, .vnodes schema + validation, meta-node logic
  runtime/     # @vector-nodes/runtime — geometry + math ops
  engine/      # Pull-based memoizing DAG interpreter
  codegen/     # Graph → TS/JS source generator + worker wrappers
  editor/      # React + React Flow UI, SVG + Three.js preview
docs/
  IMPLEMENTATION_PLAN.md
  vnodes.schema.json
```

Tooling: **npm** workspaces (npm 7+), **TypeScript** (strict), **Vitest**, ESLint + Prettier,
and **Vite** for the editor. CI runs typecheck + lint + tests on every package.

---

## Phase 0 — Scaffold

**Goal:** an installable, CI-green monorepo skeleton.

- npm workspaces (root `package.json` `workspaces` field) + root `tsconfig`, ESLint/Prettier,
  Vitest config.
- Empty packages (`core`, `runtime`, `engine`, `codegen`, `editor`) with `package.json` + entry
  files and TypeScript project references. Scope library packages under `@vector-nodes/*` and
  stub publishing metadata now (`exports`, `types`, `files`, `publishConfig.access`); `editor`
  is `"private": true`. Full publishing is Phase 10.
- GitHub Actions: install → typecheck → lint → test.
- `docs/vnodes.schema.json` skeleton committed.

**Done when:** `npm install && npm run build --workspaces && npm test --workspaces` passes on a
clean checkout and in CI.

---

## Phase 1 — Core model & types (`packages/core`)

**Goal:** the data model and the `.vnodes` format.

- **Socket types**: `Float`, `Integer`, `Boolean`, `Vector`, `Color`, `String`, `Geometry`,
  `Matrix`, plus the **field/array** flag on any socket.
- **Blender color map** for each type (canonical hex values from the README) as exported data.
- **Node definition** interface: id/type, input sockets, output sockets, params (typed, with
  defaults/ranges), and metadata (label, category, color).
- **Graph model**: nodes, links, parameters, embedded meta-node definitions; a single `Output`.
- **`.vnodes` (de)serializer** + **JSON-Schema validation** against `docs/vnodes.schema.json`.
- **Static validation**: type-compatibility on links (incl. allowed implicit conversions),
  cycle detection, single-output rule, dangling-link checks.

**Done when:** a hand-written `.vnodes` file round-trips losslessly and validation catches type
mismatches, cycles, and missing outputs with clear errors.

---

## Phase 2 — Runtime + interpreter (`packages/runtime`, `packages/engine`)

**Goal:** evaluate a graph and produce geometry.

- **`@vector-nodes/runtime`**: pure functions for the basic ops — vector math (add, sub, scale,
  dot, cross, normalize, length, distance), point/array construction, projection, translation,
  bezier sampling — plus the **geometry interchange types** (points, vectors, curves, meshes as
  plain arrays).
- **Interpreter** (`engine`): pull-based evaluation from `Output`, topological order,
  **memoized** by hash of inputs+params, dirty-subtree recompute on edits.
- **Basic node set** wired to runtime ops (the spec's required nodes):
  Point, Vector, Combine/Separate XYZ, Vector Math, Point Array, Vector Array, Project,
  Translate, Bezier Curve, plus Float/Integer/Boolean/Vector/Color/String constants,
  Parameter (any type, including one or more `Geometry` inputs), Output Geometry.

**Done when:** the example networks evaluate to correct geometry, and editing a param recomputes
only the affected subtree.

---

## Phase 3 — Editor MVP (`packages/editor`)

**Goal:** build and edit networks visually.

- **React + React Flow** canvas: pan/zoom, drag nodes, draw links, edit params inline.
- **Blender-colored sockets**; field sockets get a distinct ring/badge.
- **Type-checked linking**: reject invalid connections with a reason; honor implicit conversions.
- **Save / Open** `.vnodes` (uses `core` (de)serializer + validation).
- Node palette/search backed by the declarative node definitions from `core`.

**Done when:** a user can build a Phase-2 network from scratch, save it, reopen it, and get an
identical graph; invalid links are blocked.

---

## Phase 4 — Preview (`packages/editor`)

**Goal:** live 2D/3D visualization.

- **Three.js** renderer (3D): orbit camera, grid, lighting; renders points, curves, meshes from
  the interchange format.
- **SVG** renderer (2D): **projects to the X–Y plane, dropping Z**.
- **2D ⇄ 3D toggle** that only swaps renderer/projection — the network stays 3D.
- Preview is driven by the interpreter, updating on graph/param edits.

**Done when:** the same network renders correctly in both modes and the toggle is instant.

---

## Phase 5 — Meta-nodes (`packages/core`, `packages/editor`)

**Goal:** functions as reusable single nodes.

- **Collapse** a selection into a meta-node: boundary sockets become the meta-node interface.
- Two editing paths on the **shared meta-node definition**:
  - **Open in a separate window** ("dive in") — edit the subgraph as its own graph in a
    dedicated editor window/tab **without ungrouping**; changes propagate to every instance.
  - **Expand / ungroup** — splice the subgraph back into the parent graph.
- **Reusable library** of meta-node definitions; edits in the separate window update all uses.
- Interpreter evaluates meta-nodes by inlining their subgraph.
- Editor renders a meta-node as one node with its interface sockets; **double-click opens its
  subgraph window**, with a separate ungroup action for inline expansion.

**Done when:** a network using a meta-node evaluates identically to the same network with the
meta-node expanded inline.

---

## Phase 6 — TS/JS codegen (`packages/codegen`)

**Goal:** compile a graph to a standalone TS/JS module.

- **Code generator** topologically walks the graph and emits **straight-line code** that imports
  the helpers it uses from `@vector-nodes/runtime`, wiring outputs→inputs via local variables.
- **Meta-nodes are inlined**.
- **Root network → a default-export, named function**: name sanitized from network metadata;
  arguments derived from the network's `Parameter` nodes (any type, incl. multiple `Geometry`
  inputs), in declared order, in **idiomatic TS types**
  (Float/Integer→`number`, Boolean→`boolean`, Vector→`[number,number,number]`,
  Color→`[number,number,number,number]`, String→`string`, Geometry→`Geometry`); optional params
  default from their node; output geometry is the return value.
  e.g. `export default function circle(radius: number): Geometry`.
- **JS target**: same generator, emit ES module without type annotations.
- **Two wrappers**: synchronous main-thread (the function directly) and an **async Web Worker**
  wrapper (Comlink-style RPC) with the same name/arguments.

**Done when:** a generated module imports cleanly, its default export runs in Node and the
browser, and **its output equals the interpreter's** for the example networks (conformance test).

---

## Phase 7 — Expanded node library (points, vectors, curves, utility)

**Goal:** cover non-mesh modeling needs (across `runtime`, `core` definitions, both renderers,
codegen). Meshes are intentionally deferred to Phase 8.

- Transforms: Rotate, Scale, Transform (Matrix).
- Curves: Polyline, Line, Arc/Circle, Sample/Resample Curve, Curve Length.
- Instancing & fields: Instance on Points, Distribute Points **on a curve**,
  Capture/Store/Named Attribute.
- General geometry: Merge/Join, Separate, Bounding Box.
- Utility: Math, Map Range, Clamp, Mix/Lerp, Compare, Switch, Index, Count, Random (seeded).

Each node added in **one place** (definition + runtime op) flows to editor, interpreter, and
codegen automatically.

**Done when:** each new node has a runtime op, renders in preview, and passes an
interpreter-vs-compiled conformance test.

---

## Phase 8 — Mesh geometry

**Goal:** full mesh modeling, built on the operations and infrastructure from Phases 2–7.

- Mesh primitives: plane, cube, grid, UV sphere, cylinder, cone.
- Mesh ops: Extrude, Fill/Triangulate, Subdivide, Normals.
- Distribute Points **on a surface** (extends Phase 7 instancing to meshes).
- Convex Hull.
- Boolean (union / difference / intersect) — stretch goal within this phase.

The Three.js preview already renders meshes (Phase 4); this phase adds the nodes that
_generate_ them.

**Done when:** each mesh node has a runtime op, renders correctly in the 3D preview, and passes
an interpreter-vs-compiled conformance test.

---

## Phase 9 — Polish & docs

**Goal:** production-ready.

- A suite of **example networks** (spiral, parametric mesh, instanced array, beveled curve…).
- **Conformance tests**: interpreter output == compiled output for every example.
- User docs: editor tutorial, node reference, `.vnodes` format spec, export guide.
- Performance pass on the interpreter cache and Three.js preview.

**Done when:** examples ship, all conformance tests pass, and docs cover authoring → preview →
export.

---

## Phase 10 — npm publishing & release

**Goal:** ship the packages to the npm registry so generated modules resolve for end users.

- **Published packages** under the `@vector-nodes` scope:
  - `@vector-nodes/runtime` — **required**: generated TS/JS imports from it, so consumers must be
    able to `npm install` it. Highest priority to publish.
  - `@vector-nodes/core`, `@vector-nodes/engine`, `@vector-nodes/codegen` — for programmatic use
    (build/validate/evaluate/compile networks from code).
  - `editor` stays **private** (`"private": true`) — it ships as a deployed web app, not a package.
- **Package metadata** (set up in Phase 0, completed here): correct `name`, `version`, `exports`
  - `types`, a `files` allowlist, `repository`/`license`, and `"publishConfig": { "access":
"public" }` for the scoped packages. Each ships **ESM + `.d.ts`**.
- **Codegen wires the dependency**: generated output declares `@vector-nodes/runtime` at a
  compatible **semver range** (matching the codegen version), so a generated module installs and
  runs in a fresh project. A conformance test consumes a published (or `npm pack`ed) tarball.
- **Versioning**: semver across the workspace via **Changesets**; `@vector-nodes/runtime` changes
  are versioned carefully because generated code depends on them.
- **Release CI**: a GitHub Actions workflow publishes on a release tag with **npm provenance**
  (`--provenance`) using an `NPM_TOKEN` secret; dry-run (`npm publish --dry-run` / `npm pack`) on PRs.

**Done when:** `@vector-nodes/runtime` (and the library packages) are published, and a generated
module installed from the registry into a clean project runs and matches interpreter output.

---

## Future (separate plan, out of scope here) — Rust + WASM

Documented as a design target; not scheduled in the phases above. When undertaken:

- `crates/runtime-rs`: a Rust implementation of `@vector-nodes/runtime`'s ops.
- **Rust codegen backend**: emit a `.rs` crate whose root network is a public function calling
  `vector-nodes-runtime` (analogous to the TS default export).
- **WASM**: compile the Rust output to `wasm32` via wasm-bindgen + JS glue + a worker wrapper.
- **Conformance**: Rust/WASM output tested against the **TS reference** so results match across
  languages.
- Adding any further language follows the same recipe: a runtime implementation + a codegen
  backend; the graph model and `.vnodes` format are unchanged.
