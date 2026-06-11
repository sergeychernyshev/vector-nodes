import { PARAMETER_NODE_TYPES } from '@vector-nodes/core';
import {
  add,
  arcPoints,
  boundingBox,
  boxMesh,
  circleCurve,
  circlePoints,
  clamp,
  colorGeometry,
  coneMesh,
  cross,
  curveGeometry,
  cylinderMesh,
  distance,
  divideAxes,
  dot,
  fillCurves,
  filletCurve,
  fromList,
  gridMesh,
  gridPoints,
  instanceOnPoints,
  length,
  linePoints,
  mapCurves,
  mapRange,
  maxAxes,
  mergeAll,
  meshGeometry,
  minAxes,
  normalize,
  planeMesh,
  polyline,
  projectOrthographic,
  projectPerspective,
  randomPoints,
  rectanglePoints,
  reflect,
  resampleCurve,
  reverseCurve,
  rotateAxisAngle,
  sampleCubicBezier,
  sampleQuadraticBezier,
  scale,
  scaleAxes,
  spiralPoints,
  starPoints,
  sub,
  subdivideCurve,
  trimCurve,
  transformGeometry,
  triangulateGeometry,
  uvSphere,
  type Color,
  type Geometry,
  type Vector,
} from '@vector-nodes/runtime';

import type { NodeEvaluator, OperatorTable } from './operator.js';

function geometryOf(points: Vector[]): Geometry {
  return { points, curves: [], meshes: [] };
}

const constant: NodeEvaluator = ({ params }) => ({ value: params.value });

const xyzVector =
  (outputName: string): NodeEvaluator =>
  ({ inputs }) => ({
    [outputName]: [inputs.x as number, inputs.y as number, inputs.z as number] satisfies Vector,
  });

const vectorMath: NodeEvaluator = ({ inputs, params }) => {
  const a = inputs.a as Vector;
  const b = inputs.b as Vector;
  const s = inputs.scale as number;
  const zero: Vector = [0, 0, 0];
  switch (params.operation as string) {
    case 'add':
      return { vector: add(a, b), value: 0 };
    case 'subtract':
      return { vector: sub(a, b), value: 0 };
    case 'multiply':
      return { vector: scaleAxes(a, b), value: 0 };
    case 'divide':
      return { vector: divideAxes(a, b), value: 0 };
    case 'scale':
      return { vector: scale(a, s), value: 0 };
    case 'cross':
      return { vector: cross(a, b), value: 0 };
    case 'normalize':
      return { vector: normalize(a), value: 0 };
    case 'min':
      return { vector: minAxes(a, b), value: 0 };
    case 'max':
      return { vector: maxAxes(a, b), value: 0 };
    case 'reflect':
      return { vector: reflect(a, b), value: 0 };
    case 'rotate':
      // `a` rotated around the axis `b` by `scale` radians (issue #118).
      return { vector: rotateAxisAngle(a, b, s), value: 0 };
    case 'dot':
      return { vector: zero, value: dot(a, b) };
    case 'length':
      return { vector: zero, value: length(a) };
    case 'distance':
      return { vector: zero, value: distance(a, b) };
    default:
      throw new Error(`Unknown VectorMath operation "${params.operation}".`);
  }
};

/** Point-source nodes share these outputs: the bundle and the raw field. */
const pointsResult = (points: Vector[]) => ({ geometry: geometryOf(points), points });

const pointGrid: NodeEvaluator = ({ params }) =>
  pointsResult(
    gridPoints(
      params.countX as number,
      params.countY as number,
      params.spacingX as number,
      params.spacingY as number,
    ),
  );

const pointLine: NodeEvaluator = ({ params }) =>
  pointsResult(linePoints(params.start as Vector, params.end as Vector, params.count as number));

const pointCircle: NodeEvaluator = ({ params }) =>
  pointsResult(circlePoints(params.radius as number, params.count as number));

