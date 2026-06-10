import { PARAMETER_NODE_TYPES } from '@vector-nodes/core';
import {
  add,
  boundingBox,
  boxMesh,
  circleCurve,
  circlePoints,
  clamp,
  coneMesh,
  cross,
  curveGeometry,
  cylinderMesh,
  distance,
  dot,
  fromList,
  gridMesh,
  gridPoints,
  instanceOnPoints,
  length,
  linePoints,
  mapRange,
  mergeGeometry,
  meshGeometry,
  normalize,
  planeMesh,
  polyline,
  projectOrthographic,
  projectPerspective,
  randomPoints,
  rotateAxisAngle,
  sampleCubicBezier,
  scale,
  scaleAxes,
  sub,
  transformGeometry,
  triangulateGeometry,
  uvSphere,
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
    case 'scale':
      return { vector: scale(a, s), value: 0 };
    case 'cross':
      return { vector: cross(a, b), value: 0 };
    case 'normalize':
      return { vector: normalize(a), value: 0 };
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

const polylineNode: NodeEvaluator = ({ params }) => ({
  geometry: curveGeometry(polyline(params.points as Vector[], params.closed as boolean)),
});

const merge: NodeEvaluator = ({ inputs }) => ({
  geometry: mergeGeometry(inputs.a as Geometry, inputs.b as Geometry),
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
  MergeGeometry: merge,
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
