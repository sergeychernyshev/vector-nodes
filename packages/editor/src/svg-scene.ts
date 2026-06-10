import type { Color, Geometry, Mesh, Point, Vector } from '@vector-nodes/runtime';

/** A 2D point in world space (X–Y plane), Z dropped. */
export type Point2 = [number, number];

/** A polyline/polygon outline projected to 2D. */
export interface SvgPolyline {
  points: Point2[];
  closed: boolean;
  /** Per-curve color (issue #80); `undefined` uses the renderer default. */
  color?: Color;
}

/** A projected mesh face polygon, carrying its mesh's color (issue #80). */
export interface SvgPolygon {
  points: Point2[];
  color?: Color;
}

/** Axis-aligned bounds in world space; `null` width/height stays >0 after padding. */
export interface SvgBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/** A flat, serializable description of the 2D scene — easy to unit-test. */
export interface SvgScene {
  points: Point2[];
  /** Per-point colors, index-aligned with `points` (issues #80, #85). */
  pointColors?: (Color | null)[];
  /** Curve outlines. */
  curves: SvgPolyline[];
  /** Mesh faces, each a closed polygon of projected vertices. */
  polygons: SvgPolygon[];
  bounds: SvgBounds;
}

/**
 * Build a single SVG path `d` that draws every point as a dot — one `M x y l 0 0`
 * subpath per point. Rendered with `stroke-linecap="round"`, each zero-length
 * segment paints a round dot, so N points become a single `<path>` element
 * (one React/DOM node) instead of N `<circle>`s.
 */
export function pointsPathD(points: readonly Point2[]): string {
  let d = '';
  for (const [x, y] of points) {
    d += `M${x} ${y}l0 0`;
  }
  return d;
}

/** Project a 3D vector to the X–Y plane, dropping Z. */
export function project(v: Vector): Point2 {
  return [v[0], v[1]];
}

const DEFAULT_BOUNDS: SvgBounds = { minX: -1, minY: -1, maxX: 1, maxY: 1 };

/** Bounds enclosing all 2D points, or a unit box when there are none. */
export function boundsOf(points: readonly Point2[]): SvgBounds {
  if (points.length === 0) return { ...DEFAULT_BOUNDS };
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of points) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return { minX, minY, maxX, maxY };
}

/** Resolve a face's vertex indices to projected 2D points, skipping bad indices. */
function facePolygon(positions: readonly Point[], face: readonly number[]): Point2[] {
  const polygon: Point2[] = [];
  for (const index of face) {
    const position = positions[index];
    if (position) polygon.push(project(position));
  }
  return polygon;
}

/** A projected polygon per mesh face, tagging each with its mesh color (#80). */
function meshPolygons(mesh: Mesh): SvgPolygon[] {
  const polygons: SvgPolygon[] = [];
  for (const face of mesh.faces) {
    const points = facePolygon(mesh.positions, face);
    if (points.length > 0) polygons.push(mesh.color ? { points, color: mesh.color } : { points });
  }
  return polygons;
}

/**
 * Build a flat 2D scene from a geometry bundle by projecting to X–Y (Z dropped):
 * bare points, curve outlines, and one polygon per mesh face. Pure and
 * unit-testable. The returned `bounds` enclose every projected coordinate.
 */
export function buildSvgScene(geometry: Geometry): SvgScene {
  const points = geometry.points.map(project);
  const curves: SvgPolyline[] = geometry.curves.map((curve) =>
    curve.color
      ? { points: curve.points.map(project), closed: curve.closed, color: curve.color }
      : { points: curve.points.map(project), closed: curve.closed },
  );
  const polygons: SvgPolygon[] = geometry.meshes.flatMap(meshPolygons);
  const all: Point2[] = [
    ...points,
    ...curves.flatMap((c) => c.points),
    ...polygons.flatMap((p) => p.points),
  ];
  const scene: SvgScene = { points, curves, polygons, bounds: boundsOf(all) };
  if (geometry.pointColors) scene.pointColors = geometry.pointColors;
  return scene;
}

/**
 * Pad bounds by a fraction of their largest extent (and inflate degenerate,
 * zero-size bounds) so content never sits flush against the viewport edge.
 */
export function padBounds(bounds: SvgBounds, fraction = 0.1): SvgBounds {
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;
  const extent = Math.max(width, height);
  const pad = (extent > 0 ? extent : 1) * fraction;
  return {
    minX: bounds.minX - pad,
    minY: bounds.minY - pad,
    maxX: bounds.maxX + pad,
    maxY: bounds.maxY + pad,
  };
}
