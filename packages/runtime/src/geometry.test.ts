import { describe, expect, it } from 'vitest';

import {
  circlePoints,
  cubicBezier,
  fromList,
  gridPoints,
  linePoints,
  makeRng,
  projectOrthographic,
  projectPerspective,
  randomPoints,
  sampleCubicBezier,
  translatePoints,
} from './geometry';

describe('fromList', () => {
  it('copies a list of vectors', () => {
    const input = [
      [1, 2, 3],
      [4, 5, 6],
    ] as const;
    const out = fromList([...input]);
    expect(out).toEqual([
      [1, 2, 3],
      [4, 5, 6],
    ]);
    expect(out[0]).not.toBe(input[0]);
  });
});

describe('linePoints', () => {
  it('places count points inclusive of both ends', () => {
    expect(linePoints([0, 0, 0], [10, 0, 0], 3)).toEqual([
      [0, 0, 0],
      [5, 0, 0],
      [10, 0, 0],
    ]);
  });

  it('handles degenerate counts', () => {
    expect(linePoints([0, 0, 0], [1, 1, 1], 0)).toEqual([]);
    expect(linePoints([2, 2, 2], [9, 9, 9], 1)).toEqual([[2, 2, 2]]);
  });
});

describe('gridPoints', () => {
  it('builds a row-major grid on XY', () => {
    expect(gridPoints(2, 2, 1)).toEqual([
      [0, 0, 0],
      [1, 0, 0],
      [0, 1, 0],
      [1, 1, 0],
    ]);
  });

  it('supports separate x/y spacing', () => {
    expect(gridPoints(2, 1, 3, 5)).toEqual([
      [0, 0, 0],
      [3, 0, 0],
    ]);
  });
});

describe('circlePoints', () => {
  it('places points evenly around the circle', () => {
    const pts = circlePoints(1, 4);
    expect(pts).toHaveLength(4);
    const expected = [
      [1, 0, 0],
      [0, 1, 0],
      [-1, 0, 0],
      [0, -1, 0],
    ];
    pts.forEach((p, i) => {
      p.forEach((c, axis) => expect(c).toBeCloseTo(expected[i]![axis]!, 12));
    });
  });

  it('honors radius and center', () => {
    const [first] = circlePoints(2, 4, [10, 10, 0]);
    expect(first![0]).toBeCloseTo(12, 12);
    expect(first![1]).toBeCloseTo(10, 12);
  });
});

describe('randomPoints', () => {
  it('is deterministic for a given seed', () => {
    expect(randomPoints(3, [0, 0, 0], [1, 1, 1], 42)).toEqual(
      randomPoints(3, [0, 0, 0], [1, 1, 1], 42),
    );
  });

  it('differs across seeds', () => {
    expect(randomPoints(3, [0, 0, 0], [1, 1, 1], 1)).not.toEqual(
      randomPoints(3, [0, 0, 0], [1, 1, 1], 2),
    );
  });

  it('stays within the bounds', () => {
    for (const p of randomPoints(50, [-1, -2, -3], [1, 2, 3], 7)) {
      expect(p[0]).toBeGreaterThanOrEqual(-1);
      expect(p[0]).toBeLessThan(1);
      expect(p[1]).toBeGreaterThanOrEqual(-2);
      expect(p[1]).toBeLessThan(2);
      expect(p[2]).toBeGreaterThanOrEqual(-3);
      expect(p[2]).toBeLessThan(3);
    }
  });

  it('makeRng yields floats in [0, 1)', () => {
    const rng = makeRng(123);
    for (let i = 0; i < 100; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('projection', () => {
  it('orthographic drops z', () => {
    expect(projectOrthographic([3, 4, 5])).toEqual([3, 4, 0]);
  });

  it('perspective leaves points on the plane unchanged', () => {
    expect(projectPerspective([2, 2, 0], 10)).toEqual([2, 2, 0]);
  });

  it('perspective scales by distance / (distance - z)', () => {
    expect(projectPerspective([2, 0, 5], 10)).toEqual([4, 0, 0]);
  });

  it('perspective avoids division by zero on the eye plane', () => {
    expect(projectPerspective([2, 3, 10], 10)).toEqual([2, 3, 0]);
  });
});

describe('translatePoints', () => {
  it('moves every point by the offset', () => {
    expect(
      translatePoints(
        [
          [0, 0, 0],
          [1, 1, 1],
        ],
        [1, 2, 3],
      ),
    ).toEqual([
      [1, 2, 3],
      [2, 3, 4],
    ]);
  });
});

describe('cubicBezier / sampleCubicBezier', () => {
  const p0: [number, number, number] = [0, 0, 0];
  const p1: [number, number, number] = [1, 0, 0];
  const p2: [number, number, number] = [2, 0, 0];
  const p3: [number, number, number] = [3, 0, 0];

  it('hits the endpoints at t = 0 and t = 1', () => {
    expect(cubicBezier(p0, p1, p2, p3, 0)).toEqual(p0);
    expect(cubicBezier(p0, p1, p2, p3, 1)).toEqual(p3);
  });

  it('lands on the line for collinear controls', () => {
    expect(cubicBezier(p0, p1, p2, p3, 0.5)).toEqual([1.5, 0, 0]);
  });

  it('samples segments + 1 points including both ends', () => {
    const pts = sampleCubicBezier(p0, p1, p2, p3, 2);
    expect(pts).toHaveLength(3);
    expect(pts[0]).toEqual(p0);
    expect(pts[2]).toEqual(p3);
  });

  it('treats segments < 1 as 1', () => {
    expect(sampleCubicBezier(p0, p1, p2, p3, 0)).toEqual([p0, p3]);
  });
});
