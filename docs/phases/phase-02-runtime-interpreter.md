# Phase 2 — Runtime + interpreter (`packages/runtime`, `packages/engine`)

**Goal:** evaluate a graph and produce geometry.

**Done when:** the example networks evaluate to correct geometry, and editing a param recomputes
only the affected subtree.

---

## Step 2.1 — Runtime: math & interchange types

- [x] **Scope:** `@vector-nodes/runtime` geometry interchange types (point, vector, curve, mesh as
      plain arrays) + scalar/vector math (add, sub, scale, dot, cross, normalize, length, distance).
- **Acceptance:** unit tests for every math op.
- **Branch:** `phase-2/step-2.1-runtime-math`

## Step 2.2 — Runtime: geometry ops

- [x] **Scope:** point/vector array construction (grid, line, circle, random, from-list),
      projection (orthographic/perspective), translation, bezier sampling.
- **Acceptance:** numeric tests against known values.
- **Branch:** `phase-2/step-2.2-runtime-geometry`

## Step 2.3 — Interpreter: pull evaluation

- [ ] **Scope:** validate → topological sort from Output → evaluate each node once via runtime ops.
- **Acceptance:** a sample graph evaluates to expected geometry.
- **Branch:** `phase-2/step-2.3-interpreter-eval`

## Step 2.4 — Interpreter: memoization & dirty tracking

- [ ] **Scope:** cache results keyed by hash of inputs+params; recompute only the dirty subtree on
      an edit.
- **Acceptance:** editing one param recomputes only affected nodes (assert via instrumentation).
- **Branch:** `phase-2/step-2.4-memoization`

## Step 2.5 — Basic node set

- [ ] **Scope:** wire the basic nodes (Point, Vector, Combine/Separate XYZ, Vector Math, Point
      Array, Vector Array, Project, Translate, Bezier Curve, constants, Parameter incl. Geometry,
      Output Geometry) to runtime ops + definitions.
- **Acceptance:** each node has a definition + interpreter behavior + test.
- **Branch:** `phase-2/step-2.5-basic-nodes`
