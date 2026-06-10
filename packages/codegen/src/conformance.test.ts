import { createBasicRegistry, createGraph, type Graph } from '@vector-nodes/core';
import { BASIC_OPERATORS, evaluateGraph } from '@vector-nodes/engine';
import * as runtime from '@vector-nodes/runtime';
import { describe, expect, it } from 'vitest';

import { generate } from './codegen.js';

const registry = createBasicRegistry();
const rt = runtime as unknown as Record<string, unknown>;

/** Build and run the generated function in-process (helpers + args injected). */
function runCompiled(graph: Graph, args: unknown[]): unknown {
  const mod = generate(graph, registry);
  const argNames = [...mod.uses, ...mod.params.map((p) => p.name)];
  const fn = new Function(...argNames, mod.body) as (...a: unknown[]) => unknown;
  return fn(...mod.uses.map((u) => rt[u]), ...args);
}

/** Interpreter result for the same graph. */
function interpret(graph: Graph, parameters: Record<string, unknown> = {}): unknown {
  return evaluateGraph(graph, registry, BASIC_OPERATORS, parameters).output.geometry;
}

describe('conformance: compiled output equals interpreter output', () => {
  it('point source → output', () => {
    const graph = createGraph({
      metadata: { name: 'circle' },
      nodes: [
        { id: 'pc', type: 'PointCircle', params: { radius: 2, count: 8 } },
        { id: 'out', type: 'OutputGeometry' },
      ],
      links: [{ from: ['pc', 'geometry'], to: ['out', 'geometry'] }],
    });
    expect(runCompiled(graph, [])).toEqual(interpret(graph));
  });

  it('translate via a constant vector', () => {
    const graph = createGraph({
      nodes: [
        { id: 'pc', type: 'PointCircle', params: { radius: 1, count: 6 } },
        { id: 'v', type: 'ConstVector', params: { value: [1, 2, 3] } },
        { id: 't', type: 'Translate' },
        { id: 'out', type: 'OutputGeometry' },
      ],
      links: [
        { from: ['pc', 'geometry'], to: ['t', 'geometry'] },
        { from: ['v', 'value'], to: ['t', 'offset'] },
        { from: ['t', 'geometry'], to: ['out', 'geometry'] },
      ],
    });
    expect(runCompiled(graph, [])).toEqual(interpret(graph));
  });

  it('parameterized translate (function argument)', () => {
    const graph = createGraph({
      metadata: { name: 'shifted' },
      parameters: [{ id: 'shift', type: 'Vector', default: [0, 0, 0] }],
      nodes: [
        { id: 'pc', type: 'PointCircle', params: { radius: 1, count: 5 } },
        { id: 'p', type: 'ParameterVector', params: { name: 'shift' } },
        { id: 't', type: 'Translate' },
        { id: 'out', type: 'OutputGeometry' },
      ],
      links: [
        { from: ['pc', 'geometry'], to: ['t', 'geometry'] },
        { from: ['p', 'value'], to: ['t', 'offset'] },
        { from: ['t', 'geometry'], to: ['out', 'geometry'] },
      ],
    });
    const shift = [3, 0, -1];
    expect(runCompiled(graph, [shift])).toEqual(interpret(graph, { shift }));
  });

  it('project (orthographic) and bezier curve', () => {
    const graph = createGraph({
      nodes: [
        {
          id: 'b',
          type: 'BezierCurve',
          params: { segments: 4 },
        },
        { id: 'pr', type: 'Project', params: { mode: 'orthographic', distance: 10 } },
        { id: 'out', type: 'OutputGeometry' },
      ],
      links: [
        { from: ['b', 'geometry'], to: ['pr', 'geometry'] },
        { from: ['pr', 'geometry'], to: ['out', 'geometry'] },
      ],
    });
    expect(runCompiled(graph, [])).toEqual(interpret(graph));
  });
});
