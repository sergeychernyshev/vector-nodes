import { describe, expect, it } from 'vitest';

import {
  arcPoints,
  circlePoints,
  cubicBezier,
  fillSpiralCurve,
  filletCurve,
  fromList,
  gridPoints,
  linePoints,
  makeRng,
  mapCurves,
  projectOrthographic,
  projectPerspective,
  quadraticBezier,
  randomPoints,
  rectanglePoints,
  resampleCurve,
  reverseCurve,
  sampleCubicBezier,
  sampleQuadraticBezier,
  spiralPoints,
  starPoints,
  subdivideCurve,
  translatePoints,
  trimCurve,
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

describe('quadraticBezier / sampleQuadraticBezier', () => {
  const p0: [number, number, number] = [-1, 0, 0];
  const p1: [number, number, number] = [0, 1, 0];
  const p2: [number, number, number] = [1, 0, 0];

  it('hits the endpoints at t = 0 and t = 1', () => {
    expect(quadraticBezier(p0, p1, p2, 0)).toEqual(p0);
    expect(quadraticBezier(p0, p1, p2, 1)).toEqual(p2);
  });

  it('peaks halfway between the endpoints and the control', () => {
    expect(quadraticBezier(p0, p1, p2, 0.5)).toEqual([0, 0.5, 0]);
  });

  it('samples segments + 1 points including both ends', () => {
    const pts = sampleQuadraticBezier(p0, p1, p2, 4);
    expect(pts).toHaveLength(5);
    expect(pts[0]).toEqual(p0);
    expect(pts[4]).toEqual(p2);
  });

  it('treats segments < 1 as 1', () => {
    expect(sampleQuadraticBezier(p0, p1, p2, 0)).toEqual([p0, p2]);
  });
});

describe('starPoints', () => {
  it('alternates outer and inner radii around the circle', () => {
    const pts = starPoints(5, 0.5, 2);
    expect(pts).toHaveLength(10);
    for (const [i, p] of pts.entries()) {
      expect(Math.hypot(p[0], p[1])).toBeCloseTo(i % 2 === 0 ? 2 : 0.5, 9);
      expect(p[2]).toBe(0);
    }
    // The first vertex is an outer tip at angle 0.
    expect(pts[0]).toEqual([2, 0, 0]);
  });

  it('treats points < 2 as 2', () => {
    expect(starPoints(0, 0.5, 1)).toHaveLength(4);
  });
});

describe('arcPoints', () => {
  it('spans startAngle to startAngle + sweepAngle inclusive', () => {
    const pts = arcPoints(2, 0, Math.PI / 2, 2);
    expect(pts).toHaveLength(3);
    expect(pts[0]![0]).toBeCloseTo(2, 9);
    expect(pts[0]![1]).toBeCloseTo(0, 9);
    expect(pts[2]![0]).toBeCloseTo(0, 9);
    expect(pts[2]![1]).toBeCloseTo(2, 9);
  });

  it('keeps every point at the radius', () => {
    for (const p of arcPoints(3, 1, Math.PI, 8)) {
      expect(Math.hypot(p[0], p[1])).toBeCloseTo(3, 9);
    }
  });

  it('treats segments < 1 as 1', () => {
    expect(arcPoints(1, 0, Math.PI, 0)).toHaveLength(2);
  });
});

describe('spiralPoints', () => {
  it('interpolates radius and height across the turns', () => {
    const pts = spiralPoints(1, 0, 2, 4, 4);
    expect(pts).toHaveLength(5);
    expect(pts[0]).toEqual([0, 0, 0]);
    // End of one full turn: back to angle 0 at the end radius and full height.
    expect(pts[4]![0]).toBeCloseTo(2, 9);
    expect(pts[4]![1]).toBeCloseTo(0, 9);
    expect(pts[4]![2]).toBeCloseTo(4, 9);
    // Halfway: half a turn (angle π), half the radius and height.
    expect(pts[2]![0]).toBeCloseTo(-1, 9);
    expect(pts[2]![2]).toBeCloseTo(2, 9);
  });

  it('stays flat when height is 0', () => {
    for (const p of spiralPoints(2, 0.5, 1, 0, 16)) expect(p[2]).toBe(0);
  });
});

describe('fillSpiralCurve', () => {
  /** Total length of an open polyline. */
  const polylineLength = (pts: readonly [number, number, number][]) =>
    pts.reduce((sum, p, i) => (i === 0 ? 0 : sum + Math.hypot(...sub(p, pts[i - 1]!))), 0);

  const sub = (a: readonly number[], b: readonly number[]) =>
    [a[0]! - b[0]!, a[1]! - b[1]!, a[2]! - b[2]!] as [number, number, number];

  // A square container 4 wide, centered on the origin: corner radius ≈ 2.83.
  const container = { points: rectanglePoints(4, 4), curves: [], meshes: [] };

  it('starts at the center, winds CCW from the start angle, and is open', () => {
    const curve = fillSpiralCurve(container, [0, 0, 0], 0, 30, 32);
    expect(curve.closed).toBe(false);
    expect(curve.points[0]).toEqual([0, 0, 0]);
    // Polar angle is startAngle + θ, so the first step leaves the center just
    // counter-clockwise of the start angle (0) — first quadrant.
    const heading = Math.atan2(curve.points[1]![1], curve.points[1]![0]);
    expect(heading).toBeGreaterThan(0);
    expect(heading).toBeLessThan(Math.PI / 2);
  });

  it('honors a non-zero start point and start angle', () => {
    const curve = fillSpiralCurve(container, [1, 2, 0], Math.PI / 2, 30, 32);
    expect(curve.points[0]).toEqual([1, 2, 0]);
    const second = curve.points[1]!;
    // Heads upward (+y) from the start point, winding CCW past angle π/2.
    expect(second[1]).toBeGreaterThan(2);
    const heading = Math.atan2(second[1] - 2, second[0] - 1);
    expect(heading).toBeGreaterThan(Math.PI / 2);
    expect(heading).toBeLessThan(Math.PI);
  });

  it('matches the requested total arc length', () => {
    const curve = fillSpiralCurve(container, [0, 0, 0], 0, 40, 256);
    expect(polylineLength(curve.points)).toBeCloseTo(40, 0);
  });

  it('grows to fill the container (outermost point reaches the far corner)', () => {
    const curve = fillSpiralCurve(container, [0, 0, 0], 0, 60, 256);
    const cornerRadius = Math.hypot(2, 2);
    const maxR = Math.max(...curve.points.map((p) => Math.hypot(p[0], p[1])));
    expect(maxR).toBeCloseTo(cornerRadius, 1);
  });

  it('packs more turns as the length grows', () => {
    const turns = (length: number) => {
      const pts = fillSpiralCurve(container, [0, 0, 0], 0, length, 256).points;
      // Count direction sign changes in x as a proxy for half-turns.
      let crossings = 0;
      for (let i = 2; i < pts.length; i++) {
        if (Math.sign(pts[i]![0]) !== Math.sign(pts[i - 1]![0])) crossings++;
      }
      return crossings;
    };
    expect(turns(80)).toBeGreaterThan(turns(20));
  });

  it('draws a straight radial spoke when the length is too short to fill', () => {
    // Corner radius ≈ 2.83; length 1 cannot reach the edge.
    const curve = fillSpiralCurve(container, [0, 0, 0], 0, 1, 32);
    expect(curve.points).toHaveLength(2);
    expect(curve.points[0]).toEqual([0, 0, 0]);
    expect(polylineLength(curve.points)).toBeCloseTo(1, 9);
  });

  it('degenerates to the center for an empty container or non-positive length', () => {
    const empty = { points: [], curves: [], meshes: [] };
    expect(fillSpiralCurve(empty, [3, 1, 0], 0, 10, 32).points).toEqual([[3, 1, 0]]);
    expect(fillSpiralCurve(container, [0, 0, 0], 0, 0, 32).points).toEqual([[0, 0, 0]]);
  });
});

describe('rectanglePoints', () => {
  it('returns the four corners centered on the origin', () => {
    expect(rectanglePoints(2, 4)).toEqual([
      [-1, -2, 0],
      [1, -2, 0],
      [1, 2, 0],
      [-1, 2, 0],
    ]);
  });
});

describe('filletCurve (issue #116)', () => {
  // A right angle at (1, 0): segments along +x then +y, both length 1.
  const corner = {
    points: [
      [0, 0, 0],
      [1, 0, 0],
      [1, 1, 0],
    ] as [number, number, number][],
    closed: false,
    color: [0, 1, 0, 1] as [number, number, number, number],
  };

  it('replaces a right-angle corner with a tangent arc', () => {
    const out = filletCurve(corner, 0.5, 2);
    // endpoint, tangent, arc midpoint, tangent, endpoint
    expect(out.points).toHaveLength(5);
    expect(out.points[0]).toEqual([0, 0, 0]);
    expect(out.points[1]).toEqual([0.5, 0, 0]);
    // The far tangent point comes out of the arc rotation — compare loosely.
    expect(out.points[3]![0]).toBeCloseTo(1, 9);
    expect(out.points[3]![1]).toBeCloseTo(0.5, 9);
    expect(out.points[4]).toEqual([1, 1, 0]);
    // The arc midpoint sits on the radius-0.5 circle centered at (0.5, 0.5).
    const mid = out.points[2]!;
    expect(Math.hypot(mid[0] - 0.5, mid[1] - 0.5)).toBeCloseTo(0.5, 9);
    expect(mid[0]).toBeGreaterThan(0.5);
    expect(mid[1]).toBeLessThan(0.5);
    expect(out.color).toEqual([0, 1, 0, 1]);
  });

  it('caps the tangent offset at half the shorter segment', () => {
    const out = filletCurve(corner, 100, 1);
    // Tangents at the segment midpoints; resolution 1 is a chamfer.
    expect(out.points).toHaveLength(4);
    expect(out.points[0]).toEqual([0, 0, 0]);
    expect(out.points[1]).toEqual([0.5, 0, 0]);
    expect(out.points[2]![0]).toBeCloseTo(1, 9);
    expect(out.points[2]![1]).toBeCloseTo(0.5, 9);
    expect(out.points[3]).toEqual([1, 1, 0]);
  });

  it('rounds every corner of a closed curve, wrap-around included', () => {
    const square = { points: rectanglePoints(2, 2), closed: true };
    const out = filletCurve(square, 0.25, 4);
    expect(out.closed).toBe(true);
    expect(out.points).toHaveLength(4 * 5);
  });

  it('leaves straight corners and radius <= 0 untouched', () => {
    const line = {
      points: [
        [0, 0, 0],
        [1, 0, 0],
        [2, 0, 0],
      ] as [number, number, number][],
      closed: false,
    };
    expect(filletCurve(line, 0.5, 4).points).toEqual(line.points);
    expect(filletCurve(corner, 0, 4).points).toEqual(corner.points);
  });
});

describe('curve sampling ops (issue #115)', () => {
  // An open L-shape of total length 2 with unevenly spaced points.
  const open = {
    points: [
      [0, 0, 0],
      [1, 0, 0],
      [1, 1, 0],
    ] as [number, number, number][],
    closed: false,
    color: [1, 0, 0, 1] as [number, number, number, number],
  };

  describe('mapCurves', () => {
    it('rewrites curves and leaves points/meshes/pointColors alone', () => {
      const geo = {
        points: [[9, 9, 9]] as [number, number, number][],
        curves: [open],
        meshes: [],
        pointColors: [null],
      };
      const out = mapCurves(geo, reverseCurve);
      expect(out.points).toBe(geo.points);
      expect(out.pointColors).toBe(geo.pointColors);
      expect(out.curves[0]!.points[0]).toEqual([1, 1, 0]);
      expect(geo.curves[0]!.points[0]).toEqual([0, 0, 0]);
    });
  });

  describe('resampleCurve', () => {
    it('spaces an open curve evenly by arc length, keeping the endpoints', () => {
      const out = resampleCurve(open, 5);
      expect(out.points).toHaveLength(5);
      expect(out.points[0]).toEqual([0, 0, 0]);
      expect(out.points[4]).toEqual([1, 1, 0]);
      // Halfway along the length-2 path is the corner.
      expect(out.points[2]).toEqual([1, 0, 0]);
      expect(out.closed).toBe(false);
      expect(out.color).toEqual([1, 0, 0, 1]);
    });

    it('distributes a closed loop with no duplicate at the seam', () => {
      const square = {
        points: rectanglePoints(2, 2),
        closed: true,
      };
      const out = resampleCurve(square, 8);
      expect(out.points).toHaveLength(8);
      // Perimeter 8 → one point every unit; corners survive at every other step.
      expect(out.points[0]).toEqual([-1, -1, 0]);
      expect(out.points[1]).toEqual([0, -1, 0]);
      expect(out.points[2]).toEqual([1, -1, 0]);
    });

    it('copies degenerate curves unchanged', () => {
      const dot = { points: [[1, 1, 1]] as [number, number, number][], closed: false };
      expect(resampleCurve(dot, 10).points).toEqual(dot.points);
    });
  });

  describe('subdivideCurve', () => {
    it('inserts cuts per segment on open curves', () => {
      const out = subdivideCurve(open, 1);
      expect(out.points).toEqual([
        [0, 0, 0],
        [0.5, 0, 0],
        [1, 0, 0],
        [1, 0.5, 0],
        [1, 1, 0],
      ]);
    });

    it('subdivides the wrap-around segment of closed curves', () => {
      const triangle = {
        points: [
          [0, 0, 0],
          [1, 0, 0],
          [0, 1, 0],
        ] as [number, number, number][],
        closed: true,
      };
      expect(subdivideCurve(triangle, 1).points).toHaveLength(6);
    });

    it('returns a copy when cuts < 1', () => {
      const out = subdivideCurve(open, 0);
      expect(out.points).toEqual(open.points);
      expect(out.points).not.toBe(open.points);
    });
  });

  describe('reverseCurve', () => {
    it('flips point order and keeps the flags', () => {
      const out = reverseCurve(open);
      expect(out.points).toEqual([
        [1, 1, 0],
        [1, 0, 0],
        [0, 0, 0],
      ]);
      expect(out.closed).toBe(false);
      expect(out.color).toEqual([1, 0, 0, 1]);
    });
  });

  describe('trimCurve', () => {
    it('keeps the arc-length window of an open curve', () => {
      const out = trimCurve(open, 0.25, 0.75);
      expect(out.points).toEqual([
        [0.5, 0, 0],
        [1, 0, 0],
        [1, 0.5, 0],
      ]);
    });

    it('clamps and orders the bounds', () => {
      expect(trimCurve(open, -1, 2).points).toEqual(open.points);
      // end below start collapses to the start position.
      const collapsed = trimCurve(open, 0.5, 0.25);
      expect(collapsed.points).toEqual([
        [1, 0, 0],
        [1, 0, 0],
      ]);
    });

    it('passes closed curves through unchanged', () => {
      const loop = { points: rectanglePoints(1, 1), closed: true };
      expect(trimCurve(loop, 0.25, 0.75).points).toEqual(loop.points);
    });
  });
});
