import {
  createGraph,
  GraphValidationError,
  NodeRegistry,
  type NodeDefinition,
} from '@vector-nodes/core';
import { circlePoints, translatePoints, type Geometry, type Vector } from '@vector-nodes/runtime';
import { describe, expect, it, vi } from 'vitest';

import { evaluateGraph, MissingOperatorError } from './interpreter';
import type { OperatorTable } from './operator';

const DEFS: NodeDefinition[] = [
  {
    type: 'Circle',
    inputs: [],
    outputs: [{ name: 'geometry', type: 'Geometry' }],
    params: [
      { name: 'radius', type: 'Float', default: 1 },
      { name: 'count', type: 'Integer', default: 4 },
    ],
  },
  {
    type: 'Translate',
    inputs: [
      { name: 'geometry', type: 'Geometry' },
      { name: 'offset', type: 'Vector', default: [0, 0, 0] },
    ],
    outputs: [{ name: 'geometry', type: 'Geometry' }],
    params: [],
  },
  {
    type: 'Combine',
    inputs: [
      { name: 'a', type: 'Geometry' },
      { name: 'b', type: 'Geometry' },
    ],
    outputs: [{ name: 'geometry', type: 'Geometry' }],
    params: [],
  },
  {
    type: 'OutputGeometry',
    inputs: [{ name: 'geometry', type: 'Geometry' }],
    outputs: [],
    params: [],
  },
];

function registry(): NodeRegistry {
  return new NodeRegistry(DEFS);
}

function geom(points: Vector[]): Geometry {
  return { points, curves: [], meshes: [] };
}

const operators: OperatorTable = {
  Circle: ({ params }) => ({
    geometry: geom(circlePoints(params.radius as number, params.count as number)),
  }),
  Translate: ({ inputs }) => {
    const g = inputs.geometry as Geometry;
    return {
      geometry: geom(translatePoints(g.points, inputs.offset as Vector)),
    };
  },
  Combine: ({ inputs }) => ({ geometry: inputs.a }),
};

describe('evaluateGraph', () => {
  it('evaluates a sample graph to the expected geometry', () => {
    const graph = createGraph({
      nodes: [
        { id: 'c', type: 'Circle', params: { radius: 2, count: 4 } },
        { id: 't', type: 'Translate', params: {} },
        { id: 'out', type: 'OutputGeometry' },
      ],
      links: [
        { from: ['c', 'geometry'], to: ['t', 'geometry'] },
        { from: ['t', 'geometry'], to: ['out', 'geometry'] },
      ],
    });
    // Translate.offset is unconnected, so it uses its default [0, 0, 0].
    const result = evaluateGraph(graph, registry(), operators);
    const out = result.output.geometry as Geometry;
    const expected = translatePoints(circlePoints(2, 4), [0, 0, 0]);
    out.points.forEach((p, i) => {
      p.forEach((c, axis) => expect(c).toBeCloseTo(expected[i]![axis]!, 12));
    });
  });

  it('uses an input socket default when unconnected', () => {
    const graph = createGraph({
      nodes: [
        { id: 'c', type: 'Circle', params: { radius: 1, count: 3 } },
        { id: 't', type: 'Translate' },
        { id: 'out', type: 'OutputGeometry' },
      ],
      links: [
        { from: ['c', 'geometry'], to: ['t', 'geometry'] },
        { from: ['t', 'geometry'], to: ['out', 'geometry'] },
      ],
    });
    // Translate.offset is unconnected, so its default [0,0,0] is used: identity.
    const result = evaluateGraph(graph, registry(), operators);
    const out = result.output.geometry as Geometry;
    expect(out.points).toHaveLength(3);
  });

  it('evaluates each node exactly once (memoized within a run)', () => {
    const circleSpy = vi.fn(operators.Circle);
    const ops: OperatorTable = { ...operators, Circle: circleSpy };
    const graph = createGraph({
      nodes: [
        { id: 'c', type: 'Circle', params: { radius: 1, count: 4 } },
        { id: 'm', type: 'Combine' },
        { id: 'out', type: 'OutputGeometry' },
      ],
      links: [
        { from: ['c', 'geometry'], to: ['m', 'a'] },
        { from: ['c', 'geometry'], to: ['m', 'b'] },
        { from: ['m', 'geometry'], to: ['out', 'geometry'] },
      ],
    });
    evaluateGraph(graph, registry(), ops);
    expect(circleSpy).toHaveBeenCalledTimes(1);
  });

  it('exposes per-node outputs', () => {
    const graph = createGraph({
      nodes: [
        { id: 'c', type: 'Circle', params: { radius: 1, count: 4 } },
        { id: 'out', type: 'OutputGeometry' },
      ],
      links: [{ from: ['c', 'geometry'], to: ['out', 'geometry'] }],
    });
    const result = evaluateGraph(graph, registry(), operators);
    expect(result.nodeOutputs.get('c')).toBeDefined();
  });
});

describe('evaluateGraph — errors', () => {
  it('validates the graph first and throws on invalid graphs', () => {
    const graph = createGraph({ nodes: [{ id: 'c', type: 'Circle' }] });
    expect(() => evaluateGraph(graph, registry(), operators)).toThrow(GraphValidationError);
  });

  it('throws MissingOperatorError when a needed node has no operator', () => {
    const graph = createGraph({
      nodes: [
        { id: 'c', type: 'Circle', params: { radius: 1, count: 4 } },
        { id: 'out', type: 'OutputGeometry' },
      ],
      links: [{ from: ['c', 'geometry'], to: ['out', 'geometry'] }],
    });
    expect(() => evaluateGraph(graph, registry(), {})).toThrow(MissingOperatorError);
  });
});
