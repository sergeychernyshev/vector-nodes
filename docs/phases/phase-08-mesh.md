# Phase 8 — Mesh geometry

**Goal:** full mesh modeling, built on Phases 2–7.

**Done when:** each mesh node has a runtime op, renders correctly in the 3D preview, and passes
an interpreter-vs-compiled conformance test.

Every step adds: runtime op(s) + node definition(s) + 3D preview support + conformance test.

---

## Step 8.1 — Mesh model & primitives

- [ ] **Scope:** mesh data structure in the interchange format; primitives: plane, cube, grid,
      UV sphere, cylinder, cone.
- **Branch:** `phase-8/step-8.1-primitives`

## Step 8.2 — Mesh ops

- [ ] **Scope:** Extrude, Fill/Triangulate, Subdivide, Normals.
- **Branch:** `phase-8/step-8.2-mesh-ops`

## Step 8.3 — Distribute on surface

- [ ] **Scope:** Distribute Points on a surface (extends Phase 7 instancing to meshes).
- **Branch:** `phase-8/step-8.3-distribute-surface`

## Step 8.4 — Convex hull

- [ ] **Scope:** Convex Hull node + runtime op.
- **Branch:** `phase-8/step-8.4-convex-hull`

## Step 8.5 — Boolean (stretch)

- [ ] **Scope:** Boolean union/difference/intersect.
- **Branch:** `phase-8/step-8.5-boolean`
