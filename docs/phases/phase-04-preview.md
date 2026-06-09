# Phase 4 — Preview (`packages/editor`)

**Goal:** live 2D/3D visualization.

**Done when:** the same network renders correctly in both modes and the toggle is instant.

---

## Step 4.1 — Preview pane + interpreter integration

- [x] **Scope:** preview panel that runs the interpreter on the current graph and re-renders on
      graph/param edits.
- **Acceptance:** preview updates live as the graph changes.
- **Branch:** `phase-4/step-4.1-preview-pane`

## Step 4.2 — Three.js 3D renderer

- [x] **Scope:** render points, curves, meshes from the interchange format; orbit camera, grid,
      lighting.
- **Acceptance:** sample geometry renders correctly in 3D.
- **Branch:** `phase-4/step-4.2-threejs-renderer`

## Step 4.3 — SVG 2D renderer

- [ ] **Scope:** SVG renderer that **projects to X–Y and drops Z**; points, curves, polygons.
- **Acceptance:** sample geometry renders correctly in 2D with Z dropped.
- **Branch:** `phase-4/step-4.3-svg-renderer`

## Step 4.4 — 2D ⇄ 3D toggle

- [ ] **Scope:** toggle that swaps renderer/projection only; the network stays 3D.
- **Acceptance:** toggling is instant and preserves the network.
- **Branch:** `phase-4/step-4.4-mode-toggle`
