import { describe, expect, it } from 'vitest';

import { exportImageSize } from './export-image';

describe('exportImageSize (issue #82)', () => {
  it('adds a margin around the bounds', () => {
    expect(exportImageSize({ width: 400, height: 200 }, 50)).toEqual({ width: 500, height: 300 });
  });

  it('clamps tiny graphs up to a minimum size', () => {
    expect(exportImageSize({ width: 10, height: 10 }, 0)).toEqual({ width: 256, height: 256 });
  });

  it('clamps huge graphs down to a maximum size', () => {
    expect(exportImageSize({ width: 9000, height: 9000 }, 0)).toEqual({
      width: 4096,
      height: 4096,
    });
  });

  it('treats zero-size bounds as a unit box before the margin', () => {
    expect(exportImageSize({ width: 0, height: 0 }, 200)).toEqual({ width: 401, height: 401 });
  });
});
