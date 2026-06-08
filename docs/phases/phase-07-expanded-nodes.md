# Phase 7 — Expanded node library (points, vectors, curves, utility)

**Goal:** cover non-mesh modeling needs. Meshes are Phase 8.

**Done when:** each new node has a runtime op, renders in preview, and passes an
interpreter-vs-compiled conformance test.

Every step adds: runtime op(s) + node definition(s) + preview support + conformance test.

---

## Step 7.1 — Transforms

- [ ] **Scope:** Rotate (axis-angle/Euler), Scale, Transform (Matrix).
- **Branch:** `phase-7/step-7.1-transforms`

## Step 7.2 — Curves

- [ ] **Scope:** Polyline, Line, Arc/Circle, Sample Curve, Resample Curve, Curve Length.
- **Branch:** `phase-7/step-7.2-curves`

## Step 7.3 — Instancing & fields

- [ ] **Scope:** Instance on Points, Distribute Points on a curve, Capture/Store/Named Attribute.
- **Branch:** `phase-7/step-7.3-instancing-fields`

## Step 7.4 — General geometry

- [ ] **Scope:** Merge/Join, Separate, Bounding Box.
- **Branch:** `phase-7/step-7.4-general-geometry`

## Step 7.5 — Utility

- [ ] **Scope:** Math, Map Range, Clamp, Mix/Lerp, Compare, Switch, Index, Count, Random (seeded).
- **Branch:** `phase-7/step-7.5-utility`
