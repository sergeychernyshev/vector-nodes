import {
  BASIC_NODE_DEFINITIONS,
  createBasicRegistry,
  createGraph,
  parameterNodeType,
} from '@vector-nodes/core';
import { circlePoints, gridPoints, type Geometry, type Vector } from '@vector-nodes/runtime';
import { describe, expect, it } from 'vitest';

import { BASIC_OPERATORS } from './basic-nodes';
import { evaluateGraph } from './interpreter';
import type { EvaluatorContext, NodeEvaluator } from './operator';

function run(type: string, ctx: Partial<EvaluatorContext> = {}): Record<string, unknown> {
  const evaluator = BASIC_OPERATORS[type] as NodeEvaluator;
  return evaluator({
    inputs: {},
    params: {},
    parameters: {},
    node: { id: 'n', type },
    ...ctx,
  });
}

describe('operator coverage', () => {
  it('provides an operator for every definition except OutputGeometry', () => {
    for (const def of BASIC_NODE_DEFINITIONS) {
      if (def.type === 'OutputGeometry') continue;
      expect(BASIC_OPERATORS[def.type], def.type).toBeDefined();
    }
  });
});

describe('constants', () => {
  it('echo their value param', () => {
    expect(run('ConstFloat', { params: { value: 5 } })).toEqual({ value: 5 });
    expect(run('ConstVector', { params: { value: [1, 2, 3] } })).toEqual({
      value: [1, 2, 3],
    });
    expect(run('ConstString', { params: { value: 'hi' } })).toEqual({
      value: 'hi',
    });
  });
});

describe('vector construction', () => {
  it('Point / Vector / CombineXYZ build a vector from x,y,z', () => {
    const inputs = { x: 1, y: 2, z: 3 };
    expect(run('Point', { inputs })).toEqual({ point: [1, 2, 3] });
    expect(run('Vector', { inputs })).toEqual({ vector: [1, 2, 3] });
    expect(run('CombineXYZ', { inputs })).toEqual({ vector: [1, 2, 3] });
  });

  it('SeparateXYZ decomposes a vector', () => {
    expect(run('SeparateXYZ', { inputs: { vector: [4, 5, 6] } })).toEqual({
      x: 4,
      y: 5,
      z: 6,
    });
  });
});

describe('VectorMath', () => {
  const a: Vector = [1, 0, 0];
  const b: Vector = [0, 1, 0];

  it('handles vector-valued operations', () => {
    expect(run('VectorMath', { inputs: { a, b }, params: { operation: 'add' } })).toEqual({
      vector: [1, 1, 0],
      value: 0,
    });
    expect(run('VectorMath', { inputs: { a, b }, params: { operation: 'cross' } })).toEqual({
      vector: [0, 0, 1],
      value: 0,
    });
    expect(
      run('VectorMath', {
        inputs: { a, b: [0, 0, 0], scale: 3 },
        params: { operation: 'scale' },
      }),
    ).toEqual({ vector: [3, 0, 0], value: 0 });
  });

  it('handles scalar-valued operations', () => {
    expect(run('VectorMath', { inputs: { a, b }, params: { operation: 'dot' } })).toEqual({
      vector: [0, 0, 0],
      value: 0,
    });
    expect(
      run('VectorMath', {
        inputs: { a: [3, 4, 0], b: [0, 0, 0] },
        params: { operation: 'length' },
      }),
    ).toEqual({ vector: [0, 0, 0], value: 5 });
  });

  it('throws on an unknown operation', () => {
    expect(() => run('VectorMath', { inputs: { a, b }, params: { operation: 'bogus' } })).toThrow(
      /Unknown VectorMath operation/,
    );
  });
});

describe('arrays and geometry sources', () => {
  it('VectorArray copies its values', () => {
    expect(run('VectorArray', { params: { values: [[1, 2, 3]] } })).toEqual({
      vectors: [[1, 2, 3]],
    });
  });

  it('PointGrid matches the runtime op', () => {
    const out = run('PointGrid', {
      params: { countX: 2, countY: 2, spacingX: 1, spacingY: 1 },
    });
    expect((out.geometry as Geometry).points).toEqual(gridPoints(2, 2, 1));
    expect(out.points).toEqual(gridPoints(2, 2, 1));
  });

  it('PointCircle matches the runtime op', () => {
    const out = run('PointCircle', {
      params: { radius: 2, count: 6 },
    });
    expect((out.geometry as Geometry).points).toEqual(circlePoints(2, 6));
  });
});

