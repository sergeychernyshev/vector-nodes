# Vector Nodes

A node-based procedural geometry generator for **2D and 3D**. Design geometry-generating
programs as visual node networks, save them as portable JSON, preview them live in SVG or
Three.js, and **compile** them into standalone modules in TypeScript, JavaScript, WASM, or
Rust that you can call from your own code.

> Think Blender Geometry Nodes / Houdini SOPs / Grasshopper — but vendor-neutral, file-based,
> and compilable to the language of your choice.

---

## Table of contents

- [What it does](#what-it-does)
- [Core concepts](#core-concepts)
- [The type system & Blender color-coding](#the-type-system--blender-color-coding)
- [Node library](#node-library)
- [Meta-nodes (functions)](#meta-nodes-functions)
- [The `.vnodes` JSON format](#the-vnodes-json-format)
- [The evaluation engine](#the-evaluation-engine)
- [Compilation targets](#compilation-targets)
- [Calling a compiled module](#calling-a-compiled-module)
- [Threading: main thread vs. worker](#threading-main-thread-vs-worker)
- [The editor & preview](#the-editor--preview)
- [Architecture overview](#architecture-overview)
- [Implementation plan](#implementation-plan)

---

## What it does

1. **Model** geometry generators as directed acyclic graphs (DAGs) of typed nodes.
2. **Edit** them in a visual editor with a live 2D/3D preview.
3. **Save / open** networks as a documented, versioned JSON format (`.vnodes`).
4. **Evaluate** them directly (interpreter) for instant feedback.
5. **Compile** them into a module in **TypeScript / JavaScript** (with Rust / WASM planned as a
   future target — see below) whose **root network becomes a default-export, named function**.
   The function is named after the network and takes the network's parameters as typed
   arguments:

   ```ts
   import circle from './circle.generated';

   const geo = circle(5); // export default function circle(radius: number): Geometry
   ```

6. **Reuse** sub-networks as **meta-nodes** (functions) that appear as a single node and can be
   expanded inline when needed.

> **Current scope:** the active implementation targets **TypeScript/JavaScript only**. Rust and
> WASM are a documented future target the architecture supports, but are out of scope for the
> initial build — see [Compilation targets](#compilation-targets).

### Design goals

| Goal                               | How it's met                                                                                           |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Skills transfer from Blender       | Socket types use Blender's color palette and conventions                                               |
| Portable & inspectable             | Plain JSON definition format with a published JSON Schema                                              |
| Idiomatic, dependency-light output | Generated code imports a small shared **runtime library** and is emitted by a graph **code generator** |
| Runs anywhere                      | Main-thread and Web Worker wrappers for TS/JS                                                          |
| 2D and 3D from one model           | 3D is the native model; 2D is the 3D model projected to the X–Y plane (drop Z)                         |

---

## Core concepts

- **Node** — a pure function with typed **input sockets**, typed **output sockets**, and static
  **parameters** (constants baked into the node, editable in the UI).
- **Socket** — a typed connection point. A socket's **type** determines its color and which other
  sockets it may connect to.
- **Link (edge)** — connects one output socket to one input socket. Type-checked.
- **Field vs. single value** — a socket carries either a single value or an **array/field** of
  values (e.g. one point vs. an array of points). This is the spec's "points / arrays of points"
  distinction, generalized to every type.
- **Graph** — the whole network: nodes + links + an **Output** node that produces the result.
- **Meta-node** — a graph packaged as a reusable node with a defined input/output interface.

Evaluation is a **pull** from the Output node: the engine walks the dependency graph backwards,
evaluates each node once, and caches results.

---

## The type system & Blender color-coding

Sockets are color-coded using **Blender's node socket palette** so that anyone who has used
Blender's Geometry/Shader nodes can read a network at a glance. Colors are theme values and can
be customized, but ship with these Blender-matching defaults:

| Type       | Meaning                            | Blender color | Hex       |
| ---------- | ---------------------------------- | ------------- | --------- |
| `Float`    | Scalar real number                 | Gray          | `#A1A1A1` |
| `Integer`  | Whole number                       | Green         | `#108526` |
| `Boolean`  | true / false                       | Lavender      | `#CCA6D6` |
| `Vector`   | 2D/3D vector or position (x, y, z) | Blue          | `#6363C7` |
| `Color`    | RGBA                               | Yellow        | `#C7C729` |
| `String`   | Text (labels, attribute names)     | Light blue    | `#70B3FF` |
| `Geometry` | Points / curves / meshes bundle    | Teal          | `#00D6A3` |
| `Matrix`   | 4×4 transform                      | Orange        | `#ED9E5C` |

Conventions carried over from Blender:

- **A single internal `Vector` type** represents both points and directions; 2D is simply a
  `Vector` with `z = 0`. There is no separate `Point` type — a _point_ is a `Vector` used as a
  position, exactly like Blender.
- **Fields**: any socket can carry an array (a "field" in Blender terms). Array sockets are drawn
  with a distinct ring/badge so single-value vs. array is obvious.
- **Implicit conversions** are limited to lossless, shape-preserving numeric widening
  (`Boolean → Integer → Float`). Everything else requires an explicit conversion node — including
  the scalar→`Vector`/`Color` broadcasts (use a `Vector` or `Combine Color` node), since reshaping
  a scalar into a tuple isn't applied at evaluation time.

---

## Node library

### Inputs & primitives

- **Float / Integer / Boolean / Vector / Color / String** constant nodes
- **Parameter** — a named, typed external input that becomes one argument of the generated
  function. A parameter can be **any** socket type, including `Geometry` — input geometry is not
  special, it's just a `Geometry`-typed parameter. A network may declare **multiple** named
  parameters of any types (several `Geometry` inputs, several scalars, etc.).
- **Time** — animation clock emitting `seconds`, `milliseconds`, and an fps-scaled `frame` index.
  Driven by the engine's `time` parameter; a network that uses it gains a leading `time: number`
  argument in the compiled function, which the caller advances each frame. In the editor, a global
  play/pause transport (also on each Time node) drives the live preview in real time; all Time
  nodes share one clock that ticks at the least-common-multiple of their `fps`, so every node's
  frame boundary lands on a tick.

### Points & vectors (the spec's basics)

- **Point** — construct a position from x, y, z (z optional / 0 in 2D)
- **Vector** — construct/decompose a vector from components
- **Combine / Separate XYZ**
- **Vector Math** — add, subtract, scale, dot, cross, normalize, length, distance, reflect
- **Point Grid / Point Line / Point Circle / Point Random** — generate an array of points; one
  node per pattern
- **Vector Array** — array of vectors / per-point attributes

### Transforms

- **Translate** — move points/geometry by a vector
- **Rotate** — by axis-angle or Euler
- **Scale**
- **Transform (Matrix)** — apply a 4×4 matrix
- **Project** — orthographic / perspective projection onto a plane (the engine of 3D→2D)

### Curves

- **Bezier Curve** — defined through control **points** and tangent **vectors** (per the spec)
- **Polyline**, **Line**, **Arc / Circle**
- **Sample Curve** — position/tangent/normal at parameter `t`
- **Resample Curve** — to N points / by length
- **Curve Length**

### Geometry (suggested additions)

- **Mesh primitives** — plane, cube, grid, UV sphere, cylinder, cone
- **Extrude**, **Fill / Triangulate**, **Subdivide**
- **Boolean** (union / difference / intersect) — stretch goal
- **Convex Hull**, **Bounding Box**, **Normals**
- **Merge / Join Geometry**, **Separate**

### Instancing & fields

- **Instance on Points** — place geometry at each point of an array
- **Distribute Points** — on a curve or surface
- **Capture / Store Attribute**, **Named Attribute**

### Math & Trig

- One node per operation: **Add**, **Subtract**, **Multiply**, **Divide**, **Modulo**, **Minimum**, **Maximum**, **Power** (`base`/`exponent`)
- Trig (single `angle`): **Sine**, **Cosine**, **Tangent**, **Arctangent2** (`y`/`x`)
- **Square Root**, **Absolute**, **Floor**, **Ceiling**, **Round**, **Natural Log**, **Exponential**, **Sign**, and the **Pi** constant
- Each node's preview shows its MathML formula and result, e.g. `sine(2.5) = 0.5985`

### Utility & control flow

- **Map Range**, **Clamp**, **Mix / Lerp**
- **Compare**, **Switch** (boolean-selected output), **Index**, **Count**
- **Random Value** (seeded)
- **For-Each / Repeat** zone (bounded iteration) — stretch goal

### Output

- **Output Geometry** — the network's single result node

> The library is **extensible**: each node is defined by metadata (sockets, params) plus an
> implementation in each runtime. Adding a node = add a definition + implementations.

---

## Meta-nodes (functions)

Any selected sub-network can be **collapsed into a meta-node**:

- It exposes a typed **input/output interface** (its boundary sockets become the meta-node's
  sockets).
- It appears as a **single node** in the parent graph, with its own color/label.
- It can be edited two ways:
  - **Open in a separate window** ("dive in") — edit the meta-node's subgraph as its own graph
    in a dedicated editor window/tab, **without ungrouping**. The parent graph is untouched;
    edits update the shared meta-node definition and propagate to every instance.
  - **Expand inline** ("ungroup") — splice the subgraph back into the parent graph, dissolving
    the meta-node boundary.
- Meta-nodes are **reusable** across networks and stored in a library.
- At compile time a meta-node is **inlined** (like an inlined function), so there is zero call
  overhead in generated code unless recursion/iteration requires a real function.

Meta-nodes are effectively **pure functions**, which is what makes both interpretation and
multi-language compilation tractable.

---

## The `.vnodes` JSON format

A network is a versioned JSON document. A published **JSON Schema** validates it.

```jsonc
{
  "format": "vector-nodes",
  "version": "1.0",
  "metadata": { "name": "Spiral", "author": "...", "created": "2026-06-08" },

  "parameters": [{ "id": "turns", "type": "Float", "default": 3, "min": 1, "max": 10 }],

  "nodes": [
    {
      "id": "n1",
      "type": "PointCircle",
      "position": [120, 80],
      "params": { "count": 64, "radius": 1 },
    },
    { "id": "out", "type": "OutputGeometry", "position": [600, 80] },
  ],

  "links": [{ "from": ["n1", "points"], "to": ["out", "geometry"] }],

  "metaNodes": {
    "RoundedRect": {
      "interface": {
        "inputs": [{ "name": "size", "type": "Vector" }],
        "outputs": [{ "name": "curve", "type": "Geometry" }],
      },
      "nodes": [
        /* ... */
      ],
      "links": [
        /* ... */
      ],
    },
  },
}
```

Key properties:

- **Stable IDs** so links and diffs survive edits.
- **Self-describing**: node `type` references the node library; `params` are static values.
- **Meta-node definitions** are embedded (or referenced from a shared library file).
- **Round-trips losslessly** through the editor (positions, comments, colors preserved).

---

## The evaluation engine

A **pull-based, memoizing DAG interpreter** (the reference implementation, in TypeScript):

1. Validate the graph (types, no cycles, single Output).
2. Topologically sort reachable nodes from the Output.
3. Evaluate each node once; **cache** results keyed by a hash of its inputs + params.
4. Re-evaluation after an edit only recomputes the **dirty** sub-tree → fast live preview.

The interpreter and the compilers share the **same runtime library** of geometry/math
operations, so interpreted and compiled results are identical.

---

## Compilation targets

Compilation turns a graph into idiomatic source code. The strategy:

- A small, hand-written **runtime library** (`@vector-nodes/runtime`) implements every node's
  math/geometry op once. The **same package** backs the interpreter, so interpreted preview and
  compiled output run identical code — there is no duplicated/inlined logic to drift.
- A **code generator** topologically walks the graph and emits straight-line code that imports
  the helpers it uses from the runtime, wiring outputs to inputs via local variables.
  **Meta-nodes are inlined**.
- The **root network compiles to a default-export, named function** (see
  [Calling a compiled module](#calling-a-compiled-module)).

### Current target: TypeScript / JavaScript

| Target         | Strategy                                                             | Runtime           |
| -------------- | -------------------------------------------------------------------- | ----------------- |
| **TypeScript** | Emit typed `.ts` importing from `@vector-nodes/runtime`              | shared TS runtime |
| **JavaScript** | Same generator, emit an ES module (TS output minus type annotations) | shared TS runtime |

Generated TS/JS modules carry exactly **one lightweight dependency** (`@vector-nodes/runtime`),
which is **published to npm** so a generated module installs and runs in any project. The
generator pins it at a compatible semver range.

### Future targets (out of scope for the initial build)

The architecture is deliberately language-agnostic: adding a target = implement a runtime in
that language + a codegen backend. The first planned additions:

| Target               | Strategy                                                     | Runtime      |
| -------------------- | ------------------------------------------------------------ | ------------ |
| **Rust** _(future)_  | Emit a `.rs` crate calling `vector-nodes-runtime` (crate)    | Rust runtime |
| **WASM** _(future)_  | Compile the Rust output to `wasm32` + JS glue (wasm-bindgen) | Rust runtime |
| **Other** _(future)_ | Implement a runtime + a codegen backend for the language     | per-language |

> When built, **Rust and WASM will share one runtime** (the Rust crate) and be
> **conformance-tested against the TS reference** so results match across languages.

---

## Calling a compiled module

The **root network compiles to a default-export, named function**. Its name comes from the
network's metadata (sanitized to a valid identifier), and its **typed arguments** come from the
network's `Parameter` nodes — in declared order. The return value is the output geometry.

```ts
// circle.generated.ts — generated from a network named "Circle" with a `radius` parameter
import circle from './circle.generated';

const geo = circle(5);
// signature: export default function circle(radius: number): Geometry
```

Geometry is not special — a `Geometry` parameter is just another typed argument, and a network
can declare **several** of them alongside scalars, in any order:

```ts
// from a network named "Blend" with parameters: base (Geometry), detail (Geometry), amount (Float)
import blend from './blend.generated';

const out = blend(baseMesh, detailMesh, 0.2);
// signature: export default function blend(base: Geometry, detail: Geometry, amount: number): Geometry
```

**Parameter → TypeScript argument type mapping** (idiomatic TS):

| Socket type        | TS argument type                          |
| ------------------ | ----------------------------------------- |
| `Float`, `Integer` | `number`                                  |
| `Boolean`          | `boolean`                                 |
| `Vector`           | `[number, number, number]`                |
| `Color`            | `[number, number, number, number]`        |
| `String`           | `string`                                  |
| `Geometry`         | `Geometry` (from `@vector-nodes/runtime`) |

Optional parameters take the default value defined on their node. Geometry values use a shared,
documented **interchange format** (points, vectors, curves, meshes as plain arrays) so data
crosses worker boundaries cleanly.

---

## Threading: main thread vs. worker

For TS / JS, the compiler emits **two wrappers** around the same generated function:

- **Main-thread wrapper** — the synchronous default-export function (e.g. `circle(5)`); simplest,
  good for small graphs.
- **Worker wrapper** — runs the function in a Web Worker behind a small RPC layer (Comlink-style
  message protocol), exposing an **async** version with the same name and arguments
  (e.g. `await circle(5)`) so heavy networks never block the UI.

Both wrappers share the identical compiled core; only the transport differs.

---

## The editor & preview

A web-based visual editor:

- **Node canvas** — pan/zoom, drag nodes, draw type-checked links, edit params inline. Sockets
  are Blender-colored; invalid connections are rejected with a reason.
- **Meta-node** — collapse a selection into a node; **double-click to open its subgraph in a
  separate window** for editing (no ungrouping), or expand/ungroup it inline.
- **Live preview pane** with a **2D ⇄ 3D toggle**:
  - **3D mode** → **Three.js** renderer (orbit camera, lighting, grid).
  - **2D mode** → **SVG** renderer that **projects to the X–Y plane and drops the Z coordinate**.
  - The toggle only changes the renderer/projection — the underlying network is always 3D.
- **Save / Open** `.vnodes` files; **Export** → choose target (TS/JS) and threading mode,
  download the generated module. (Rust/WASM export is a future addition.)

---

## Deployment

The editor is a static SPA deployed to **Cloudflare Workers** (static assets) from
`packages/editor/dist`, via Cloudflare's **Workers Builds** Git integration (service
`vector-nodes`). Config lives in
[`packages/editor/wrangler.jsonc`](packages/editor/wrangler.jsonc): assets-only Worker with SPA
fallback, the production custom domain `vector-nodes.sergeyche.dev`, and `workers.dev` +
per-version **preview URLs** (Workers Builds publishes a preview URL for every PR automatically).

### Workers Builds settings (Cloudflare dashboard)

Because this is an **npm-workspaces monorepo**, the build **must run from the repo root** so the
unpublished local `@vector-nodes/*` packages resolve via workspaces (running `npm ci` inside
`packages/editor` fails — there's no lockfile there and the packages aren't on npm). Set, in the
Worker's **Builds** settings:

| Setting        | Value                                                         |
| -------------- | ------------------------------------------------------------- |
| Root directory | `/` (repo root)                                               |
| Build command  | `npm ci && npm run build --workspace=editor`                  |
| Deploy command | `npx wrangler deploy --config packages/editor/wrangler.jsonc` |

`wrangler` resolves the `./dist` assets path relative to the config file, i.e.
`packages/editor/dist`.

### Manual deploy

```bash
npm ci                              # from the repo root (links the workspace packages)
npm run deploy --workspace=editor   # builds dist/ then `wrangler deploy`
```

`wrangler` authenticates via `wrangler login`, or `CLOUDFLARE_API_TOKEN` (a token with the
_Workers Scripts: Edit_ permission) plus `CLOUDFLARE_ACCOUNT_ID`.

---

## Architecture overview

An npm-workspaces monorepo:

```
packages/
  core/        # Types, graph model, .vnodes JSON schema + validation, meta-node logic
  runtime/     # @vector-nodes/runtime — geometry + math ops (shared by interpreter & TS/JS codegen)
  engine/      # Pull-based memoizing DAG interpreter (reference evaluator)
  codegen/     # Graph → TS/JS source generator (default-export named fn) + worker wrappers
  editor/      # React + React Flow UI, SVG + Three.js preview, import/export
docs/
  IMPLEMENTATION_PLAN.md  # Phased build plan (see below)
  vnodes.schema.json      # JSON Schema for the network format

# Future (separate plan, not built initially):
#   crates/runtime-rs/  — Rust geometry + math runtime (shared by Rust & WASM targets)
#   codegen Rust/WASM backends
```

**Single source of truth for node definitions.** Each node ships a declarative definition
(sockets, params, types) consumed by the editor, the validator, the interpreter, and the
codegen backend — so a node can't drift between "how it looks," "how it runs," and "how it
compiles."

---

## Implementation plan

The full phased plan lives in **[docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md)**.
Summary of phases:

0. **Scaffold** — monorepo, tooling, CI, JSON Schema skeleton.
1. **Core model & types** — type system, graph model, `.vnodes` format + validation.
2. **Runtime + interpreter** — `@vector-nodes/runtime`, pull-based evaluator, the basic node set.
3. **Editor MVP** — React Flow canvas, Blender socket colors, save/open.
4. **Preview** — SVG (2D) + Three.js (3D) with the projection toggle.
5. **Meta-nodes** — group/expand/inline, reusable library.
6. **TS/JS codegen** — default-export named function + main-thread & worker wrappers.
7. **Expanded node library** — transforms, curves, instancing, fields, utility (no meshes).
8. **Mesh geometry** — primitives, extrude, fill, subdivide, normals, convex hull, boolean.
9. **Polish & docs** — examples, conformance tests (interpreter == compiled), tutorials.
10. **npm publishing & release** — publish `@vector-nodes/*` (esp. `runtime`), Changesets, release CI.

**Future (separate plan):** Rust + WASM codegen — Rust runtime crate, Rust output, WASM build +
glue + worker, conformance-tested against the TS reference.

---

## License

Licensed under the **Apache License, Version 2.0** — see [LICENSE](LICENSE).
