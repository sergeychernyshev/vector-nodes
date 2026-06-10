import type { Color as GeometryColor, Curve, Geometry, Mesh, Point } from '@vector-nodes/runtime';
import {
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  Group,
  Line,
  LineBasicMaterial,
  LineLoop,
  Mesh as ThreeMesh,
  MeshStandardMaterial,
  Points,
  PointsMaterial,
} from 'three';

/** Colors for the three geometry kinds, tuned to read on a dark backdrop. */
export const PREVIEW_COLORS = {
  point: 0xffd34d,
  curve: 0x4a90d9,
  mesh: 0x8a8f98,
} as const;

/** Convert an RGBA geometry color (0..1) to a 0xRRGGBB number for three.js. */
export function colorToHex(color: GeometryColor): number {
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(v * 255)));
  return (ch(color[0]) << 16) | (ch(color[1]) << 8) | ch(color[2]);
}

/** Flatten a list of points into a packed `[x, y, z, x, y, z, …]` array. */
function flattenPoints(points: readonly Point[]): Float32Array {
  const data = new Float32Array(points.length * 3);
  let i = 0;
  for (const [x, y, z] of points) {
    data[i] = x;
    data[i + 1] = y;
    data[i + 2] = z;
    i += 3;
  }
  return data;
}

/** A `THREE.Points` cloud for the bare points of a geometry bundle. */
export function buildPoints(
  points: readonly Point[],
  color: number = PREVIEW_COLORS.point,
): Points {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(flattenPoints(points), 3));
  const material = new PointsMaterial({ color, size: 0.08 });
  return new Points(geometry, material);
}

/** A `THREE.Line` (or `LineLoop` when closed) for a single curve. */
export function buildCurve(curve: Curve, color: number = PREVIEW_COLORS.curve): Line {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(flattenPoints(curve.points), 3));
  const material = new LineBasicMaterial({ color });
  return curve.closed ? new LineLoop(geometry, material) : new Line(geometry, material);
}

/**
 * Fan-triangulate a polygon face into a flat list of triangle indices. A face
 * `[a, b, c, d]` becomes triangles `(a,b,c)` and `(a,c,d)`.
 */
export function triangulateFace(face: readonly number[]): number[] {
  const indices: number[] = [];
  const [anchor] = face;
  if (anchor === undefined) return indices;
  for (let i = 1; i + 1 < face.length; i += 1) {
    indices.push(anchor, face[i] as number, face[i + 1] as number);
  }
  return indices;
}

/** A `THREE.Mesh` for a single mesh, fan-triangulating each face. */
export function buildMesh(mesh: Mesh, color: number = PREVIEW_COLORS.mesh): ThreeMesh {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(flattenPoints(mesh.positions), 3));
  const indices = mesh.faces.flatMap(triangulateFace);
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const material = new MeshStandardMaterial({
    color,
    metalness: 0.1,
    roughness: 0.8,
    flatShading: true,
    side: DoubleSide,
  });
  return new ThreeMesh(geometry, material);
}

/**
 * Build a `THREE.Group` containing all renderable objects for a geometry
 * bundle: a single points cloud, one line per curve, and one mesh per mesh.
 * Pure — does not touch a WebGL context, so it is unit-testable.
 */
export function buildGeometryGroup(geometry: Geometry): Group {
  const group = new Group();
  // A bundle color (issue #55) overrides the per-kind defaults.
  const c = geometry.color ? colorToHex(geometry.color) : undefined;
  if (geometry.points.length > 0) {
    group.add(buildPoints(geometry.points, c ?? PREVIEW_COLORS.point));
  }
  for (const curve of geometry.curves) {
    group.add(buildCurve(curve, c ?? PREVIEW_COLORS.curve));
  }
  for (const mesh of geometry.meshes) {
    group.add(buildMesh(mesh, c ?? PREVIEW_COLORS.mesh));
  }
  return group;
}

/** Dispose every geometry and material under a group, then clear it. */
export function disposeGroup(group: Group): void {
  for (const child of group.children) {
    if (child instanceof Points || child instanceof Line || child instanceof ThreeMesh) {
      child.geometry.dispose();
      const material = child.material;
      if (Array.isArray(material)) {
        for (const m of material) m.dispose();
      } else {
        material.dispose();
      }
    }
  }
  group.clear();
}
