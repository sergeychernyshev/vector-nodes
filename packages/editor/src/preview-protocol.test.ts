import { createGraph } from '@vector-nodes/core';
import { describe, expect, it } from 'vitest';

import { runPreviewRequest } from './preview-protocol';

describe('runPreviewRequest', () => {
  it('evaluates the graph and echoes the request id', () => {
    const graph = createGraph({
      nodes: [
        {
          id: 'pa',
          type: 'PointArray',
          params: { mode: 'circle', radius: 1, count: 6 },
        },
        { id: 'out', type: 'OutputGeometry' },
      ],
      links: [{ from: ['pa', 'geometry'], to: ['out', 'geometry'] }],
    });
    const response = runPreviewRequest({ id: 42, graph });
    expect(response.id).toBe(42);
    expect(response.result.geometry?.points.length).toBe(6);
  });

  it('returns an error result for an invalid graph', () => {
    const graph = createGraph({ nodes: [{ id: 'x', type: 'NotARealNode' }], links: [] });
    const response = runPreviewRequest({ id: 1, graph });
    expect(response.id).toBe(1);
    expect(response.result.error).toBeTruthy();
  });
});