const pointRandom: NodeEvaluator = ({ params }) =>
  pointsResult(
    randomPoints(
      params.count as number,
      params.min as Vector,
      params.max as Vector,
      params.seed as number,
    ),
  );

const vectorArray: NodeEvaluator = ({ params }) => ({
  vectors: fromList(params.values as Vector[]),
});

const project: NodeEvaluator = ({ inputs, params }) => {
  const geo = inputs.geometry as Geometry;
  const distanceParam = params.distance as number;
  const fn =
    (params.mode as string) === 'perspective'
      ? (p: Vector) => projectPerspective(p, distanceParam)
      : (p: Vector) => projectOrthographic(p);
  return { geometry: transformGeometry(geo, fn) };
};

const translate: NodeEvaluator = ({ inputs }) => {
  const geo = inputs.geometry as Geometry;
  const offset = inputs.offset as Vector;
  return { geometry: transformGeometry(geo, (p) => add(p, offset)) };
};

const bezierCurve: NodeEvaluator = ({ inputs, params }) => {
  const points = sampleCubicBezier(
    inputs.p0 as Vector,
    inputs.p1 as Vector,
    inputs.p2 as Vector,
    inputs.p3 as Vector,
    params.segments as number,
  );
  const geometry: Geometry = {
    points,
    curves: [{ points, closed: false }],
    meshes: [],
  };
  return { geometry, points };
};

const rotateGeometry: NodeEvaluator = ({ inputs }) => {
  const geo = inputs.geometry as Geometry;
  const axis = inputs.axis as Vector;
  const angle = inputs.angle as number;
  return { geometry: transformGeometry(geo, (p) => rotateAxisAngle(p, axis, angle)) };
};

const scaleGeometry: NodeEvaluator = ({ inputs }) => {
  const geo = inputs.geometry as Geometry;
  const factor = inputs.factor as Vector;
  return { geometry: transformGeometry(geo, (p) => scaleAxes(p, factor)) };
};

const circleCurveNode: NodeEvaluator = ({ params }) => ({
  geometry: curveGeometry(circleCurve(params.radius as number, params.count as number)),
});

const polylineNode: NodeEvaluator = ({ inputs, params }) => ({
  geometry: curveGeometry(polyline(inputs.points as Vector[], params.closed as boolean)),
});

// Curve primitives (issue #114): point-list generators wrapped as single curves.
const starCurveNode: NodeEvaluator = ({ inputs }) => ({
  geometry: curveGeometry(
    polyline(
      starPoints(
        inputs.points as number,
        inputs.innerRadius as number,
        inputs.outerRadius as number,
      ),
      true,
    ),
  ),
});

const arcCurveNode: NodeEvaluator = ({ inputs }) => ({
  geometry: curveGeometry(
    polyline(
      arcPoints(
        inputs.radius as number,
        inputs.startAngle as number,
        inputs.sweepAngle as number,
        inputs.segments as number,
      ),
    ),
  ),
});

const spiralCurveNode: NodeEvaluator = ({ inputs }) => ({
  geometry: curveGeometry(
    polyline(
      spiralPoints(
        inputs.turns as number,
        inputs.startRadius as number,
        inputs.endRadius as number,
        inputs.height as number,
        inputs.segments as number,
      ),
    ),
  ),
});

const rectangleCurveNode: NodeEvaluator = ({ inputs }) => ({
  geometry: curveGeometry(
    polyline(rectanglePoints(inputs.width as number, inputs.height as number), true),
  ),
});

// Curve sampling ops (issue #115): per-curve rewrites; points/meshes pass through.
const resampleCurveNode: NodeEvaluator = ({ inputs }) => ({
  geometry: mapCurves(inputs.geometry as Geometry, (c) => resampleCurve(c, inputs.count as number)),
});

