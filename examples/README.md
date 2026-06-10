# Examples

Runnable `.vnodes` networks. Each is validated and checked by the
interpreter-vs-compiled **conformance suite** (`packages/codegen/src/examples.test.ts`), so they
always evaluate and compile to identical output.

| File                                               | What it shows                                                                      |
| -------------------------------------------------- | ---------------------------------------------------------------------------------- |
| [`circle.vnodes`](circle.vnodes)                   | A ring of points (`PointCircle`).                                                  |
| [`sphere.vnodes`](sphere.vnodes)                   | A UV sphere mesh primitive.                                                        |
| [`instanced-array.vnodes`](instanced-array.vnodes) | A cone instanced over a grid of points.                                            |
| [`rotated-box.vnodes`](rotated-box.vnodes)         | A cube rotated about Z by a constant angle.                                        |
| [`shifted.vnodes`](shifted.vnodes)                 | A **parameterized** translate — `shift` becomes a function argument when exported. |

Open one in the editor (**Open**, or `⌘O`), or compile it — see the
[Export guide](../docs/guide/export.md).
