import { ORIGIN, type Color, type Curve, type Geometry, type Point, type Vector } from './types.js';
import {
  add,
  cross,
  distance,
  dot,
  length,
  normalize,
  rotateAxisAngle,
  scale,
  sub,
} from './vector.js';

/**
 * Apply `fn` to every point in a geometry bundle (points, curves, meshes).
 * Per-element colors are preserved: the spreads keep each curve/mesh `color`,
 * and `pointColors` is carried through unchanged since points map 1:1 (#80).
 */
export function transformGeometry(geo: Geometry, fn: (p: Vector) => Vector): Geometry {
  const out: Geometry = {
    points: geo.points.map(fn),
    curves: geo.curves.map((c) => ({ ...c, points: c.points.map(fn) })),
    meshes: geo.meshes.map((m) => ({ ...m, positions: m.positions.map(fn) })),
  };
  if (geo.pointColors) out.pointColors = geo.pointColors;
  return out;
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

/** Evaluate a quadratic Bézier with control points `p0..p2` at parameter `t`. */
export function quadraticBezier(p0: Vector, p1: Vector, p2: Vector, t: number): Vector {
  const u = 1 - t;
  const b0 = u * u;
  const b1 = 2 * u * t;
  const b2 = t * t;
  return [
    b0 * p0[0] + b1 * p1[0] + b2 * p2[0],
    b0 * p0[1] + b1 * p1[1] + b2 * p2[1],
    b0 * p0[2] + b1 * p1[2] + b2 * p2[2],
  ];
}

/**
 * Sample a quadratic Bézier into `segments + 1` points from `t = 0` to `t = 1`
 * inclusive. `segments < 1` is treated as 1.
 */
export function sampleQuadraticBezier(
  p0: Vector,
  p1: Vector,
  p2: Vector,
  segments: number,
): Point[] {
  const n = segments < 1 ? 1 : Math.floor(segments);
  const out: Point[] = [];
  for (let i = 0; i <= n; i++) {
    out.push(quadraticBezier(p0, p1, p2, i / n));
  }
  return out;
}

// --- Curve primitives (issue #114) ----------------------------------------------

/**
 * Vertices of a star polygon in the X–Y plane: `points` outer tips alternating
 * with inner vertices, starting at angle 0 (an outer tip) and going
 * counter-clockwise. `points < 2` is treated as 2.
 */
export function starPoints(points: number, innerRadius: number, outerRadius: number): Point[] {
  const tips = points < 2 ? 2 : Math.floor(points);
  const out: Point[] = [];
  for (let i = 0; i < tips * 2; i++) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = (Math.PI * i) / tips;
    out.push([radius * Math.cos(angle), radius * Math.sin(angle), 0]);
  }
  return out;
}

/**
 * `segments + 1` points along a circular arc of `radius` in the X–Y plane,
 * starting at `startAngle` and sweeping `sweepAngle` radians counter-clockwise.
 * `segments < 1` is treated as 1.
 */
export function arcPoints(
  radius: number,
  startAngle: number,
  sweepAngle: number,
  segments: number,
): Point[] {
  const n = segments < 1 ? 1 : Math.floor(segments);
  const out: Point[] = [];
  for (let i = 0; i <= n; i++) {
    const angle = startAngle + (sweepAngle * i) / n;
    out.push([radius * Math.cos(angle), radius * Math.sin(angle), 0]);
  }
  return out;
}

/**
 * `segments + 1` points along a spiral of `turns` counter-clockwise revolutions:
 * the radius interpolates `startRadius → endRadius` and `z` rises linearly to
 * `height` (0 keeps it flat). `segments < 1` is treated as 1.
 */
export function spiralPoints(
  turns: number,
  startRadius: number,
  endRadius: number,
  height: number,
  segments: number,
): Point[] {
  const n = segments < 1 ? 1 : Math.floor(segments);
  const out: Point[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const angle = 2 * Math.PI * turns * t;
    const radius = startRadius + (endRadius - startRadius) * t;
    out.push([radius * Math.cos(angle), radius * Math.sin(angle), height * t]);
  }
  return out;
}

/**
 * The sweep angle `θ` (radians) of an Archimedean spiral `r = (radius/θ)·t` that
 * reaches `radius` with total arc length `arcLength`. Arc length is monotonic in
 * `θ` from `radius` (a straight spoke, `θ → 0`) upward, so this requires
 * `arcLength > radius` and solves by bisection.
 */
