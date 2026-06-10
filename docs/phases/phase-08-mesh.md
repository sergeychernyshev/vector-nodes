# Phase 8 — Mesh geometry

**Goal:** full mesh modeling, built on Phases 2–7.

**Done when:** each mesh node has a runtime op, renders correctly in the 3D preview, and passes
an interpreter-vs-compiled conformance test.

Every step adds: runtime op(s) + node definition(s) + 3D preview support + conformance test.

> Mesh primitives (8.1) are delivered fully; one representative mesh op (Triangulate) lands for
> 8.2. Heavier ops (Extrude/Subdivide/Normals), surface distribution (8.3), Convex Hull (8.4), and
> Boolean (8.5, a stretch goal) are follow-ups — the wiring pattern is established. The 3D preview
> already renders meshes (Phase 4).

---

## Step 8.1 — Mesh model & primitives

- [x] **Scope:** Plane, Cube, Grid, UV Sphere, Cylinder, Cone (the `Mesh` interchange shape
      already existed from Phase 2).
- **Branch:** `phase-8/step-8.1-primitives`

## Step 8.2 — Mesh ops

- [x] **Scope:** Triangulate (fan-triangulate polygon faces). _(Extrude/Subdivide/Normals:
      follow-up.)_
- **Branch:** `phase-8/step-8.2-mesh-ops`

## Step 8.3 — Distribute on surface

- [ ] **Scope:** Distribute Points on a surface (extends Phase 7 instancing to meshes). _(Follow-up.)_
- **Branch:** `phase-8/step-8.3-distribute-surface`

## Step 8.4 — Convex hull

- [ ] **Scope:** Convex Hull node + runtime op. _(Follow-up.)_
- **Branch:** `phase-8/step-8.4-convex-hull`

## Step 8.5 — Boolean (stretch)

- [ ] **Scope:** Boolean union/difference/intersect. _(Stretch goal — follow-up.)_
- **Branch:** `phase-8/step-8.5-boolean`
