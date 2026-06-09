import { PARAMETER_NODE_TYPES } from '@vector-nodes/core';
import {
  add,
  circlePoints,
  cross,
  distance,
  dot,
  fromList,
  gridPoints,
  length,
  linePoints,
  normalize,
  projectOrthographic,
  projectPerspective,
  randomPoints,
  sampleCubicBezier,
  scale,
  sub,
  type Geometry,
  type Vector,
} from '@vector-nodes/runtime';

import type { NodeEvaluator, OperatorTable } from './operator.js';

function geometryOf(points: Vector[]): Geometry {
  return { points, curves: [], meshes: [] };
}

/** Apply `fn` to every point in a geometry bundle (points, curves, meshes). */
function transformGeometry(geo: Geometry, fn: (p: Vector) => Vector): Geometry {
  return {
    points: geo.points.map(fn),
    curves: geo.curves.map((c) => ({ ...c, points: c.points.map(fn) })),
    meshes: geo.meshes.map((m) => ({ ...m, positions: m.positions.map(fn) })),
  };
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
  ...Object.fromEntries(PARAMETER_NODE_TYPES.map((type) => [type, parameter])),
};
