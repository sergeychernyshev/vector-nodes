import { describe, expect, it } from 'vitest';

import {
  add,
  cross,
  distance,
  divideAxes,
  dot,
  length,
  maxAxes,
  minAxes,
  normalize,
  reflect,
  scale,
  sub,
} from './vector';

describe('add / sub', () => {
  it('adds component-wise', () => {
    expect(add([1, 2, 3], [4, 5, 6])).toEqual([5, 7, 9]);
  });

  it('subtracts component-wise', () => {
    expect(sub([4, 5, 6], [1, 2, 3])).toEqual([3, 3, 3]);
  });
});

describe('scale', () => {
  it('multiplies every component', () => {
    expect(scale([1, -2, 3], 2)).toEqual([2, -4, 6]);
  });

  it('scaling by zero yields the zero vector', () => {
    expect(scale([5, 9, 8], 0)).toEqual([0, 0, 0]);
  });
});

describe('dot', () => {
  it('computes the dot product', () => {
    expect(dot([1, 2, 3], [4, 5, 6])).toBe(32);
  });

  it('is zero for perpendicular vectors', () => {
    expect(dot([1, 0, 0], [0, 1, 0])).toBe(0);
  });
});

describe('cross', () => {
  it('computes the right-handed cross product', () => {
    expect(cross([1, 0, 0], [0, 1, 0])).toEqual([0, 0, 1]);
    expect(cross([0, 1, 0], [1, 0, 0])).toEqual([0, 0, -1]);
  });

  it('is the zero vector for parallel inputs', () => {
    expect(cross([2, 4, 6], [1, 2, 3])).toEqual([0, 0, 0]);
  });
});

describe('length', () => {
  it('computes the magnitude', () => {
    expect(length([3, 4, 0])).toBe(5);
    expect(length([0, 0, 0])).toBe(0);
  });
});

describe('normalize', () => {
  it('returns a unit vector', () => {
    expect(normalize([0, 3, 4])).toEqual([0, 0.6, 0.8]);
    expect(length(normalize([1, 2, 3]))).toBeCloseTo(1, 12);
  });

  it('returns the zero vector for the zero vector (no NaNs)', () => {
    expect(normalize([0, 0, 0])).toEqual([0, 0, 0]);
  });
});

describe('distance', () => {
  it('computes Euclidean distance', () => {
    expect(distance([0, 0, 0], [3, 4, 0])).toBe(5);
    expect(distance([1, 1, 1], [1, 1, 1])).toBe(0);
  });
});

describe('component-wise ops (issue #118)', () => {
  it('divideAxes divides per component', () => {
    expect(divideAxes([4, 9, 8], [2, 3, 4])).toEqual([2, 3, 2]);
  });

  it('minAxes / maxAxes pick per component', () => {
    expect(minAxes([1, 5, 3], [2, 4, 3])).toEqual([1, 4, 3]);
    expect(maxAxes([1, 5, 3], [2, 4, 3])).toEqual([2, 5, 3]);
  });
});

describe('reflect (issue #118)', () => {
  it('reflects across the plane with the given normal', () => {
    expect(reflect([1, -1, 0], [0, 1, 0])).toEqual([1, 1, 0]);
  });

  it('normalizes the normal first', () => {
    expect(reflect([1, -1, 0], [0, 5, 0])).toEqual([1, 1, 0]);
  });

  it('leaves the vector unchanged for a zero normal', () => {
    expect(reflect([1, 2, 3], [0, 0, 0])).toEqual([1, 2, 3]);
  });
});
