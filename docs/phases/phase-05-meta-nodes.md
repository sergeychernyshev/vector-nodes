# Phase 5 — Meta-nodes (`packages/core`, `packages/editor`)

**Goal:** functions as reusable single nodes.

**Done when:** a network using a meta-node evaluates identically to the same network with the
meta-node expanded inline.

---

## Step 5.1 — Collapse selection → meta-node

- [ ] **Scope:** core operation: take a selection, derive its interface from boundary sockets,
      create a meta-node definition + replace the selection with one instance.
- **Acceptance:** round-trips through `.vnodes`; interface inferred correctly.
- **Branch:** `phase-5/step-5.1-collapse`

## Step 5.2 — Expand / ungroup inline

- [ ] **Scope:** splice a meta-node's subgraph back into the parent graph, dissolving the boundary.
- **Acceptance:** ungroup then re-collapse is stable.
- **Branch:** `phase-5/step-5.2-ungroup`

## Step 5.3 — Separate-window subgraph editor

- [ ] **Scope:** open a meta-node's subgraph in its own editor window/tab **without ungrouping**;
      edits update the shared definition and propagate to all instances.
- **Acceptance:** editing in the window updates every instance; parent graph untouched.
- **Branch:** `phase-5/step-5.3-subgraph-window`

## Step 5.4 — Reusable meta-node library

- [ ] **Scope:** save/load meta-node definitions to a library; insert instances across networks.
- **Acceptance:** a library meta-node can be reused in a new network.
- **Branch:** `phase-5/step-5.4-library`

## Step 5.5 — Interpreter inlining

- [ ] **Scope:** evaluate meta-nodes by inlining their subgraph.
- **Acceptance:** meta-node network == expanded network (conformance test).
- **Branch:** `phase-5/step-5.5-interpreter-inlining`
