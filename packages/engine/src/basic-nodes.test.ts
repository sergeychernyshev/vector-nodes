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
