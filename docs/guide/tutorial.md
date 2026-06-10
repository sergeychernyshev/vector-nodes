# Tutorial — build a network

This walks through building a simple parametric network in the editor.

## 1. Open the editor

```bash
npm install
npm run dev --workspace=editor   # http://localhost:5173
```

The canvas opens with a seed network (a **Point Circle** → **Output Geometry**) and a live preview
on the right.

## 2. Add and connect nodes

- Pick a node from the **palette** (left) — it's added to the canvas. Nodes are grouped by category
  (Input, Vector, Geometry, Mesh, Utility, …); the search box filters them.
- Drag from an **output socket** to an **input socket** to connect. Sockets are Blender-colored by
  type; incompatible connections are rejected with a reason (shown in a toast). Array/field sockets
  have a white ring.
- Edit a node's **parameters inline** on the node. The preview re-evaluates on every change.

There can be only **one Output Geometry** node — the network's result.

## 3. Preview

The right panel renders the output geometry with a **2D / 3D toggle**:

- **3D** — Three.js: orbit with the mouse; points, curves, and meshes render with a grid + lighting.
- **2D** — SVG: the geometry projected to the X–Y plane (Z dropped).

Evaluation runs in a **Web Worker**, so editing stays smooth on large geometry.

## 4. Parameters (function arguments)

Add a **Parameter** node (e.g. `ParameterVector`) and give it a name matching a network parameter.
When you export, each parameter becomes a typed argument of the generated function. See
[`examples/shifted.vnodes`](../../examples/shifted.vnodes).

## 5. Meta-nodes (reusable functions)

Select some nodes and click **Group** to collapse them into a single **meta-node** instance; its
interface is inferred from the links crossing the selection. **Double-click** a meta-node to edit
its subgraph in place (changes propagate to every instance), **Ungroup** to expand it back, or
**Save to library** to reuse it in other networks.

## 6. Save / open / export

- **Save** / **Open** (`⌘S` / `⌘O`) read and write the [`.vnodes`](vnodes-format.md) JSON format.
  The current network also autosaves to local storage.
- To turn a network into code, see the [Export guide](export.md).
