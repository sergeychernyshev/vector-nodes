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

describe('expanded operations (issue #118)', () => {
  it('the split Math & Trig nodes evaluate with their named inputs (issue #163)', () => {
    const cases: [string, Record<string, number>, number][] = [
      ['MathAdd', { a: 2, b: 3 }, 5],
      ['MathSubtract', { a: 2, b: 3 }, -1],
      ['MathMultiply', { a: 2, b: 3 }, 6],
      ['MathDivide', { a: 6, b: 3 }, 2],
      ['MathModulo', { a: 7, b: 3 }, 1],
      ['MathMin', { a: 2, b: 3 }, 2],
      ['MathMax', { a: 2, b: 3 }, 3],
      ['MathPower', { base: 2, exponent: 10 }, 1024],
      ['MathAtan2', { y: 1, x: 1 }, Math.PI / 4],
      ['MathSine', { angle: Math.PI / 2 }, 1],
      ['MathCosine', { angle: 0 }, 1],
      ['MathTangent', { angle: 0 }, 0],
      ['MathSqrt', { value: 9 }, 3],
      ['MathAbsolute', { value: -4 }, 4],
      ['MathFloor', { value: 1.7 }, 1],
      ['MathCeil', { value: 1.2 }, 2],
      ['MathRound', { value: 1.5 }, 2],
      ['MathLog', { value: Math.E }, 1],
      ['MathExp', { value: 0 }, 1],
      ['MathSign', { value: -9 }, -1],
    ];
    for (const [type, inputs, expected] of cases) {
      const out = run(type, { inputs });
      expect(out.value as number, type).toBeCloseTo(expected, 9);
    }
  });

  it('Pi emits the π constant (issue #163)', () => {
    expect(run('Pi').value).toBe(Math.PI);
  });

  it('VectorMath handles the component-wise and geometric additions', () => {
    const v = (op: string, inputs: Record<string, unknown>) =>
      run('VectorMath', { inputs, params: { operation: op } }).vector as Vector;
    expect(v('multiply', { a: [1, 2, 3], b: [2, 3, 4] })).toEqual([2, 6, 12]);
    expect(v('divide', { a: [4, 9, 8], b: [2, 3, 4] })).toEqual([2, 3, 2]);
    expect(v('min', { a: [1, 5, 3], b: [2, 4, 3] })).toEqual([1, 4, 3]);
    expect(v('max', { a: [1, 5, 3], b: [2, 4, 3] })).toEqual([2, 5, 3]);
    expect(v('reflect', { a: [1, -1, 0], b: [0, 1, 0] })).toEqual([1, 1, 0]);
    const rotated = v('rotate', { a: [1, 0, 0], b: [0, 0, 1], scale: Math.PI / 2 });
    expect(rotated[0]).toBeCloseTo(0, 9);
    expect(rotated[1]).toBeCloseTo(1, 9);
  });
});

describe('Time (issue #138)', () => {
  it('derives milliseconds and an fps-scaled frame from the time parameter', () => {
    const out = run('Time', { params: { fps: 30 }, parameters: { time: 2 } });
    expect(out).toEqual({ seconds: 2, milliseconds: 2000, frame: 60 });
  });

  it('floors the frame index between whole frames', () => {
    const out = run('Time', { params: { fps: 24 }, parameters: { time: 1.5 } });
    expect(out.frame).toBe(36);
    const mid = run('Time', { params: { fps: 24 }, parameters: { time: 1.51 } });
    expect(mid.frame).toBe(36); // 36.24 floored
  });

  it('defaults to time zero when the parameter is absent', () => {
    expect(run('Time', { params: { fps: 60 } })).toEqual({
      seconds: 0,
      milliseconds: 0,
      frame: 0,
    });
  });
});

