import { createGraph } from '@vector-nodes/core';
import { describe, expect, it } from 'vitest';

import { runPreviewRequest } from './preview-protocol';

describe('runPreviewRequest', () => {
  it('evaluates the graph and echoes the request id', () => {
    const graph = createGraph({
      nodes: [
        {
          id: 'pa',
          type: 'PointCircle',
          params: { radius: 1, count: 6 },
        },
        { id: 'out', type: 'OutputGeometry' },
      ],
      links: [{ from: ['pa', 'geometry'], to: ['out', 'geometry'] }],
    });
    const response = runPreviewRequest({ id: 42, graph });
    expect(response.id).toBe(42);
    expect(response.result.geometry?.points.length).toBe(6);
  });

  it('forwards parameters so a Time node drives the preview (issue #138)', () => {
    const graph = createGraph({
      nodes: [
        { id: 'tm', type: 'Time', params: { fps: 30 } },
        { id: 'pc', type: 'PointCircle', params: { count: 4 } },
        { id: 'out', type: 'OutputGeometry' },
      ],
      links: [
        { from: ['tm', 'seconds'], to: ['pc', 'radius'] },
        { from: ['pc', 'geometry'], to: ['out', 'geometry'] },
      ],
    });
    const response = runPreviewRequest({ id: 7, graph, parameters: { time: 2 } });
    // time = 2s → radius 2 → every point is distance 2 from the origin.
    const p = response.result.geometry!.points[0]!;
    expect(Math.hypot(p[0], p[1])).toBeCloseTo(2);
  });

  it('returns an error result for an invalid graph', () => {
    const graph = createGraph({ nodes: [{ id: 'x', type: 'NotARealNode' }], links: [] });
    const response = runPreviewRequest({ id: 1, graph });
    expect(response.id).toBe(1);
    expect(response.result.error).toBeTruthy();
  });
});
