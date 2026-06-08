# Phase 1 — Core model & types (`packages/core`)

**Goal:** the data model and the `.vnodes` format.

**Done when:** a hand-written `.vnodes` file round-trips losslessly and validation catches type
mismatches, cycles, and missing outputs with clear errors.

---

## Step 1.1 — Socket types & Blender colors

- [x] **Scope:** `SocketType` union (Float, Integer, Boolean, Vector, Color, String, Geometry,
      Matrix) + the `isArray`/field flag; exported Blender color map (canonical hex from README);
      allowed implicit conversions table.
- **Acceptance:** unit tests for the color map and conversion lookups.
- **Branch:** `phase-1/step-1.1-socket-types`

## Step 1.2 — Node definitions & registry

- [ ] **Scope:** `NodeDefinition` interface (inputs, outputs, params w/ defaults/ranges,
      metadata) + a registry to look up definitions by type.
- **Acceptance:** register and retrieve a sample definition; param defaults resolve.
- **Branch:** `phase-1/step-1.2-node-definitions`

## Step 1.3 — Graph model

- [ ] **Scope:** `Graph` types (nodes, links, parameters, embedded meta-node defs, single
      Output); constructors and basic accessors.
- **Acceptance:** build a graph in code; query nodes/links.
- **Branch:** `phase-1/step-1.3-graph-model`

## Step 1.4 — `.vnodes` (de)serialize + schema validation

- [ ] **Scope:** parse/serialize `.vnodes`; validate against `docs/vnodes.schema.json` (ajv 2020).
- **Acceptance:** lossless round-trip of an example file; invalid docs rejected with messages.
- **Branch:** `phase-1/step-1.4-serialize-validate`

## Step 1.5 — Static graph validation

- [ ] **Scope:** link type-compatibility (incl. implicit conversions), cycle detection,
      single-output rule, dangling-link checks; structured error reporting.
- **Acceptance:** tests cover each failure mode with clear errors.
- **Branch:** `phase-1/step-1.5-graph-validation`