describe('RandomValue (issue #119)', () => {
  const inputs = { min: 2, max: 5, seed: 9, count: 4 };

  it('is deterministic for a seed and respects the range', () => {
    const a = run('RandomValue', { inputs });
    const b = run('RandomValue', { inputs });
    expect(a).toEqual(b);
    expect(a.value as number).toBeGreaterThanOrEqual(2);
    expect(a.value as number).toBeLessThan(5);
    expect(Number.isInteger(a.integer)).toBe(true);
    for (const c of a.vector as Vector) {
      expect(c).toBeGreaterThanOrEqual(2);
      expect(c).toBeLessThan(5);
    }
  });

  it('sizes the array outputs by count and leads with the scalars', () => {
    const out = run('RandomValue', { inputs });
    expect(out.values).toHaveLength(4);
    expect(out.integers).toHaveLength(4);
    expect(out.vectors).toHaveLength(4);
    expect((out.values as number[])[0]).toBe(out.value);
    expect((out.vectors as Vector[])[0]).toEqual(out.vector);
  });

  it('reshuffles with the seed', () => {
    const a = run('RandomValue', { inputs });
    const b = run('RandomValue', { inputs: { ...inputs, seed: 10 } });
    expect(a.values).not.toEqual(b.values);
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

  it('FilletCurve rounds corners through the bundle (issue #116)', () => {
    const bundle: Geometry = {
      points: [],
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
    const out = run('FilletCurve', { inputs: { geometry: bundle, radius: 0.5, resolution: 2 } })
      .geometry as Geometry;
    expect(out.curves[0]!.points).toHaveLength(5);
    expect(out.curves[0]!.points[1]).toEqual([0.5, 0, 0]);
  });

  it('FillCurve converts closed curves to meshes (issue #117)', () => {
    const bundle: Geometry = {
      points: [],
      curves: [
        {
          points: [
            [0, 0, 0],
            [1, 0, 0],
            [1, 1, 0],
            [0, 1, 0],
          ],
          closed: true,
        },
      ],
      meshes: [],
    };
    const out = run('FillCurve', { inputs: { geometry: bundle } }).geometry as Geometry;
    expect(out.curves).toHaveLength(0);
    expect(out.meshes).toHaveLength(1);
    expect(out.meshes[0]!.faces).toHaveLength(2);
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

describe('array inputs merge field sources flat (issue #146)', () => {
  it('flattens multiple field sources into one collective array', () => {
    // Two point fields wired into Polyline.points are merged, not nested: the
    // polyline gets every point from both, in link order.
    const graph = createGraph({
      nodes: [
        { id: 'g', type: 'PointGrid', params: { countX: 2, countY: 2 } }, // 4 points
        { id: 'c', type: 'PointCircle', params: { radius: 1, count: 3 } }, // 3 points
        { id: 'pl', type: 'Polyline', params: { closed: false } },
        { id: 'out', type: 'OutputGeometry' },
      ],
      links: [
        { from: ['g', 'points'], to: ['pl', 'points'] },
        { from: ['c', 'points'], to: ['pl', 'points'] },
        { from: ['pl', 'geometry'], to: ['out', 'geometry'] },
      ],
    });
    const out = evaluateGraph(graph, createBasicRegistry(), BASIC_OPERATORS).output
      .geometry as Geometry;
    const points = out.curves[0]!.points;
    expect(points).toHaveLength(7); // 4 + 3, flat
    // Every element is a Vector (a 3-number tuple), never a nested array.
    expect(points.every((p) => p.length === 3 && p.every((n) => typeof n === 'number'))).toBe(true);
  });

  it('mixes a single value and a field source into one array', () => {
    // A single Vector plus a point field feed Polyline.points: the lone vector
    // contributes one element, the field is spread in after it.
    const graph = createGraph({
      nodes: [
        { id: 'p', type: 'Point', inputDefaults: { x: 9, y: 9, z: 0 } }, // single vector
        { id: 'c', type: 'PointCircle', params: { radius: 1, count: 4 } }, // 4 points
        { id: 'pl', type: 'Polyline', params: { closed: false } },
        { id: 'out', type: 'OutputGeometry' },
      ],
      links: [
        { from: ['p', 'point'], to: ['pl', 'points'] },
        { from: ['c', 'points'], to: ['pl', 'points'] },
        { from: ['pl', 'geometry'], to: ['out', 'geometry'] },
      ],
    });
    const out = evaluateGraph(graph, createBasicRegistry(), BASIC_OPERATORS).output
      .geometry as Geometry;
    const points = out.curves[0]!.points;
    expect(points).toHaveLength(5); // 1 + 4
    expect(points[0]).toEqual([9, 9, 0]); // the single value leads
  });
});
