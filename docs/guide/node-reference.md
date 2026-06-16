# Node reference

_Generated from `@vector-nodes/core` node definitions._

Plus a **Parameter** node per socket type (`ParameterFloat` … `ParameterGeometry`) exposing a network argument, and meta-node instances (Phase 5).

## Geometry

| Node                                        | Inputs                                                                      | Outputs                                  | Params                            |
| ------------------------------------------- | --------------------------------------------------------------------------- | ---------------------------------------- | --------------------------------- |
| **Bezier Curve** (`BezierCurve`)            | `p0`: Vector, `p1`: Vector, `p2`: Vector, `p3`: Vector, `segments`: Integer | `geometry`: Geometry, `points`[]: Vector | —                                 |
| **Bounding Box** (`BoundingBox`)            | `geometry`: Geometry                                                        | `geometry`: Geometry                     | —                                 |
| **Circle** (`CircleCurve`)                  | `radius`: Float, `count`: Integer                                           | `geometry`: Geometry                     | —                                 |
| **Set Color** (`ColorGeometry`)             | `geometry`: Geometry, `color`: Color                                        | `geometry`: Geometry                     | —                                 |
| **Instance on Points** (`InstanceOnPoints`) | `geometry`: Geometry, `points`[]: Vector                                    | `geometry`: Geometry                     | —                                 |
| **Merge** (`MergeGeometry`)                 | `geometry`[]: Geometry (accepts many connections)                           | `geometry`: Geometry                     | —                                 |
| **Point Circle** (`PointCircle`)            | `radius`: Float, `count`: Integer                                           | `geometry`: Geometry, `points`[]: Vector | —                                 |
| **Point Grid** (`PointGrid`)                | `countX`: Integer, `countY`: Integer, `spacingX`: Float, `spacingY`: Float  | `geometry`: Geometry, `points`[]: Vector | —                                 |
| **Point Line** (`PointLine`)                | `start`: Vector, `end`: Vector, `count`: Integer                            | `geometry`: Geometry, `points`[]: Vector | —                                 |
| **Point Random** (`PointRandom`)            | `count`: Integer, `min`: Vector, `max`: Vector, `seed`: Integer             | `geometry`: Geometry, `points`[]: Vector | —                                 |
| **Polyline** (`Polyline`)                   | `points`[]: Vector, `closed`: Boolean                                       | `geometry`: Geometry                     | —                                 |
| **Project** (`Project`)                     | `geometry`: Geometry, `distance`: Float                                     | `geometry`: Geometry                     | `mode` (orthographic/perspective) |
| **Rotate** (`RotateGeometry`)               | `geometry`: Geometry, `axis`: Vector, `angle`: Float                        | `geometry`: Geometry                     | —                                 |
| **Scale** (`ScaleGeometry`)                 | `geometry`: Geometry, `factor`: Vector                                      | `geometry`: Geometry                     | —                                 |
| **Translate** (`Translate`)                 | `geometry`: Geometry, `offset`: Vector                                      | `geometry`: Geometry                     | —                                 |

## Input

| Node                                  | Inputs                                                      | Outputs          | Params               |
| ------------------------------------- | ----------------------------------------------------------- | ---------------- | -------------------- |
| **Boolean Constant** (`ConstBoolean`) | —                                                           | `value`: Boolean | `value`              |
| **Color Constant** (`ConstColor`)     | —                                                           | `value`: Color   | `value`              |
| **Combine Color** (`CombineColor`)    | `red`: Float, `green`: Float, `blue`: Float, `alpha`: Float | `color`: Color   | `mode` (RGB/HSL/HSV) |
| **Float Constant** (`ConstFloat`)     | —                                                           | `value`: Float   | `value`              |
| **Integer Constant** (`ConstInteger`) | —                                                           | `value`: Integer | `value`              |
| **String Constant** (`ConstString`)   | —                                                           | `value`: String  | `value`              |
| **Vector Constant** (`ConstVector`)   | —                                                           | `value`: Vector  | `value`              |

## Mesh

| Node                                | Inputs                                                               | Outputs              | Params |
| ----------------------------------- | -------------------------------------------------------------------- | -------------------- | ------ |
| **Cone** (`ConeMesh`)               | `radius`: Float, `height`: Float, `segments`: Integer                | `geometry`: Geometry | —      |
| **Cube** (`BoxMesh`)                | `width`: Float, `height`: Float, `depth`: Float                      | `geometry`: Geometry | —      |
| **Cylinder** (`CylinderMesh`)       | `radius`: Float, `height`: Float, `segments`: Integer                | `geometry`: Geometry | —      |
| **Grid** (`GridMesh`)               | `countX`: Integer, `countY`: Integer, `sizeX`: Float, `sizeY`: Float | `geometry`: Geometry | —      |
| **Plane** (`PlaneMesh`)             | `width`: Float, `height`: Float                                      | `geometry`: Geometry | —      |
| **Triangulate** (`TriangulateMesh`) | `geometry`: Geometry                                                 | `geometry`: Geometry | —      |
| **UV Sphere** (`UVSphere`)          | `radius`: Float, `segments`: Integer, `rings`: Integer               | `geometry`: Geometry | —      |

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
