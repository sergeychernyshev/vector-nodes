# Performance

How the editor and engine stay responsive, and where the headroom is.

## Evaluation

- **Pull-based, memoized interpreter.** `evaluateGraph` walks back from the Output node, computes
  each node **once**, and caches its outputs for the run — shared sub-trees aren't recomputed. A
  35,000-point `PointCircle` evaluates in ~1.4ms.
- **Off the main thread.** The editor preview runs the interpreter in a **Web Worker**
  (`usePreview`), so evaluation never blocks UI interaction. The worker↔main transfer of a 35k-point
  result is ~5ms (structured clone).
- **Meta-nodes are flattened** before evaluation, so they cost the same as the expanded network.
- An incremental `Interpreter` (content-signature cache, cyrb53 + stable stringify) is available in
  `@vector-nodes/engine` for dirty-subtree recompute across edits.

## Rendering

- **3D (Three.js)** builds a single `BufferGeometry` for the point cloud (one GPU upload), not
  per-point objects. React renders only the canvas container; geometry is built imperatively.
- **2D (SVG)** draws all points as a **single `<path>`** (one DOM node) instead of one `<circle>`
  per point — a 35k-point cloud went from a ~3.5s reconcile/layout stall to a single element. See
  PR #34.
- Only the **active** renderer is mounted (the 2D/3D toggle), so the idle one costs nothing.

## Generated code

- The codegen emits **straight-line code** wiring node outputs→inputs via locals, importing only the
  helpers used — no interpreter overhead at runtime, and tree-shakeable.

## Known headroom (follow-ups)

- Transfer the worker result as a **transferable `Float32Array`** (zero-copy) instead of nested
  arrays — matters at >100k points.
- LOD / downsampling for very large previews.
- Wire the incremental `Interpreter` into the editor preview for sub-graph-dirty recompute.
