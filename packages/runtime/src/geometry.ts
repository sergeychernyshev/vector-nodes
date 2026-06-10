import { ORIGIN, type Curve, type Geometry, type Point, type Vector } from './types.js';
import { add } from './vector.js';

/** Apply `fn` to every point in a geometry bundle (points, curves, meshes). */
export function transformGeometry(geo: Geometry, fn: (p: Vector) => Vector): Geometry {
  return {
    points: geo.points.map(fn),
    curves: geo.curves.map((c) => ({ ...c, points: c.points.map(fn) })),
    meshes: geo.meshes.map((m) => ({ ...m, positions: m.positions.map(fn) })),
  };
}

// --- Point-array construction -------------------------------------------------

/** Copy a list of vectors into a fresh point array. */
export function fromList(points: readonly Vector[]): Point[] {
  return points.map((p) => [p[0], p[1], p[2]]);
}

/**
 * `count` points evenly spaced from `start` to `end`, inclusive of both ends.
 * `count <= 0` yields an empty array; `count === 1` yields just `start`.
 */
export function linePoints(start: Vector, end: Vector, count: number): Point[] {
  if (count <= 0) return [];
  if (count === 1) return [[start[0], start[1], start[2]]];
  const out: Point[] = [];
  const last = count - 1;
  for (let i = 0; i < count; i++) {
    const t = i / last;
    out.push([
      start[0] + (end[0] - start[0]) * t,
      start[1] + (end[1] - start[1]) * t,
      start[2] + (end[2] - start[2]) * t,
    ]);
  }
  return out;
}

/**
 * A `countX × countY` grid of points on the XY plane, starting at the origin,
 * stepping by `spacingX`/`spacingY`. Row-major: x varies fastest.
 */
export function gridPoints(
  countX: number,
  countY: number,
  spacingX = 1,
  spacingY = spacingX,
): Point[] {
  const out: Point[] = [];
  for (let y = 0; y < countY; y++) {
    for (let x = 0; x < countX; x++) {
      out.push([x * spacingX, y * spacingY, 0]);
    }
  }
  return out;
}

/**
 * `count` points evenly distributed around a circle of `radius` on the XY plane,
 * centered at `center`, starting at angle 0 and going counter-clockwise.
 */
export function circlePoints(radius: number, count: number, center: Vector = ORIGIN): Point[] {
  const out: Point[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (2 * Math.PI * i) / count;
    out.push([
      center[0] + radius * Math.cos(angle),
      center[1] + radius * Math.sin(angle),
      center[2],
    ]);
  }
  return out;
}

/**
 * A deterministic PRNG (mulberry32) returning floats in `[0, 1)`. Used so
 * "random" geometry is reproducible from a seed.
 */
export function makeRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * `count` random points uniformly within the axis-aligned box `[min, max]`,
 * reproducible for a given `seed`.
 */
export function randomPoints(count: number, min: Vector, max: Vector, seed = 0): Point[] {
  const rng = makeRng(seed);
  const out: Point[] = [];
  for (let i = 0; i < count; i++) {
    out.push([
      min[0] + rng() * (max[0] - min[0]),
      min[1] + rng() * (max[1] - min[1]),
      min[2] + rng() * (max[2] - min[2]),
    ]);
  }
  return out;
}

// --- Projection ---------------------------------------------------------------

/** Orthographic projection onto the XY plane (drops z). */
export function projectOrthographic(p: Vector): Vector {
  return [p[0], p[1], 0];
}

/**
 * Perspective projection onto the XY plane from an eye at `[0, 0, distance]`.
 * A point on the plane (`z = 0`) is unchanged. If the point lies on the eye
 * plane (`z === distance`) the projection is undefined, so the unscaled `x, y`
 * are returned.
 */
export function projectPerspective(p: Vector, distance: number): Vector {
  const denom = distance - p[2];
  if (denom === 0) return [p[0], p[1], 0];
  const f = distance / denom;
  return [p[0] * f, p[1] * f, 0];
}

