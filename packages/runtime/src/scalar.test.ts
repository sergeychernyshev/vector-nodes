import { describe, expect, it } from 'vitest';

import { randomFloats, randomInts } from './scalar';

describe('randomFloats (issue #119)', () => {
  it('is reproducible from the seed', () => {
    expect(randomFloats(4, 0, 1, 7)).toEqual(randomFloats(4, 0, 1, 7));
    expect(randomFloats(4, 0, 1, 7)).not.toEqual(randomFloats(4, 0, 1, 8));
  });

  it('stays within [min, max)', () => {
    for (const v of randomFloats(100, -2, 3, 1)) {
      expect(v).toBeGreaterThanOrEqual(-2);
      expect(v).toBeLessThan(3);
    }
  });
});

describe('randomInts (issue #119)', () => {
  it('produces integers within the inclusive range', () => {
    const values = randomInts(200, 0, 3, 5);
    expect(values.every((v) => Number.isInteger(v))).toBe(true);
    expect(Math.min(...values)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...values)).toBeLessThanOrEqual(3);
    // With 200 draws over 4 values, every bucket should be hit.
    expect(new Set(values).size).toBe(4);
  });

  it('rounds the bounds inward and collapses empty ranges', () => {
    expect(randomInts(10, 0.2, 0.8, 1)).toEqual(Array(10).fill(1));
  });

  it('is reproducible from the seed', () => {
    expect(randomInts(8, 0, 100, 42)).toEqual(randomInts(8, 0, 100, 42));
  });
});
