import { createGraph, NodeRegistry, type Graph, type NodeDefinition } from '@vector-nodes/core';
import { circlePoints, type Geometry, type Vector } from '@vector-nodes/runtime';
import { describe, expect, it } from 'vitest';

import { Interpreter } from './incremental-interpreter';
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

function geom(points: Vector[]): Geometry {
  return { points, curves: [], meshes: [] };
}

const operators: OperatorTable = {
  Circle: ({ params }) => ({
    geometry: geom(circlePoints(params.radius as number, params.count as number)),
  }),
  Combine: ({ inputs }) => ({ geometry: inputs.a }),
};

/** Two independent Circles (a, b) merged in Combine (m) → Output. */
function diamond(radiusA: number, radiusB: number): Graph {
  return createGraph({
    nodes: [
      { id: 'a', type: 'Circle', params: { radius: radiusA, count: 4 } },
      { id: 'b', type: 'Circle', params: { radius: radiusB, count: 4 } },
      { id: 'm', type: 'Combine' },
      { id: 'out', type: 'OutputGeometry' },
    ],
    links: [
      { from: ['a', 'geometry'], to: ['m', 'a'] },
      { from: ['b', 'geometry'], to: ['m', 'b'] },
      { from: ['m', 'geometry'], to: ['out', 'geometry'] },
    ],
  });
}

describe('Interpreter incremental evaluation', () => {
  it('evaluates every node on the first run', () => {
    const interp = new Interpreter(new NodeRegistry(DEFS), operators);
    const result = interp.evaluate(diamond(1, 2));
    expect(result.evaluated).toEqual(new Set(['a', 'b', 'm']));
  });

  it('recomputes nothing when re-evaluating an unchanged graph', () => {
    const interp = new Interpreter(new NodeRegistry(DEFS), operators);
    interp.evaluate(diamond(1, 2));
    const again = interp.evaluate(diamond(1, 2));
    expect(again.evaluated.size).toBe(0);
  });

  it('recomputes only the edited node and its downstream subtree', () => {
    const interp = new Interpreter(new NodeRegistry(DEFS), operators);
    interp.evaluate(diamond(1, 2));

    // Edit only b's radius. a is unaffected; b and its downstream (m) recompute.
    const result = interp.evaluate(diamond(1, 5));
    expect(result.evaluated).toEqual(new Set(['b', 'm']));
    expect(result.evaluated.has('a')).toBe(false);
  });

  it('produces correct output after an edit', () => {
    const interp = new Interpreter(new NodeRegistry(DEFS), operators);
    interp.evaluate(diamond(1, 2));
    const result = interp.evaluate(diamond(3, 2));
    // Combine returns input a, so the output is circle a's geometry (radius 3).
    const out = result.output.geometry as Geometry;
    const expected = circlePoints(3, 4);
    out.points.forEach((p, i) => {
      p.forEach((c, axis) => expect(c).toBeCloseTo(expected[i]![axis]!, 12));
    });
  });

  it('clearCache forces a full recompute', () => {
    const interp = new Interpreter(new NodeRegistry(DEFS), operators);
    interp.evaluate(diamond(1, 2));
    interp.clearCache();
    const result = interp.evaluate(diamond(1, 2));
    expect(result.evaluated).toEqual(new Set(['a', 'b', 'm']));
  });
});
