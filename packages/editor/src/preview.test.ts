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
});

describe('summarizeGeometry', () => {
  it('counts points, curves, and meshes', () => {
    expect(summarizeGeometry(emptyGeometry())).toEqual({ points: 0, curves: 0, meshes: 0 });
  });
});
