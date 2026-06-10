# The `.vnodes` format

A network is a portable JSON document. The canonical JSON Schema is
[`docs/vnodes.schema.json`](../vnodes.schema.json) (draft 2020-12), embedded in `@vector-nodes/core`
as `VNODES_SCHEMA` and kept in sync by a test. Parse/serialize/validate with `parseVnodes`,
`serializeVnodes`, and `validateVnodes`.

## Shape

```jsonc
{
  "format": "vector-nodes",
  "version": "1.0",
  "metadata": { "name": "shifted", "description": "…" },

  // External, typed inputs → arguments of the generated function.
  "parameters": [{ "id": "shift", "type": "Vector", "default": [0, 0, 0] }],

  "nodes": [
    {
      "id": "cc",
      "type": "CircleCurve",
      "position": [60, 60],
      "params": { "radius": 1, "count": 24 },
    },
    { "id": "out", "type": "OutputGeometry", "position": [640, 120] },
  ],

  // Edges: [nodeId, socketName] → [nodeId, socketName].
  "links": [{ "from": ["cc", "geometry"], "to": ["out", "geometry"] }],

  // Reusable meta-node (function) definitions, keyed by name (Phase 5).
  "metaNodes": {},
}
```

## Rules (validated by `validateGraph`)

- Exactly **one `OutputGeometry`** node.
- Links are **type-checked** (with the implicit conversions: Integer→Float, Float→Vector/Color, …);
  array/field flags must match.
- **No cycles**; no dangling endpoints; one link per input socket (fan-in), many per output (fan-out).
- A `metaNodes[name]` entry holds a subgraph (`nodes` + `links`) and an `interface`
  (inputs/outputs); instances reference it via the node type `Meta:<name>`.

See [`examples/`](../../examples) for complete documents.
