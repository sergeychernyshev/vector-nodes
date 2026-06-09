// @vitest-environment jsdom
import { createGraph } from '@vector-nodes/core';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { usePreview } from './usePreview';

afterEach(cleanup);

describe('usePreview', () => {
  it('evaluates synchronously when Worker is unavailable (jsdom fallback)', async () => {
    expect(typeof Worker).toBe('undefined');
    const graph = createGraph({
      nodes: [
        {
          id: 'pa',
          type: 'PointCircle',
          position: [0, 0],
          params: { radius: 1, count: 5 },
        },
        { id: 'out', type: 'OutputGeometry' },
      ],
      links: [{ from: ['pa', 'geometry'], to: ['out', 'geometry'] }],
    });
    const { result } = renderHook(() => usePreview(graph));
    await waitFor(() => {
      expect(result.current.geometry?.points.length).toBe(5);
    });
  });
});
