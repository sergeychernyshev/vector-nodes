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

  it('per-instance inputDefaults on an unconnected input', () => {
    const graph = createGraph({
      nodes: [
        { id: 'pc', type: 'PointCircle', params: { radius: 1, count: 6 } },
        // offset is unconnected; the instance overrides its default.
        { id: 't', type: 'Translate', inputDefaults: { offset: [4, -1, 2] } },
        { id: 'out', type: 'OutputGeometry' },
      ],
      links: [
        { from: ['pc', 'geometry'], to: ['t', 'geometry'] },
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

/** A graph whose output is `geometry`, used for one-shot conformance checks. */
function geoGraph(
  nodes: Parameters<typeof createGraph>[0]['nodes'],
  links: Parameters<typeof createGraph>[0]['links'],
): Graph {
  return createGraph({ nodes, links });
}

describe('conformance: Phase 7 nodes', () => {
  it('RotateGeometry', () => {
    const g = geoGraph(
      [
        { id: 'pc', type: 'PointCircle', params: { radius: 1, count: 5 } },
        { id: 'a', type: 'ConstFloat', params: { value: 1.2 } },
        { id: 'r', type: 'RotateGeometry' },
        { id: 'out', type: 'OutputGeometry' },
      ],
      [
        { from: ['pc', 'geometry'], to: ['r', 'geometry'] },
        { from: ['a', 'value'], to: ['r', 'angle'] },
        { from: ['r', 'geometry'], to: ['out', 'geometry'] },
      ],
    );
    expect(runCompiled(g, [])).toEqual(interpret(g));
  });

  it('ScaleGeometry', () => {
    const g = geoGraph(
      [
        { id: 'pc', type: 'PointCircle', params: { radius: 1, count: 5 } },
        { id: 'v', type: 'ConstVector', params: { value: [2, 0.5, 1] } },
        { id: 's', type: 'ScaleGeometry' },
        { id: 'out', type: 'OutputGeometry' },
      ],
      [
        { from: ['pc', 'geometry'], to: ['s', 'geometry'] },
        { from: ['v', 'value'], to: ['s', 'factor'] },
        { from: ['s', 'geometry'], to: ['out', 'geometry'] },
      ],
    );
    expect(runCompiled(g, [])).toEqual(interpret(g));
  });

  it('CircleCurve', () => {
    const g = geoGraph(
      [
        { id: 'c', type: 'CircleCurve', params: { radius: 2, count: 6 } },
        { id: 'out', type: 'OutputGeometry' },
      ],
      [{ from: ['c', 'geometry'], to: ['out', 'geometry'] }],
    );
    expect(runCompiled(g, [])).toEqual(interpret(g));
  });

  it('Polyline with a wired point field (issue #56)', () => {
    // points is a Vector field input now, fed by a VectorArray source.
    const g = geoGraph(
      [
        {
          id: 'va',
          type: 'VectorArray',
          params: {
            values: [
              [0, 0, 0],
              [1, 1, 0],
            ],
          },
        },
        { id: 'c', type: 'Polyline', params: { closed: true } },
        { id: 'out', type: 'OutputGeometry' },
      ],
      [
        { from: ['va', 'vectors'], to: ['c', 'points'] },
        { from: ['c', 'geometry'], to: ['out', 'geometry'] },
      ],
    );
    expect(runCompiled(g, [])).toEqual(interpret(g));
  });

  it('MergeGeometry and BoundingBox', () => {
    const g = geoGraph(
      [
        { id: 'pc', type: 'PointCircle', params: { radius: 1, count: 4 } },
        { id: 'cc', type: 'CircleCurve', params: { radius: 3, count: 5 } },
        { id: 'm', type: 'MergeGeometry' },
        { id: 'bb', type: 'BoundingBox' },
        { id: 'out', type: 'OutputGeometry' },
      ],
      [
        { from: ['pc', 'geometry'], to: ['m', 'a'] },
        { from: ['cc', 'geometry'], to: ['m', 'b'] },
        { from: ['m', 'geometry'], to: ['bb', 'geometry'] },
        { from: ['bb', 'geometry'], to: ['out', 'geometry'] },
      ],
    );
    expect(runCompiled(g, [])).toEqual(interpret(g));
  });

  it('InstanceOnPoints', () => {
    const g = geoGraph(
      [
        { id: 'cc', type: 'CircleCurve', params: { radius: 0.3, count: 4 } },
        { id: 'pg', type: 'PointGrid', params: { countX: 2, countY: 2, spacingX: 2, spacingY: 2 } },
        { id: 'inst', type: 'InstanceOnPoints' },
        { id: 'out', type: 'OutputGeometry' },
      ],
      [
        { from: ['cc', 'geometry'], to: ['inst', 'geometry'] },
        { from: ['pg', 'points'], to: ['inst', 'points'] },
        { from: ['inst', 'geometry'], to: ['out', 'geometry'] },
      ],
    );
    expect(runCompiled(g, [])).toEqual(interpret(g));
  });

  it.each([
    [
      'MathFloat',
      { id: 'u', type: 'MathFloat', params: { operation: 'multiply' } },
      [
        ['a', 'a'],
        ['b', 'b'],
      ],
    ],
    ['MapRange', { id: 'u', type: 'MapRange' }, [['a', 'value']]],
    ['Clamp', { id: 'u', type: 'Clamp' }, [['a', 'value']]],
  ] as const)('utility node %s routed into geometry', (_label, util, wires) => {
    const g = geoGraph(
      [
        { id: 'a', type: 'ConstFloat', params: { value: 5 } },
        { id: 'b', type: 'ConstFloat', params: { value: 0.5 } },
        util,
        { id: 'cx', type: 'CombineXYZ' },
        { id: 'pc', type: 'PointCircle', params: { radius: 1, count: 4 } },
        { id: 't', type: 'Translate' },
        { id: 'out', type: 'OutputGeometry' },
      ],
      [
        ...wires.map(([from, to]) => ({
          from: [from, 'value'] as [string, string],
          to: ['u', to] as [string, string],
        })),
        { from: ['u', 'value'], to: ['cx', 'x'] },
        { from: ['cx', 'vector'], to: ['t', 'offset'] },
        { from: ['pc', 'geometry'], to: ['t', 'geometry'] },
        { from: ['t', 'geometry'], to: ['out', 'geometry'] },
      ],
    );
    expect(runCompiled(g, [])).toEqual(interpret(g));
  });
});

describe('conformance: Phase 8 mesh primitives', () => {
  it.each([
    { id: 'm', type: 'PlaneMesh', params: { width: 2, height: 3 } },
    { id: 'm', type: 'BoxMesh', params: { width: 1, height: 2, depth: 3 } },
    { id: 'm', type: 'GridMesh', params: { countX: 3, countY: 2, sizeX: 4, sizeY: 2 } },
    { id: 'm', type: 'UVSphere', params: { radius: 2, segments: 8, rings: 4 } },
    { id: 'm', type: 'CylinderMesh', params: { radius: 1, height: 3, segments: 6 } },
    { id: 'm', type: 'ConeMesh', params: { radius: 1, height: 2, segments: 5 } },
  ])('$type', (source) => {
    const g = geoGraph(
      [source, { id: 'out', type: 'OutputGeometry' }],
      [{ from: ['m', 'geometry'], to: ['out', 'geometry'] }],
    );
    expect(runCompiled(g, [])).toEqual(interpret(g));
  });

  it('TriangulateMesh', () => {
    const g = geoGraph(
      [
        { id: 'm', type: 'BoxMesh', params: { width: 1, height: 1, depth: 1 } },
        { id: 'tri', type: 'TriangulateMesh' },
        { id: 'out', type: 'OutputGeometry' },
      ],
      [
        { from: ['m', 'geometry'], to: ['tri', 'geometry'] },
        { from: ['tri', 'geometry'], to: ['out', 'geometry'] },
      ],
    );
    const result = runCompiled(g, []) as { meshes: { faces: number[][] }[] };
    expect(result).toEqual(interpret(g));
    // A cube's 6 quads become 12 triangles.
    expect(result.meshes[0]!.faces).toHaveLength(12);
  });
});
