# Phase 6 — TS/JS codegen (`packages/codegen`)

**Goal:** compile a graph to a standalone TS/JS module.

**Done when:** a generated module imports cleanly, its default export runs in Node and the
browser, and **its output equals the interpreter's** for the example networks.

---

## Step 6.1 — Codegen core
- [ ] **Scope:** topological walk → straight-line TS, wiring outputs→inputs via locals; import
  only the helpers used from `@vector-nodes/runtime`.
- **Acceptance:** a simple graph emits valid, type-checking TS.
- **Branch:** `phase-6/step-6.1-codegen-core`

## Step 6.2 — Default-export named function
- [ ] **Scope:** root network → `export default function <name>(...)`; name sanitized from
  metadata; args from `Parameter` nodes (any type, incl. multiple Geometry) in declared order,
  idiomatic TS types, defaults from nodes; meta-nodes inlined.
- **Acceptance:** signature matches the README mapping; named fn returns output geometry.
- **Branch:** `phase-6/step-6.2-default-export-fn`

## Step 6.3 — JS target
- [ ] **Scope:** same generator emitting an ES module without type annotations.
- **Acceptance:** generated `.js` runs in Node.
- **Branch:** `phase-6/step-6.3-js-target`

## Step 6.4 — Main-thread wrapper
- [ ] **Scope:** synchronous wrapper exposing the default-export function directly.
- **Acceptance:** import + call works.
- **Branch:** `phase-6/step-6.4-main-thread-wrapper`

## Step 6.5 — Worker wrapper
- [ ] **Scope:** Web Worker wrapper (Comlink-style RPC) exposing an async same-name/args fn.
- **Acceptance:** runs off the main thread; results match the sync version.
- **Branch:** `phase-6/step-6.5-worker-wrapper`

## Step 6.6 — Conformance harness
- [ ] **Scope:** test harness comparing interpreter output to compiled-module output for example
  networks.
- **Acceptance:** interpreter == compiled for all examples.
- **Branch:** `phase-6/step-6.6-conformance`
