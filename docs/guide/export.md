# Export — compile a network to code

`@vector-nodes/codegen` compiles a `.vnodes` network into a standalone module whose **root network
becomes a default-export, named function**. The generated code imports only the helpers it uses from
`@vector-nodes/runtime`, and its output is **identical to the interpreter's** (both call the same
runtime ops — verified by the conformance suite).

## Generate

```ts
import { createBasicRegistry, parseVnodes } from '@vector-nodes/core';
import { generate } from '@vector-nodes/codegen';
import { readFileSync } from 'node:fs';

const graph = parseVnodes(readFileSync('shifted.vnodes', 'utf8'));
const mod = generate(graph, createBasicRegistry());

mod.ts; // TypeScript module source
mod.js; // JavaScript module source (no type annotations)
mod.name; // function name (from the network metadata)
mod.params; // [{ name, tsType }] — the function arguments (from Parameter nodes)
```

For [`examples/shifted.vnodes`](../../examples/shifted.vnodes), `mod.ts` is:

```ts
import { add, circlePoints, transformGeometry, type Geometry } from '@vector-nodes/runtime';

export default function shifted(shift: [number, number, number]): Geometry {
  // … straight-line code wiring node outputs → inputs …
  return /* output geometry */;
}
```

## Targets & wrappers

- **TypeScript** (`mod.ts`) / **JavaScript** (`mod.js`).
- `mainThreadWrapper(spec)` — a synchronous re-export of the default function.
- `workerModule(spec)` + `workerClient(name, spec)` — a Web Worker module and a Comlink-style async
  client (`async fn(...args)` running in the worker).

## Use it

```ts
import shifted from './shifted.generated';

const geometry = shifted([1, 0, 0]); // → { points, curves, meshes }
```

Install `@vector-nodes/runtime` in the consuming project — the generated module imports its helpers
from there.