const subdivideCurveNode: NodeEvaluator = ({ inputs }) => ({
  geometry: mapCurves(inputs.geometry as Geometry, (c) => subdivideCurve(c, inputs.cuts as number)),
});

const reverseCurveNode: NodeEvaluator = ({ inputs }) => ({
  geometry: mapCurves(inputs.geometry as Geometry, reverseCurve),
});

const trimCurveNode: NodeEvaluator = ({ inputs }) => ({
  geometry: mapCurves(inputs.geometry as Geometry, (c) =>
    trimCurve(c, inputs.start as number, inputs.end as number),
  ),
});

// Rounded corners (issue #116).
const filletCurveNode: NodeEvaluator = ({ inputs }) => ({
  geometry: mapCurves(inputs.geometry as Geometry, (c) =>
    filletCurve(c, inputs.radius as number, inputs.resolution as number),
  ),
});

// Closed curves → mesh faces (issue #117).
const fillCurveNode: NodeEvaluator = ({ inputs }) => ({
  geometry: fillCurves(inputs.geometry as Geometry),
});

// Mirrors BezierCurve: the sampled points are exposed as a field output too.
const quadraticBezierNode: NodeEvaluator = ({ inputs }) => {
  const points = sampleQuadraticBezier(
    inputs.p0 as Vector,
    inputs.p1 as Vector,
    inputs.p2 as Vector,
    inputs.segments as number,
  );
  const geometry: Geometry = {
    points,
    curves: [{ points, closed: false }],
    meshes: [],
  };
  return { geometry, points };
};

// Merge concatenates its array `geometry` input — every connection into the one
// handle, in order (empty geometry when none are connected) — issue #99.
const merge: NodeEvaluator = ({ inputs }) => ({
  geometry: mergeAll(inputs.geometry as Geometry[]),
});

const colorGeometryNode: NodeEvaluator = ({ inputs }) => ({
  geometry: colorGeometry(inputs.geometry as Geometry, inputs.color as Color),
});

const boundingBoxNode: NodeEvaluator = ({ inputs }) => ({
  geometry: { points: boundingBox(inputs.geometry as Geometry), curves: [], meshes: [] },
});

const instanceOnPointsNode: NodeEvaluator = ({ inputs }) => ({
  geometry: instanceOnPoints(inputs.geometry as Geometry, inputs.points as Vector[]),
});

const mathFloat: NodeEvaluator = ({ inputs, params }) => {
  const a = inputs.a as number;
  const b = inputs.b as number;
  switch (params.operation as string) {
    case 'add':
      return { value: a + b };
    case 'subtract':
      return { value: a - b };
    case 'multiply':
      return { value: a * b };
    case 'divide':
      return { value: a / b };
    case 'min':
      return { value: Math.min(a, b) };
    case 'max':
      return { value: Math.max(a, b) };
    case 'power':
      return { value: Math.pow(a, b) };
    case 'sine':
      return { value: Math.sin(a) };
    case 'cosine':
      return { value: Math.cos(a) };
    case 'tangent':
      return { value: Math.tan(a) };
    case 'atan2':
      return { value: Math.atan2(a, b) };
    case 'sqrt':
      return { value: Math.sqrt(a) };
    case 'abs':
      return { value: Math.abs(a) };
    case 'floor':
      return { value: Math.floor(a) };
    case 'ceil':
      return { value: Math.ceil(a) };
    case 'round':
      return { value: Math.round(a) };
    case 'modulo':
      return { value: a % b };
    case 'log':
      return { value: Math.log(a) };
    case 'exp':
      return { value: Math.exp(a) };
    case 'sign':
      return { value: Math.sign(a) };
    default:
      throw new Error(`Unknown MathFloat operation "${params.operation}".`);
  }
};

const mapRangeNode: NodeEvaluator = ({ inputs }) => ({
  value: mapRange(
    inputs.value as number,
    inputs.fromMin as number,
    inputs.fromMax as number,
    inputs.toMin as number,
    inputs.toMax as number,
  ),
});