describe('geometry transforms', () => {
  const geom = (points: Vector[]): Geometry => ({
    points,
    curves: [],
    meshes: [],
  });

  it('Translate offsets every point', () => {
    const out = run('Translate', {
      inputs: { geometry: geom([[0, 0, 0]]), offset: [1, 2, 3] },
    });
    expect((out.geometry as Geometry).points).toEqual([[1, 2, 3]]);
  });

  it('Project orthographic drops z', () => {
    const out = run('Project', {
      inputs: { geometry: geom([[3, 4, 5]]) },
      params: { mode: 'orthographic', distance: 10 },
    });
    expect((out.geometry as Geometry).points).toEqual([[3, 4, 0]]);
  });

  it('BezierCurve samples a curve into the bundle', () => {
    const out = run('BezierCurve', {
      inputs: { p0: [0, 0, 0], p1: [1, 0, 0], p2: [2, 0, 0], p3: [3, 0, 0] },
      params: { segments: 2 },
    });
    const geo = out.geometry as Geometry;
    expect(geo.curves).toHaveLength(1);
    expect(geo.curves[0]!.points).toHaveLength(3);
  });
});

describe('curve primitives (issue #114)', () => {
  const curveOf = (out: Record<string, unknown>) => (out.geometry as Geometry).curves[0]!;

  it('StarCurve builds a closed star with 2× points vertices', () => {
    const curve = curveOf(
      run('StarCurve', { inputs: { points: 5, innerRadius: 0.5, outerRadius: 1 } }),
    );
    expect(curve.closed).toBe(true);
    expect(curve.points).toHaveLength(10);
  });

  it('ArcCurve builds an open arc of segments + 1 points', () => {
    const curve = curveOf(
      run('ArcCurve', {
        inputs: { radius: 1, startAngle: 0, sweepAngle: Math.PI, segments: 8 },
      }),
    );
    expect(curve.closed).toBe(false);
    expect(curve.points).toHaveLength(9);
  });

  it('SpiralCurve rises to its height', () => {
    const curve = curveOf(
      run('SpiralCurve', {
        inputs: { turns: 2, startRadius: 0, endRadius: 1, height: 3, segments: 10 },
      }),
    );
    expect(curve.closed).toBe(false);
    expect(curve.points.at(-1)![2]).toBeCloseTo(3, 9);
  });

  it('RectangleCurve builds a closed quad', () => {
    const curve = curveOf(run('RectangleCurve', { inputs: { width: 2, height: 1 } }));
    expect(curve.closed).toBe(true);
    expect(curve.points).toEqual([
      [-1, -0.5, 0],
      [1, -0.5, 0],
      [1, 0.5, 0],
      [-1, 0.5, 0],
    ]);
  });

  it('curve sampling ops rewrite curves and pass points through (issue #115)', () => {
    const bundle: Geometry = {
      points: [[5, 5, 5]],
      curves: [
        {
          points: [
            [0, 0, 0],
            [1, 0, 0],
            [1, 1, 0],
          ],
          closed: false,
        },
      ],
      meshes: [],
    };
    const resampled = run('ResampleCurve', { inputs: { geometry: bundle, count: 5 } })
      .geometry as Geometry;
    expect(resampled.curves[0]!.points).toHaveLength(5);
    expect(resampled.points).toEqual([[5, 5, 5]]);

    const subdivided = run('SubdivideCurve', { inputs: { geometry: bundle, cuts: 1 } })
      .geometry as Geometry;
    expect(subdivided.curves[0]!.points).toHaveLength(5);

    const reversed = run('ReverseCurve', { inputs: { geometry: bundle } }).geometry as Geometry;
    expect(reversed.curves[0]!.points[0]).toEqual([1, 1, 0]);

    const trimmed = run('TrimCurve', { inputs: { geometry: bundle, start: 0.25, end: 0.75 } })
      .geometry as Geometry;
    expect(trimmed.curves[0]!.points[0]).toEqual([0.5, 0, 0]);
  });

  it('QuadraticBezier mirrors BezierCurve with a points field output', () => {
    const out = run('QuadraticBezier', {
      inputs: { p0: [-1, 0, 0], p1: [0, 1, 0], p2: [1, 0, 0], segments: 2 },
    });
    const geo = out.geometry as Geometry;
    expect(geo.curves[0]!.points).toEqual([
      [-1, 0, 0],
      [0, 0.5, 0],
      [1, 0, 0],
    ]);
    expect(out.points).toEqual(geo.curves[0]!.points);
  });
});