function spiralAngleForLength(radius: number, arcLength: number): number {
  // L(θ) = (radius/2)·(√(1+θ²) + asinh(θ)/θ): the curve length when the pitch is
  // fit so radius is reached at θ. L(0⁺) = radius and L increases without bound.
  const lengthAt = (theta: number) =>
    (radius / 2) * (Math.sqrt(1 + theta * theta) + Math.asinh(theta) / theta);
  let lo = 1e-6;
  let hi = 1;
  while (lengthAt(hi) < arcLength) hi *= 2;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (lengthAt(mid) < arcLength) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** The farthest distance from `from` to any point referenced by `geo` (0 if none). */
function maxRadiusFrom(geo: Geometry, from: Vector): number {
  let max = 0;
  for (const p of allPoints(geo)) {
    const d = distance(from, p);
    if (d > max) max = d;
  }
  return max;
}

/**
 * An open Archimedean spiral that fills a container. The spiral is anchored at
 * `center`, begins at polar angle `startAngle`, and winds counter-clockwise
 * outward. Its coil spacing (pitch) is fit automatically so the outermost coil
 * reaches the farthest point of `container` from `center` — so the spiral spans
 * (fills) the container — while the curve's total arc length equals `arcLength`.
 * A longer `arcLength` packs more, tighter coils into the same region; a shorter
 * one draws fewer, looser coils. `resolution` is the number of sampled points
 * per full turn (`< 1` treated as 1).
 *
 * Degenerate cases return a short open curve: an empty or zero-extent container,
 * or `arcLength <= 0`, yields just `center`; an `arcLength` too small to reach
 * the container edge (`<= radius`) yields a straight radial spoke of that length.
 */
export function fillSpiralCurve(
  container: Geometry,
  center: Vector,
  startAngle: number,
  arcLength: number,
  resolution: number,
): Curve {
  const radius = maxRadiusFrom(container, center);
  if (radius <= 0 || arcLength <= 0) {
    return { points: [[center[0], center[1], center[2]]], closed: false };
  }
  if (arcLength <= radius) {
    // Too short to spiral out to the edge: a straight radial spoke at startAngle.
    return {
      points: [
        [center[0], center[1], center[2]],
        [
          center[0] + arcLength * Math.cos(startAngle),
          center[1] + arcLength * Math.sin(startAngle),
          center[2],
        ],
      ],
      closed: false,
    };
  }
  const thetaMax = spiralAngleForLength(radius, arcLength);
  const b = radius / thetaMax;
  const res = resolution < 1 ? 1 : Math.floor(resolution);
  const turns = thetaMax / (2 * Math.PI);
  const count = Math.max(2, Math.ceil(res * turns) + 1);
  const points: Point[] = [];
  for (let i = 0; i < count; i++) {
    const theta = (thetaMax * i) / (count - 1);
    const r = b * theta;
    const ang = startAngle + theta;
    points.push([center[0] + r * Math.cos(ang), center[1] + r * Math.sin(ang), center[2]]);
  }
  return { points, closed: false };
}

/** The four corners of a `width × height` rectangle centered on the origin. */
export function rectanglePoints(width: number, height: number): Point[] {
  const w = width / 2;
  const h = height / 2;
  return [
    [-w, -h, 0],
    [w, -h, 0],
    [w, h, 0],
    [-w, h, 0],
  ];
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

// --- Curve sampling ops (issue #115) --------------------------------------------

/**
 * Apply `fn` to every curve in a bundle, leaving points and meshes (and
 * `pointColors`) untouched.
 */
export function mapCurves(geo: Geometry, fn: (curve: Curve) => Curve): Geometry {
  return { ...geo, curves: geo.curves.map(fn) };
}

/**
 * Cumulative arc lengths along a curve's segments: entry `i` is the distance
 * from the start to point `i`; `closed` appends the wrap-around segment.
 */
function cumulativeLengths(points: readonly Point[], closed: boolean): number[] {
  const cums = [0];
  for (let i = 1; i < points.length; i++) {
    cums.push(cums[i - 1]! + distance(points[i - 1]!, points[i]!));
  }
  if (closed && points.length > 1) {
    cums.push(cums[points.length - 1]! + distance(points[points.length - 1]!, points[0]!));
  }
  return cums;
}

/** The position at arc length `target` (clamped), lerped along the segments. */
function pointAtArcLength(points: readonly Point[], cums: number[], target: number): Point {
  const total = cums[cums.length - 1]!;
  const t = Math.min(Math.max(target, 0), total);
  let i = 0;
  while (i < cums.length - 2 && cums[i + 1]! < t) i++;
  const a = points[i % points.length]!;
  const b = points[(i + 1) % points.length]!;
  const segLen = cums[i + 1]! - cums[i]!;
  const f = segLen === 0 ? 0 : (t - cums[i]!) / segLen;
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
}

/**
 * Redistribute a curve to `count` evenly spaced points by arc length. Open
 * curves keep both endpoints (`count` points from start to end inclusive);
 * closed curves get `count` points around the loop with no duplicate at the
 * seam. `count < 2` is treated as 2; degenerate curves (fewer than 2 points or
 * zero length) are returned as copies.
 */
export function resampleCurve(curve: Curve, count: number): Curve {
  const n = count < 2 ? 2 : Math.floor(count);
  const pts = curve.points;
  if (pts.length < 2) return { ...curve, points: fromList(pts) };
  const cums = cumulativeLengths(pts, curve.closed);
  const total = cums[cums.length - 1]!;
  if (total === 0) return { ...curve, points: fromList(pts) };
  const steps = curve.closed ? n : n - 1;
  const out: Point[] = [];
  for (let i = 0; i < n; i++) {
    out.push(pointAtArcLength(pts, cums, (total * i) / steps));
  }
  return { ...curve, points: out };
}

/**
 * Insert `cuts` evenly spaced points into every segment (the wrap-around
 * segment included for closed curves). `cuts < 1` returns a copy.
 */
export function subdivideCurve(curve: Curve, cuts: number): Curve {
  const k = Math.floor(cuts);
  const pts = curve.points;
  if (k < 1 || pts.length < 2) return { ...curve, points: fromList(pts) };
  const segs = curve.closed ? pts.length : pts.length - 1;
  const out: Point[] = [];
  for (let i = 0; i < segs; i++) {
    const a = pts[i]!;
    const b = pts[(i + 1) % pts.length]!;
    out.push([a[0], a[1], a[2]]);
    for (let j = 1; j <= k; j++) {
      const f = j / (k + 1);
      out.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f]);
    }
  }
  if (!curve.closed) {
    const last = pts[pts.length - 1]!;
    out.push([last[0], last[1], last[2]]);
  }
  return { ...curve, points: out };
}

