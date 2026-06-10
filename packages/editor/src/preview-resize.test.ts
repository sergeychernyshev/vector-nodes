import { describe, expect, it } from 'vitest';

import { MAX_PREVIEW_FRACTION, MIN_PREVIEW_WIDTH, previewWidthFromClientX } from './preview-resize';

describe('previewWidthFromClientX', () => {
  it('measures from the right edge of the viewport', () => {
    expect(previewWidthFromClientX(700, 1000)).toBe(300);
  });

  it('clamps to the minimum width', () => {
    expect(previewWidthFromClientX(990, 1000)).toBe(MIN_PREVIEW_WIDTH);
  });

  it('clamps to a fraction of the viewport', () => {
    expect(previewWidthFromClientX(0, 1000)).toBe(1000 * MAX_PREVIEW_FRACTION);
  });

  it('keeps the minimum reachable on tiny viewports', () => {
    // When the fraction cap would fall below the minimum, the minimum wins.
    expect(previewWidthFromClientX(0, 100)).toBe(MIN_PREVIEW_WIDTH);
  });

  it('measures from the left edge when docked left (issue #62)', () => {
    expect(previewWidthFromClientX(300, 1000, 'left')).toBe(300);
    expect(previewWidthFromClientX(10, 1000, 'left')).toBe(MIN_PREVIEW_WIDTH);
    expect(previewWidthFromClientX(900, 1000, 'left')).toBe(1000 * MAX_PREVIEW_FRACTION);
  });
});
