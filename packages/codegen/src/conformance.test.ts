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

  it('curve primitives merged together (issue #114)', () => {
    const graph = createGraph({
      nodes: [
        { id: 'star', type: 'StarCurve', params: { points: 6, innerRadius: 0.4, outerRadius: 1 } },
        {
          id: 'arc',
          type: 'ArcCurve',
          params: { radius: 2, startAngle: 0.5, sweepAngle: 2, segments: 12 },
        },
        {
          id: 'spiral',
          type: 'SpiralCurve',
          params: { turns: 1.5, startRadius: 0.2, endRadius: 1, height: 0.5, segments: 24 },
        },
        { id: 'rect', type: 'RectangleCurve', params: { width: 3, height: 2 } },
        {
          id: 'qb',
          type: 'QuadraticBezier',
          params: { p0: [-1, 0, 0], p1: [0, 2, 0], p2: [1, 0, 0], segments: 8 },
        },
        { id: 'm', type: 'MergeGeometry' },
        { id: 'out', type: 'OutputGeometry' },
      ],
      links: [
        { from: ['star', 'geometry'], to: ['m', 'geometry'] },
        { from: ['arc', 'geometry'], to: ['m', 'geometry'] },
        { from: ['spiral', 'geometry'], to: ['m', 'geometry'] },
        { from: ['rect', 'geometry'], to: ['m', 'geometry'] },
        { from: ['qb', 'geometry'], to: ['m', 'geometry'] },
        { from: ['m', 'geometry'], to: ['out', 'geometry'] },
      ],
    });
    const result = runCompiled(graph, []) as { curves: unknown[] };
    expect(result).toEqual(interpret(graph));
    expect(result.curves).toHaveLength(5);
  });

  it('curve sampling ops chained (issue #115)', () => {
    const graph = createGraph({
      nodes: [
        { id: 'star', type: 'StarCurve', params: { points: 5, innerRadius: 0.5, outerRadius: 1 } },
        { id: 'sub', type: 'SubdivideCurve', params: { cuts: 2 } },
        { id: 'res', type: 'ResampleCurve', params: { count: 24 } },
        { id: 'rev', type: 'ReverseCurve' },
        {
          id: 'qb',
          type: 'QuadraticBezier',
          params: { p0: [-1, 0, 0], p1: [0, 2, 0], p2: [1, 0, 0], segments: 16 },
        },
        { id: 'trim', type: 'TrimCurve', params: { start: 0.2, end: 0.8 } },
        { id: 'm', type: 'MergeGeometry' },
        { id: 'out', type: 'OutputGeometry' },
      ],
      links: [
        { from: ['star', 'geometry'], to: ['sub', 'geometry'] },
        { from: ['sub', 'geometry'], to: ['res', 'geometry'] },
        { from: ['res', 'geometry'], to: ['rev', 'geometry'] },
        { from: ['rev', 'geometry'], to: ['m', 'geometry'] },
        { from: ['qb', 'geometry'], to: ['trim', 'geometry'] },
        { from: ['trim', 'geometry'], to: ['m', 'geometry'] },
        { from: ['m', 'geometry'], to: ['out', 'geometry'] },
      ],
    });
    const result = runCompiled(graph, []) as { curves: { points: unknown[] }[] };
    expect(result).toEqual(interpret(graph));
    expect(result.curves[0]!.points).toHaveLength(24);
  });

  it('rectangle with rounded corners (issue #116)', () => {
    const graph = createGraph({
      nodes: [
        { id: 'rect', type: 'RectangleCurve', params: { width: 3, height: 2 } },
        { id: 'fillet', type: 'FilletCurve', params: { radius: 0.4, resolution: 6 } },
        { id: 'out', type: 'OutputGeometry' },
      ],
      links: [
        { from: ['rect', 'geometry'], to: ['fillet', 'geometry'] },
        { from: ['fillet', 'geometry'], to: ['out', 'geometry'] },
      ],
    });
    const result = runCompiled(graph, []) as { curves: { points: unknown[] }[] };
    expect(result).toEqual(interpret(graph));
    expect(result.curves[0]!.points).toHaveLength(4 * 7);
  });

  it('a filled star (issue #117)', () => {
    const graph = createGraph({
      nodes: [
        { id: 'star', type: 'StarCurve', params: { points: 5, innerRadius: 0.5, outerRadius: 1 } },
        { id: 'fill', type: 'FillCurve' },
        { id: 'out', type: 'OutputGeometry' },
      ],
      links: [
        { from: ['star', 'geometry'], to: ['fill', 'geometry'] },
        { from: ['fill', 'geometry'], to: ['out', 'geometry'] },
      ],
    });
    const result = runCompiled(graph, []) as { meshes: { faces: unknown[] }[] };
    expect(result).toEqual(interpret(graph));
    expect(result.meshes[0]!.faces).toHaveLength(8);
  });

  it('expanded math and vector operations drive geometry (issue #118)', () => {
    const graph = createGraph({
      nodes: [
        { id: 'one', type: 'ConstFloat', params: { value: 1 } },
        // sine(1) ≈ 0.841 becomes the circle radius.
        { id: 'sin', type: 'MathFloat', params: { operation: 'sine' } },
        { id: 'pc', type: 'PointCircle', params: { count: 6 } },
        { id: 'x', type: 'ConstVector', params: { value: [1, 0, 0] } },
        { id: 'axis', type: 'ConstVector', params: { value: [0, 0, 1] } },
        { id: 'quarter', type: 'ConstFloat', params: { value: Math.PI / 2 } },
        // [1,0,0] rotated a quarter turn around z ≈ [0,1,0] becomes the offset.
        { id: 'rot', type: 'VectorMath', params: { operation: 'rotate' } },
        { id: 't', type: 'Translate' },
        { id: 'out', type: 'OutputGeometry' },
      ],
      links: [
        { from: ['one', 'value'], to: ['sin', 'a'] },
        { from: ['sin', 'value'], to: ['pc', 'radius'] },
        { from: ['pc', 'geometry'], to: ['t', 'geometry'] },
        { from: ['x', 'value'], to: ['rot', 'a'] },
        { from: ['axis', 'value'], to: ['rot', 'b'] },
        { from: ['quarter', 'value'], to: ['rot', 'scale'] },
        { from: ['rot', 'vector'], to: ['t', 'offset'] },
        { from: ['t', 'geometry'], to: ['out', 'geometry'] },
      ],
    });
    expect(runCompiled(graph, [])).toEqual(interpret(graph));
  });

  it('random values drive a polyline and a circle radius (issue #119)', () => {
    const graph = createGraph({
      nodes: [
        { id: 'rand', type: 'RandomValue', params: { min: -1, max: 1, seed: 7, count: 5 } },
        { id: 'pl', type: 'Polyline', params: { closed: false } },
        { id: 'pc', type: 'PointCircle', params: { count: 6 } },
        { id: 'm', type: 'MergeGeometry' },
        { id: 'out', type: 'OutputGeometry' },
      ],
      links: [
        { from: ['rand', 'vectors'], to: ['pl', 'points'] },
        { from: ['rand', 'value'], to: ['pc', 'radius'] },
        { from: ['pl', 'geometry'], to: ['m', 'geometry'] },
        { from: ['pc', 'geometry'], to: ['m', 'geometry'] },
        { from: ['m', 'geometry'], to: ['out', 'geometry'] },
      ],
    });
    const result = runCompiled(graph, []) as { curves: { points: unknown[] }[] };
    expect(result).toEqual(interpret(graph));
    expect(result.curves[0]!.points).toHaveLength(5);
  });

  it('a config field wired from another node (issue #58)', () => {
    // PointCircle.radius is an input socket now: feed it from a ConstFloat.
    const graph = createGraph({
      nodes: [
        { id: 'r', type: 'ConstFloat', params: { value: 3 } },
        { id: 'pc', type: 'PointCircle', params: { count: 8 } },
        { id: 'out', type: 'OutputGeometry' },
      ],
      links: [
        { from: ['r', 'value'], to: ['pc', 'radius'] },
        { from: ['pc', 'geometry'], to: ['out', 'geometry'] },
      ],
    });
    const result = runCompiled(graph, []) as { points: [number, number, number][] };
    expect(result).toEqual(interpret(graph));
    // radius 3 → every point is distance 3 from the origin.
    expect(Math.hypot(result.points[0]![0], result.points[0]![1])).toBeCloseTo(3, 9);
  });

  it('merges multiple field sources flat into an array input (issue #146)', () => {
    const graph = createGraph({
      nodes: [
        { id: 'g', type: 'PointGrid', params: { countX: 2, countY: 2 } }, // 4 points
        { id: 'c', type: 'PointCircle', params: { radius: 1, count: 3 } }, // 3 points
        { id: 'p', type: 'Point', inputDefaults: { x: 9, y: 9, z: 0 } }, // single value
        { id: 'pl', type: 'Polyline', params: { closed: false } },
        { id: 'out', type: 'OutputGeometry' },
      ],
      links: [
        { from: ['g', 'points'], to: ['pl', 'points'] },
        { from: ['c', 'points'], to: ['pl', 'points'] },
        { from: ['p', 'point'], to: ['pl', 'points'] },
        { from: ['pl', 'geometry'], to: ['out', 'geometry'] },
      ],
    });
    const result = runCompiled(graph, []) as { curves: { points: unknown[] }[] };
    expect(result).toEqual(interpret(graph));
    expect(result.curves[0]!.points).toHaveLength(8); // 4 + 3 + 1, flat
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
        { from: ['pc', 'geometry'], to: ['m', 'geometry'] },
        { from: ['cc', 'geometry'], to: ['m', 'geometry'] },
        { from: ['m', 'geometry'], to: ['bb', 'geometry'] },
        { from: ['bb', 'geometry'], to: ['out', 'geometry'] },
      ],
    );
    expect(runCompiled(g, [])).toEqual(interpret(g));
  });

  it('MergeGeometry collects many connections into one array input (issue #99)', () => {
    const g = geoGraph(
      [
        { id: 'a', type: 'PointCircle', params: { radius: 1, count: 3 } },
        { id: 'b', type: 'PointCircle', params: { radius: 2, count: 4 } },
        { id: 'c', type: 'CircleCurve', params: { radius: 3, count: 5 } },
        { id: 'm', type: 'MergeGeometry' },
        { id: 'out', type: 'OutputGeometry' },
      ],
      [
        // All three feed the single `geometry` array input.
        { from: ['a', 'geometry'], to: ['m', 'geometry'] },
        { from: ['b', 'geometry'], to: ['m', 'geometry'] },
        { from: ['c', 'geometry'], to: ['m', 'geometry'] },
        { from: ['m', 'geometry'], to: ['out', 'geometry'] },
      ],
    );
    const result = runCompiled(g, []) as { points: unknown[]; curves: unknown[] };
    expect(result).toEqual(interpret(g));
    expect(result.points).toHaveLength(7); // 3 + 4
    expect(result.curves).toHaveLength(1);
  });

  it('MergeGeometry with no inputs yields empty geometry (issue #99)', () => {
    const g = geoGraph(
      [
        { id: 'm', type: 'MergeGeometry' },
        { id: 'out', type: 'OutputGeometry' },
      ],
      [{ from: ['m', 'geometry'], to: ['out', 'geometry'] }],
    );
    expect(runCompiled(g, [])).toEqual(interpret(g));
    expect(runCompiled(g, [])).toEqual({ points: [], curves: [], meshes: [] });
  });

  it('ColorGeometry colors every point (issues #80, #85)', () => {
    const g = geoGraph(
      [
        { id: 'pc', type: 'PointCircle', params: { radius: 1, count: 4 } },
        { id: 'col', type: 'ColorGeometry', inputDefaults: { color: [1, 0, 0, 1] } },
        { id: 'out', type: 'OutputGeometry' },
      ],
      [
        { from: ['pc', 'geometry'], to: ['col', 'geometry'] },
        { from: ['col', 'geometry'], to: ['out', 'geometry'] },
      ],
    );
    const result = runCompiled(g, []) as { pointColors: number[][] };
    expect(result).toEqual(interpret(g));
    expect(result.pointColors).toEqual(Array.from({ length: 4 }, () => [1, 0, 0, 1]));
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