/** Reverse a curve's point order (closed/color preserved). */
export function reverseCurve(curve: Curve): Curve {
  return { ...curve, points: fromList(curve.points).reverse() };
}

// --- Fillet (issue #116) --------------------------------------------------------

/**
 * The fillet arc replacing one corner `p` (between `prev` and `next`): a
 * circular arc tangent to both segments, sampled as `res` segments (`res + 1`
 * points, tangent point to tangent point). Straight, spiked, or degenerate
 * corners return the corner itself.
 */
function filletCorner(prev: Point, p: Point, next: Point, radius: number, res: number): Point[] {
  const toPrev = sub(prev, p);
  const toNext = sub(next, p);
  const lenPrev = length(toPrev);
  const lenNext = length(toNext);
  if (lenPrev === 0 || lenNext === 0) return [[p[0], p[1], p[2]]];
  const d1 = scale(toPrev, 1 / lenPrev);
  const d2 = scale(toNext, 1 / lenNext);
  const theta = Math.acos(Math.min(Math.max(dot(d1, d2), -1), 1));
  // Straight corners (θ≈π) have nothing to round; spikes (θ≈0) collapse.
  if (theta < 1e-9 || Math.PI - theta < 1e-9) return [[p[0], p[1], p[2]]];
  const half = theta / 2;
  // Tangent offset for the requested radius, capped at half the shorter
  // adjacent segment (which shrinks the effective radius to match).
  const t = Math.min(radius / Math.tan(half), Math.min(lenPrev, lenNext) / 2);
  const r = t * Math.tan(half);
  if (r <= 0) return [[p[0], p[1], p[2]]];
  const t1 = add(p, scale(d1, t));
  const t2 = add(p, scale(d2, t));
  const center = add(p, scale(normalize(add(d1, d2)), r / Math.sin(half)));
  const v1 = sub(t1, center);
  const v2 = sub(t2, center);
  // Right-hand rule: rotating v1 about cross(v1, v2) by the arc angle (≤ π)
  // always sweeps toward v2.
  const axis = cross(v1, v2);
  const axisLen = length(axis);
  if (axisLen === 0) return [[p[0], p[1], p[2]]];
  const n = scale(axis, 1 / axisLen);
  const phi = Math.acos(Math.min(Math.max(dot(v1, v2) / (r * r), -1), 1));
  const out: Point[] = [];
  for (let j = 0; j <= res; j++) {
    out.push(add(center, rotateAxisAngle(v1, n, (phi * j) / res)));
  }
  return out;
}

