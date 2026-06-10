# Node reference

_Generated from `@vector-nodes/core` node definitions._

Plus a **Parameter** node per socket type (`ParameterFloat` … `ParameterGeometry`) exposing a network argument, and meta-node instances (Phase 5).

## Geometry

| Node                                        | Inputs                                                 | Outputs                                  | Params                                        |
| ------------------------------------------- | ------------------------------------------------------ | ---------------------------------------- | --------------------------------------------- |
| **Bezier Curve** (`BezierCurve`)            | `p0`: Vector, `p1`: Vector, `p2`: Vector, `p3`: Vector | `geometry`: Geometry, `points`[]: Vector | `segments`                                    |
| **Bounding Box** (`BoundingBox`)            | `geometry`: Geometry                                   | `geometry`: Geometry                     | —                                             |
| **Circle** (`CircleCurve`)                  | —                                                      | `geometry`: Geometry                     | `radius`, `count`                             |
| **Instance on Points** (`InstanceOnPoints`) | `geometry`: Geometry, `points`[]: Vector               | `geometry`: Geometry                     | —                                             |
| **Merge** (`MergeGeometry`)                 | `geometry0`, `geometry1`, … : Geometry (variadic)      | `geometry`: Geometry                     | —                                             |
| **Point Circle** (`PointCircle`)            | —                                                      | `geometry`: Geometry, `points`[]: Vector | `radius`, `count`                             |
| **Point Grid** (`PointGrid`)                | —                                                      | `geometry`: Geometry, `points`[]: Vector | `countX`, `countY`, `spacingX`, `spacingY`    |
| **Point Line** (`PointLine`)                | —                                                      | `geometry`: Geometry, `points`[]: Vector | `start`, `end`, `count`                       |
| **Point Random** (`PointRandom`)            | —                                                      | `geometry`: Geometry, `points`[]: Vector | `count`, `min`, `max`, `seed`                 |
| **Polyline** (`Polyline`)                   | `points`[]: Vector                                     | `geometry`: Geometry                     | `closed`                                      |
| **Project** (`Project`)                     | `geometry`: Geometry                                   | `geometry`: Geometry                     | `mode` (orthographic/perspective), `distance` |
| **Rotate** (`RotateGeometry`)               | `geometry`: Geometry, `axis`: Vector, `angle`: Float   | `geometry`: Geometry                     | —                                             |
| **Scale** (`ScaleGeometry`)                 | `geometry`: Geometry, `factor`: Vector                 | `geometry`: Geometry                     | —                                             |
| **Translate** (`Translate`)                 | `geometry`: Geometry, `offset`: Vector                 | `geometry`: Geometry                     | —                                             |

## Input

| Node                                  | Inputs | Outputs          | Params  |
| ------------------------------------- | ------ | ---------------- | ------- |
| **Boolean Constant** (`ConstBoolean`) | —      | `value`: Boolean | `value` |
| **Color Constant** (`ConstColor`)     | —      | `value`: Color   | `value` |
| **Float Constant** (`ConstFloat`)     | —      | `value`: Float   | `value` |
| **Integer Constant** (`ConstInteger`) | —      | `value`: Integer | `value` |
| **String Constant** (`ConstString`)   | —      | `value`: String  | `value` |
| **Vector Constant** (`ConstVector`)   | —      | `value`: Vector  | `value` |

## Mesh

| Node                                | Inputs               | Outputs              | Params                               |
| ----------------------------------- | -------------------- | -------------------- | ------------------------------------ |
| **Cone** (`ConeMesh`)               | —                    | `geometry`: Geometry | `radius`, `height`, `segments`       |
| **Cube** (`BoxMesh`)                | —                    | `geometry`: Geometry | `width`, `height`, `depth`           |
| **Cylinder** (`CylinderMesh`)       | —                    | `geometry`: Geometry | `radius`, `height`, `segments`       |
| **Grid** (`GridMesh`)               | —                    | `geometry`: Geometry | `countX`, `countY`, `sizeX`, `sizeY` |
| **Plane** (`PlaneMesh`)             | —                    | `geometry`: Geometry | `width`, `height`                    |
| **Triangulate** (`TriangulateMesh`) | `geometry`: Geometry | `geometry`: Geometry | —                                    |
| **UV Sphere** (`UVSphere`)          | —                    | `geometry`: Geometry | `radius`, `segments`, `rings`        |

## Output

| Node                                   | Inputs               | Outputs | Params |
| -------------------------------------- | -------------------- | ------- | ------ |
| **Output Geometry** (`OutputGeometry`) | `geometry`: Geometry | —       | —      |

## Utility

| Node                       | Inputs                                                                             | Outputs        | Params                                                   |
| -------------------------- | ---------------------------------------------------------------------------------- | -------------- | -------------------------------------------------------- |
| **Clamp** (`Clamp`)        | `value`: Float, `min`: Float, `max`: Float                                         | `value`: Float | —                                                        |
| **Map Range** (`MapRange`) | `value`: Float, `fromMin`: Float, `fromMax`: Float, `toMin`: Float, `toMax`: Float | `value`: Float | —                                                        |
| **Math** (`MathFloat`)     | `a`: Float, `b`: Float                                                             | `value`: Float | `operation` (add/subtract/multiply/divide/min/max/power) |

## Vector

| Node                             | Inputs                                   | Outputs                            | Params                                                               |
| -------------------------------- | ---------------------------------------- | ---------------------------------- | -------------------------------------------------------------------- |
| **Combine XYZ** (`CombineXYZ`)   | `x`: Float, `y`: Float, `z`: Float       | `vector`: Vector                   | —                                                                    |
| **Point** (`Point`)              | `x`: Float, `y`: Float, `z`: Float       | `point`: Vector                    | —                                                                    |
| **Separate XYZ** (`SeparateXYZ`) | `vector`: Vector                         | `x`: Float, `y`: Float, `z`: Float | —                                                                    |
| **Vector** (`Vector`)            | `x`: Float, `y`: Float, `z`: Float       | `vector`: Vector                   | —                                                                    |
| **Vector Array** (`VectorArray`) | —                                        | `vectors`[]: Vector                | `values`                                                             |
| **Vector Math** (`VectorMath`)   | `a`: Vector, `b`: Vector, `scale`: Float | `vector`: Vector, `value`: Float   | `operation` (add/subtract/scale/dot/cross/normalize/length/distance) |