describe('Parameter nodes', () => {
  it('read the bound network parameter', () => {
    const ctx = {
      params: { name: 'radius' },
      parameters: { radius: 7 },
    };
    expect(run('ParameterFloat', ctx)).toEqual({ value: 7 });
  });
});

describe('end-to-end evaluation with the basic registry', () => {
  it('evaluates PointCircle -> Translate -> Output', () => {
    const graph = createGraph({
      nodes: [
        {
          id: 'pa',
          type: 'PointCircle',
          params: { radius: 1, count: 4 },
        },
        { id: 't', type: 'Translate', params: {} },
        { id: 'out', type: 'OutputGeometry' },
      ],
      links: [
        { from: ['pa', 'geometry'], to: ['t', 'geometry'] },
        { from: ['t', 'geometry'], to: ['out', 'geometry'] },
      ],
    });
    const result = evaluateGraph(graph, createBasicRegistry(), BASIC_OPERATORS);
    const out = result.output.geometry as Geometry;
    expect(out.points).toEqual(circlePoints(1, 4));
  });

  it('threads a network parameter through a Parameter node', () => {
    const graph = createGraph({
      parameters: [{ id: 'shift', type: 'Vector', default: [0, 0, 0] }],
      nodes: [
        {
          id: 'pa',
          type: 'PointCircle',
          params: { radius: 1, count: 3 },
        },
        { id: 'p', type: parameterNodeType('Vector'), params: { name: 'shift' } },
        { id: 't', type: 'Translate' },
        { id: 'out', type: 'OutputGeometry' },
      ],
      links: [
        { from: ['pa', 'geometry'], to: ['t', 'geometry'] },
        { from: ['p', 'value'], to: ['t', 'offset'] },
        { from: ['t', 'geometry'], to: ['out', 'geometry'] },
      ],
    });
    const result = evaluateGraph(graph, createBasicRegistry(), BASIC_OPERATORS, {
      shift: [10, 0, 0],
    });
    const out = result.output.geometry as Geometry;
    expect(out.points[0]).toEqual([11, 0, 0]); // circle point [1,0,0] + [10,0,0]
  });
});

describe('array inputs collect connections (issue #99)', () => {
  it('Merge concatenates every connection into its single geometry input', () => {
    const graph = createGraph({
      nodes: [
        { id: 'a', type: 'PointCircle', params: { radius: 1, count: 3 } },
        { id: 'b', type: 'PointCircle', params: { radius: 2, count: 4 } },
        { id: 'm', type: 'MergeGeometry' },
        { id: 'out', type: 'OutputGeometry' },
      ],
      links: [
        { from: ['a', 'geometry'], to: ['m', 'geometry'] },
        { from: ['b', 'geometry'], to: ['m', 'geometry'] },
        { from: ['m', 'geometry'], to: ['out', 'geometry'] },
      ],
    });
    const out = evaluateGraph(graph, createBasicRegistry(), BASIC_OPERATORS).output
      .geometry as Geometry;
    expect(out.points).toHaveLength(7); // 3 + 4
  });

  it('Merge with no connections yields empty geometry', () => {
    const graph = createGraph({
      nodes: [
        { id: 'm', type: 'MergeGeometry' },
        { id: 'out', type: 'OutputGeometry' },
      ],
      links: [{ from: ['m', 'geometry'], to: ['out', 'geometry'] }],
    });
    const out = evaluateGraph(graph, createBasicRegistry(), BASIC_OPERATORS).output
      .geometry as Geometry;
    expect(out).toEqual({ points: [], curves: [], meshes: [] });
  });

  it('a single field source passes through to an array input (not nested)', () => {
    // PointGrid.points (Vector field) → Polyline.points: one connection supplies
    // the whole array, so the polyline has all the grid points.
    const graph = createGraph({
      nodes: [
        { id: 'g', type: 'PointGrid', params: { countX: 2, countY: 2 } },
        { id: 'pl', type: 'Polyline', params: { closed: false } },
        { id: 'out', type: 'OutputGeometry' },
      ],
      links: [
        { from: ['g', 'points'], to: ['pl', 'points'] },
        { from: ['pl', 'geometry'], to: ['out', 'geometry'] },
      ],
    });
    const out = evaluateGraph(graph, createBasicRegistry(), BASIC_OPERATORS).output
      .geometry as Geometry;
    expect(out.curves[0]!.points).toHaveLength(4); // 2×2 grid, passed through
  });
});