/**
 * Round a curve's corners (issue #116): every interior corner — and, for
 * closed curves, every corner including the wrap-around — is replaced by a
 * circular arc tangent to both adjacent segments, sampled as `resolution` arc
 * segments. `radius` is the target arc radius; where adjacent segments are too
 * short the tangent offset is capped at half the shorter one, shrinking the
 * effective radius. `radius <= 0`, short curves, and straight corners pass
 * through unchanged. Color and the closed flag are preserved.
 */
export function filletCurve(curve: Curve, radius: number, resolution: number): Curve {
  const pts = curve.points;
  const res = resolution < 1 ? 1 : Math.floor(resolution);
  const corners = curve.closed ? pts.length : pts.length - 2;
  if (radius <= 0 || pts.length < 3 || corners < 1) {
    return { ...curve, points: fromList(pts) };
  }
  const out: Point[] = [];
  const first = pts[0]!;
  if (!curve.closed) out.push([first[0], first[1], first[2]]);
  for (let k = 0; k < corners; k++) {
    const i = curve.closed ? k : k + 1;
    const prev = pts[(i - 1 + pts.length) % pts.length]!;
    const next = pts[(i + 1) % pts.length]!;
    out.push(...filletCorner(prev, pts[i]!, next, radius, res));
  }
  const last = pts[pts.length - 1]!;
  if (!curve.closed) out.push([last[0], last[1], last[2]]);
  return { ...curve, points: out };
}

/**
 * Keep the arc-length fraction `[start, end]` of an open curve (both clamped
 * to `[0, 1]`, `end` to at least `start`). Closed and degenerate curves are
 * returned as copies — trimming applies to open strokes.
 */
export function trimCurve(curve: Curve, start: number, end: number): Curve {
  const pts = curve.points;
  if (curve.closed || pts.length < 2) return { ...curve, points: fromList(pts) };
  const s = Math.min(Math.max(start, 0), 1);
  const e = Math.min(Math.max(end, s), 1);
  const cums = cumulativeLengths(pts, false);
  const total = cums[cums.length - 1]!;
  if (total === 0) return { ...curve, points: fromList(pts) };
  const from = total * s;
  const to = total * e;
  const out: Point[] = [pointAtArcLength(pts, cums, from)];
  for (let i = 1; i < pts.length - 1; i++) {
    if (cums[i]! > from && cums[i]! < to) {
      const p = pts[i]!;
      out.push([p[0], p[1], p[2]]);
    }
  }
  out.push(pointAtArcLength(pts, cums, to));
  return { ...curve, points: out };
}

/** Per-point colors padded/truncated to `points.length` (`null` = default). */
function pointColorsOf(geo: Geometry): (Color | null)[] {
  const colors = geo.pointColors ?? [];
  return geo.points.map((_, i) => colors[i] ?? null);
}

/**
 * Concatenate two geometry bundles, preserving each side's per-element colors
 * (issue #85). `pointColors` is materialized only when either side carries
 * point colors, so colorless merges stay free of the extra array.
 */
export function mergeGeometry(a: Geometry, b: Geometry): Geometry {
  const merged: Geometry = {
    points: [...a.points, ...b.points],
    curves: [...a.curves, ...b.curves],
    meshes: [...a.meshes, ...b.meshes],
  };
  if (a.pointColors || b.pointColors) {
    merged.pointColors = [...pointColorsOf(a), ...pointColorsOf(b)];
  }
  return merged;
}

/** Concatenate any number of geometry bundles (empty when none). */
export function mergeAll(geometries: readonly Geometry[]): Geometry {
  return geometries.reduce(mergeGeometry, { points: [], curves: [], meshes: [] });
}

/**
 * Apply a display color to every element of a geometry bundle (issues #80, #85):
 * each curve and mesh is tagged, and every bare point gets the color. Because
 * the color rides on the elements, it survives later transforms and merges.
 */
export function colorGeometry(geometry: Geometry, color: Color): Geometry {
  return {
    points: geometry.points,
    pointColors: geometry.points.map(() => color),
    curves: geometry.curves.map((c) => ({ ...c, color })),
    meshes: geometry.meshes.map((m) => ({ ...m, color })),
  };
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
