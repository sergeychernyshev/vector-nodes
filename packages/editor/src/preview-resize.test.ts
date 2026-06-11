import { describe, expect, it } from 'vitest';

import {
  MAX_PREVIEW_FRACTION,
  MAX_PREVIEW_HEIGHT_FRACTION,
  MIN_PREVIEW_HEIGHT,
  MIN_PREVIEW_WIDTH,
  previewHeightFromClientY,
  previewWidthFromClientX,
} from './preview-resize';

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

describe('previewHeightFromClientY', () => {
  it('measures from the strip top edge', () => {
    expect(previewHeightFromClientY(500, 1000, 60)).toBe(440);
  });

  it('clamps to the minimum height', () => {
    expect(previewHeightFromClientY(70, 1000, 60)).toBe(MIN_PREVIEW_HEIGHT);
  });

  it('clamps to a fraction of the space below the strip top', () => {
    expect(previewHeightFromClientY(1050, 1060, 60)).toBe(1000 * MAX_PREVIEW_HEIGHT_FRACTION);
  });

  it('keeps the minimum reachable on tiny viewports', () => {
    // When the fraction cap would fall below the minimum, the minimum wins.
    expect(previewHeightFromClientY(190, 200, 60)).toBe(MIN_PREVIEW_HEIGHT);
  });
});
