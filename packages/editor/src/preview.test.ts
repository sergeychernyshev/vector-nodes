import { createGraph } from '@vector-nodes/core';
import { emptyGeometry } from '@vector-nodes/runtime';
import { describe, expect, it } from 'vitest';

import { evaluatePreview, summarizeGeometry } from './preview';

describe('evaluatePreview', () => {
  it('evaluates a valid graph and returns geometry', () => {
    const graph = createGraph({
      nodes: [
        {
          id: 'pa',
          type: 'PointCircle',
          position: [0, 0],
          params: { radius: 1, count: 8 },
        },
        { id: 'out', type: 'OutputGeometry', position: [200, 0] },
      ],
      links: [{ from: ['pa', 'geometry'], to: ['out', 'geometry'] }],
    });
    const result = evaluatePreview(graph);
    expect(result.error).toBeUndefined();
    expect(result.geometry).toBeDefined();
    expect(result.geometry?.points.length).toBe(8);
  });

  it('returns an error when the graph references an unknown node type', () => {
    const graph = createGraph({
      nodes: [{ id: 'x', type: 'NotARealNode', position: [0, 0] }],
      links: [],
    });
    const result = evaluatePreview(graph);
    expect(result.error).toBeTruthy();
    expect(result.geometry).toBeUndefined();
  });

  it('returns per-node geometry for requested evaluated nodes (issue #79)', () => {
    const graph = createGraph({
      nodes: [
        { id: 'pa', type: 'PointCircle', params: { radius: 1, count: 8 } },
        { id: 't', type: 'Translate', inputDefaults: { offset: [5, 0, 0] } },
        { id: 'out', type: 'OutputGeometry' },
      ],
      links: [
        { from: ['pa', 'geometry'], to: ['t', 'geometry'] },
        { from: ['t', 'geometry'], to: ['out', 'geometry'] },
      ],
    });
    const result = evaluatePreview(graph, ['pa', 't']);
    expect(Object.keys(result.nodeGeometries ?? {}).sort()).toEqual(['pa', 't']);
    // The source is unshifted; the translated node is offset by +5 in x.
    expect(result.nodeGeometries!.pa!.points[0]![0]).toBeCloseTo(1);
    expect(result.nodeGeometries!.t!.points[0]![0]).toBeCloseTo(6);
  });

  it('omits requested nodes that are not evaluated or have no geometry', () => {
    const graph = createGraph({
      nodes: [
        { id: 'pa', type: 'PointCircle', params: { radius: 1, count: 4 } },
        { id: 'cf', type: 'ConstFloat', params: { value: 2 } }, // not Geometry, disconnected
        { id: 'out', type: 'OutputGeometry' },
      ],
      links: [{ from: ['pa', 'geometry'], to: ['out', 'geometry'] }],
    });
    const result = evaluatePreview(graph, ['pa', 'cf', 'missing']);
    expect(Object.keys(result.nodeGeometries ?? {})).toEqual(['pa']);
  });

  it('defaults to no per-node geometry when none are requested', () => {
    const graph = createGraph({
      nodes: [
        { id: 'pa', type: 'PointCircle', params: { radius: 1, count: 4 } },
        { id: 'out', type: 'OutputGeometry' },
      ],
      links: [{ from: ['pa', 'geometry'], to: ['out', 'geometry'] }],
    });
    expect(evaluatePreview(graph).nodeGeometries).toEqual({});
  });

  it('resolves connected input values for preview (input field acts as a preview)', () => {
    const graph = createGraph({
      nodes: [
        { id: 'r', type: 'ConstFloat', params: { value: 5 } },
        { id: 'off', type: 'ConstVector', params: { value: [1, 2, 3] } },
        { id: 'pc', type: 'PointCircle', params: { count: 4 } },
        { id: 't', type: 'Translate' },
        { id: 'out', type: 'OutputGeometry' },
      ],
      links: [
        { from: ['r', 'value'], to: ['pc', 'radius'] },
        { from: ['pc', 'geometry'], to: ['t', 'geometry'] },
        { from: ['off', 'value'], to: ['t', 'offset'] },
        { from: ['t', 'geometry'], to: ['out', 'geometry'] },
      ],
    });
    const inputs = evaluatePreview(graph).nodeInputs!;
    // The radius input on PointCircle previews the constant feeding it.
    expect(inputs.pc!.radius).toBe(5);
    // A vector connection previews its [x, y, z]; geometry links are not displayable.
    expect(inputs.t!.offset).toEqual([1, 2, 3]);
    expect(inputs.t!.geometry).toBeUndefined();
  });
});

describe('summarizeGeometry', () => {
  it('counts points, curves, and meshes', () => {
    expect(summarizeGeometry(emptyGeometry())).toEqual({ points: 0, curves: 0, meshes: 0 });
  });
});