// --- Translation --------------------------------------------------------------

/** Move every point by `offset`. */
export function translatePoints(points: readonly Vector[], offset: Vector): Point[] {
  return points.map((p) => add(p, offset));
}

// --- Bezier -------------------------------------------------------------------

/** Evaluate a cubic Bézier with control points `p0..p3` at parameter `t`. */
export function cubicBezier(p0: Vector, p1: Vector, p2: Vector, p3: Vector, t: number): Vector {
  const u = 1 - t;
  const b0 = u * u * u;
  const b1 = 3 * u * u * t;
  const b2 = 3 * u * t * t;
  const b3 = t * t * t;
  return [
    b0 * p0[0] + b1 * p1[0] + b2 * p2[0] + b3 * p3[0],
    b0 * p0[1] + b1 * p1[1] + b2 * p2[1] + b3 * p3[1],
    b0 * p0[2] + b1 * p1[2] + b2 * p2[2] + b3 * p3[2],
  ];
}

/**
 * Sample a cubic Bézier into `segments + 1` points from `t = 0` to `t = 1`
 * inclusive. `segments < 1` is treated as 1.
 */
export function sampleCubicBezier(
  p0: Vector,
  p1: Vector,
  p2: Vector,
  p3: Vector,
  segments: number,
): Point[] {
  const n = segments < 1 ? 1 : Math.floor(segments);
  const out: Point[] = [];
  for (let i = 0; i <= n; i++) {
    out.push(cubicBezier(p0, p1, p2, p3, i / n));
  }
  return out;
}

// --- Curves & combinators -----------------------------------------------------

/** A closed polygon of `count` points on a circle of `radius` in the X–Y plane. */
export function circleCurve(radius: number, count: number): Curve {
  return { points: circlePoints(radius, count), closed: true };
}

/** An open polyline through the given points. */
export function polyline(points: readonly Vector[], closed = false): Curve {
  return { points: fromList(points), closed };
}

/** A geometry bundle containing a single curve. */
export function curveGeometry(curve: Curve): Geometry {
  return { points: [], curves: [curve], meshes: [] };
}

/** Concatenate two geometry bundles. */
export function mergeGeometry(a: Geometry, b: Geometry): Geometry {
  return {
    points: [...a.points, ...b.points],
    curves: [...a.curves, ...b.curves],
    meshes: [...a.meshes, ...b.meshes],
  };
}

/** Concatenate any number of geometry bundles (empty when none). */
export function mergeAll(geometries: readonly Geometry[]): Geometry {
  return geometries.reduce(mergeGeometry, { points: [], curves: [], meshes: [] });
}

/** Every point referenced by a geometry bundle (points, curves, mesh positions). */
export function allPoints(geo: Geometry): Point[] {
  return [
    ...geo.points,
    ...geo.curves.flatMap((c) => c.points),
    ...geo.meshes.flatMap((m) => m.positions),
  ];
}

/** The 8 corners of a geometry's axis-aligned bounding box (empty if no points). */
export function boundingBox(geo: Geometry): Point[] {
  const pts = allPoints(geo);
  if (pts.length === 0) return [];
  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;
  for (const [x, y, z] of pts) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (z < minZ) minZ = z;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
    if (z > maxZ) maxZ = z;
  }
  const xs = [minX, maxX];
  const ys = [minY, maxY];
  const zs = [minZ, maxZ];
  const corners: Point[] = [];
  for (const x of xs) for (const y of ys) for (const z of zs) corners.push([x, y, z]);
  return corners;
}

/** Place a copy of `instance` at every point in `points`, merged into one bundle. */
export function instanceOnPoints(instance: Geometry, points: readonly Vector[]): Geometry {
  return points
    .map((p) => transformGeometry(instance, (q) => [q[0] + p[0], q[1] + p[1], q[2] + p[2]]))
    .reduce(mergeGeometry, { points: [], curves: [], meshes: [] });
}