const clampNode: NodeEvaluator = ({ inputs }) => ({
  value: clamp(inputs.value as number, inputs.min as number, inputs.max as number),
});

const planeMeshNode: NodeEvaluator = ({ params }) => ({
  geometry: meshGeometry(planeMesh(params.width as number, params.height as number)),
});
const boxMeshNode: NodeEvaluator = ({ params }) => ({
  geometry: meshGeometry(
    boxMesh(params.width as number, params.height as number, params.depth as number),
  ),
});
const gridMeshNode: NodeEvaluator = ({ params }) => ({
  geometry: meshGeometry(
    gridMesh(
      params.countX as number,
      params.countY as number,
      params.sizeX as number,
      params.sizeY as number,
    ),
  ),
});
const uvSphereNode: NodeEvaluator = ({ params }) => ({
  geometry: meshGeometry(
    uvSphere(params.radius as number, params.segments as number, params.rings as number),
  ),
});
const cylinderMeshNode: NodeEvaluator = ({ params }) => ({
  geometry: meshGeometry(
    cylinderMesh(params.radius as number, params.height as number, params.segments as number),
  ),
});
const coneMeshNode: NodeEvaluator = ({ params }) => ({
  geometry: meshGeometry(
    coneMesh(params.radius as number, params.height as number, params.segments as number),
  ),
});

const triangulateNode: NodeEvaluator = ({ inputs }) => ({
  geometry: triangulateGeometry(inputs.geometry as Geometry),
});

const parameter: NodeEvaluator = ({ params, parameters }) => ({
  value: parameters[params.name as string],
});

/** Interpreter operators for the basic node set (paired with core definitions). */
export const BASIC_OPERATORS: OperatorTable = {
  ConstFloat: constant,
  ConstInteger: constant,
  ConstBoolean: constant,
  ConstVector: constant,
  ConstColor: constant,
  ConstString: constant,
  Point: xyzVector('point'),
  Vector: xyzVector('vector'),
  CombineXYZ: xyzVector('vector'),
  SeparateXYZ: ({ inputs }) => {
    const v = inputs.vector as Vector;
    return { x: v[0], y: v[1], z: v[2] };
  },
  VectorMath: vectorMath,
  VectorArray: vectorArray,
  PointGrid: pointGrid,
  PointLine: pointLine,
  PointCircle: pointCircle,
  PointRandom: pointRandom,
  Project: project,
  Translate: translate,
  BezierCurve: bezierCurve,
  RotateGeometry: rotateGeometry,
  ScaleGeometry: scaleGeometry,
  CircleCurve: circleCurveNode,
  Polyline: polylineNode,
  StarCurve: starCurveNode,
  ArcCurve: arcCurveNode,
  SpiralCurve: spiralCurveNode,
  RectangleCurve: rectangleCurveNode,
  QuadraticBezier: quadraticBezierNode,
  ResampleCurve: resampleCurveNode,
  SubdivideCurve: subdivideCurveNode,
  ReverseCurve: reverseCurveNode,
  TrimCurve: trimCurveNode,
  FilletCurve: filletCurveNode,
  FillCurve: fillCurveNode,
  MergeGeometry: merge,
  ColorGeometry: colorGeometryNode,
  BoundingBox: boundingBoxNode,
  InstanceOnPoints: instanceOnPointsNode,
  MathFloat: mathFloat,
  MapRange: mapRangeNode,
  Clamp: clampNode,
  PlaneMesh: planeMeshNode,
  BoxMesh: boxMeshNode,
  GridMesh: gridMeshNode,
  UVSphere: uvSphereNode,
  CylinderMesh: cylinderMeshNode,
  ConeMesh: coneMeshNode,
  TriangulateMesh: triangulateNode,
  ...Object.fromEntries(PARAMETER_NODE_TYPES.map((type) => [type, parameter])),
};
