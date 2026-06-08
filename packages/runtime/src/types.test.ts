import { describe, expect, it } from 'vitest';

import { emptyGeometry, ORIGIN, vector } from './types';

describe('vector', () => {
  it('builds a 3D vector', () => {
    expect(vector(1, 2, 3)).toEqual([1, 2, 3]);
  });

  it('defaults z to 0 for 2D', () => {
    expect(vector(4, 5)).toEqual([4, 5, 0]);
  });
});

describe('ORIGIN', () => {
  it('is the zero vector', () => {
    expect(ORIGIN).toEqual([0, 0, 0]);
  });
});

describe('emptyGeometry', () => {
  it('has empty points, curves, and meshes', () => {
    expect(emptyGeometry()).toEqual({ points: [], curves: [], meshes: [] });
  });

  it('returns a fresh bundle each call', () => {
    const a = emptyGeometry();
    const b = emptyGeometry();
    a.points.push([1, 2, 3]);
    expect(b.points).toEqual([]);
  });
});
