# Phase 7 — Expanded node library (points, vectors, curves, utility)

**Goal:** cover non-mesh modeling needs. Meshes are Phase 8.

**Done when:** each new node has a runtime op, renders in preview, and passes an
interpreter-vs-compiled conformance test.

Every step adds: runtime op(s) + node definition(s) + preview support + conformance test.

> Delivered as one phase PR with a **representative, fully-wired set per theme** (runtime op +
> node def + interpreter op + codegen emitter + interpreter-vs-compiled conformance). The longer
> tail of each step (Euler/Matrix transforms, Arc/Sample/Resample/Length, attribute capture,
> Separate, Switch/Compare/Index/Count) is follow-up work.

---

## Step 7.1 — Transforms

- [x] **Scope:** Rotate (axis-angle), Scale. _(Euler / Transform-Matrix: follow-up.)_
- **Branch:** `phase-7/step-7.1-transforms`

## Step 7.2 — Curves

- [x] **Scope:** Circle, Polyline. _(Line/Arc/Sample/Resample/Length: follow-up.)_
- **Branch:** `phase-7/step-7.2-curves`

## Step 7.3 — Instancing & fields

- [x] **Scope:** Instance on Points. _(Distribute-on-curve / attributes: follow-up.)_
- **Branch:** `phase-7/step-7.3-instancing-fields`

## Step 7.4 — General geometry

- [x] **Scope:** Merge/Join, Bounding Box. _(Separate: follow-up.)_
- **Branch:** `phase-7/step-7.4-general-geometry`

## Step 7.5 — Utility

- [x] **Scope:** Math, Map Range, Clamp. _(Mix/Compare/Switch/Index/Count/Random: follow-up.)_
- **Branch:** `phase-7/step-7.5-utility`
