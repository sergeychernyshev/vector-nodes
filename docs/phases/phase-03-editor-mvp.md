# Phase 3 — Editor MVP (`packages/editor`)

**Goal:** build and edit networks visually.

**Done when:** a user can build a Phase-2 network from scratch, save it, reopen it, and get an
identical graph; invalid links are blocked.

---

## Step 3.1 — App shell + canvas

- [x] **Scope:** Vite + React app; React Flow canvas with pan/zoom; load node definitions from
      `core`.
- **Acceptance:** app runs; can drop and drag nodes.
- **Branch:** `phase-3/step-3.1-app-shell`

## Step 3.2 — Node rendering & palette

- [x] **Scope:** custom node component with Blender-colored sockets (field sockets get a ring/
      badge); node palette/search backed by the registry.
- **Acceptance:** nodes render with correct socket colors; palette adds nodes.
- **Branch:** `phase-3/step-3.2-node-rendering`

## Step 3.3 — Type-checked linking

- [ ] **Scope:** allow/reject connections using `core` type rules + implicit conversions; show a
      reason on rejection.
- **Acceptance:** invalid links blocked with message; valid links (incl. conversions) allowed.
- **Branch:** `phase-3/step-3.3-linking`

## Step 3.4 — Param editing

- [ ] **Scope:** inline param editors per type (number, bool, vector, color, string).
- **Acceptance:** edits update the graph model and persist on save.
- **Branch:** `phase-3/step-3.4-param-editing`

## Step 3.5 — Save / Open

- [ ] **Scope:** export/import `.vnodes` (uses `core` serialize + validate), preserving positions.
- **Acceptance:** build → save → reopen yields an identical graph.
- **Branch:** `phase-3/step-3.5-save-open`
