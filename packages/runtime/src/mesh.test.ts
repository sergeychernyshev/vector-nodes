import { describe, expect, it } from 'vitest';

import { starPoints } from './geometry.js';
import {
  boxMesh,
  coneMesh,
  cylinderMesh,
  earClipPolygon,
  fillCurves,
  gridMesh,
  meshGeometry,
  planeMesh,
  uvSphere,
} from './mesh.js';
import type { Point } from './types.js';

/** Total unsigned area of `tris` (index triples into `points`), over x/y. */
function triangleArea(points: readonly Point[], tris: number[][]): number {
  let total = 0;
  for (const [ia, ib, ic] of tris) {
    const a = points[ia!]!;
    const b = points[ib!]!;
    const c = points[ic!]!;
    total += Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])) / 2;
  }
  return total;
}

describe('mesh primitives', () => {
  it('planeMesh is one centered quad', () => {
    const m = planeMesh(2, 2);
    expect(m.positions).toHaveLength(4);
    expect(m.faces).toEqual([[0, 1, 2, 3]]);
    expect(m.positions).toContainEqual([-1, -1, 0]);
    expect(m.positions).toContainEqual([1, 1, 0]);
  });

  it('boxMesh has 8 corners and 6 faces', () => {
    const m = boxMesh(2, 2, 2);
    expect(m.positions).toHaveLength(8);
    expect(m.faces).toHaveLength(6);
    expect(m.positions).toContainEqual([-1, -1, -1]);
    expect(m.positions).toContainEqual([1, 1, 1]);
  });

  it('gridMesh has (nx+1)(ny+1) verts and nx*ny quads', () => {
    const m = gridMesh(3, 2, 6, 4);
    expect(m.positions).toHaveLength(4 * 3);
    expect(m.faces).toHaveLength(6);
    expect(m.faces[0]).toHaveLength(4);
  });

  it('uvSphere / cylinder / cone produce non-empty meshes', () => {
    expect(uvSphere(1, 8, 4).faces.length).toBeGreaterThan(0);
    const cyl = cylinderMesh(1, 2, 6);
    expect(cyl.positions).toHaveLength(12); // two rings of 6
    expect(cyl.faces).toHaveLength(6 + 2); // sides + two caps
    const cone = coneMesh(1, 2, 5);
    expect(cone.positions).toHaveLength(6); // base ring + apex
    expect(cone.faces).toHaveLength(5 + 1); // sides + base
  });

  it('meshGeometry wraps a mesh in a bundle', () => {
    const g = meshGeometry(planeMesh(1, 1));
    expect(g.meshes).toHaveLength(1);
    expect(g.points).toEqual([]);
  });
});

describe('earClipPolygon (issue #117)', () => {
  it('triangulates a square into two triangles covering its area', () => {
    const square: Point[] = [
      [0, 0, 0],
      [2, 0, 0],
      [2, 2, 0],
      [0, 2, 0],
    ];
    const tris = earClipPolygon(square);
    expect(tris).toHaveLength(2);
    expect(triangleArea(square, tris)).toBeCloseTo(4, 9);
  });

  it('handles a concave outline (n - 2 triangles, exact area)', () => {
    // An L-shape: a 2×2 square with the top-right 1×1 corner cut out.
    const ell: Point[] = [
      [0, 0, 0],
      [2, 0, 0],
      [2, 1, 0],
      [1, 1, 0],
      [1, 2, 0],
      [0, 2, 0],
    ];
    const tris = earClipPolygon(ell);
    expect(tris).toHaveLength(4);
    expect(triangleArea(ell, tris)).toBeCloseTo(3, 9);
  });

  it('accepts clockwise winding', () => {
    const cw: Point[] = [
      [0, 0, 0],
      [0, 2, 0],
      [2, 2, 0],
      [2, 0, 0],
    ];
    const tris = earClipPolygon(cw);
    expect(triangleArea(cw, tris)).toBeCloseTo(4, 9);
  });

  it('triangulates a concave star exactly', () => {
    const star = starPoints(5, 0.5, 1);
    const tris = earClipPolygon(star);
    expect(tris).toHaveLength(star.length - 2);
  });

  it('returns nothing for degenerate input', () => {
    expect(earClipPolygon([[0, 0, 0]])).toEqual([]);
  });
});

describe('fillCurves (issue #117)', () => {
  it('turns closed curves into colored meshes and keeps open ones', () => {
    const geo = {
      points: [[9, 9, 9]] as Point[],
      curves: [
        {
          points: [
            [0, 0, 0],
            [1, 0, 0],
            [1, 1, 0],
            [0, 1, 0],
          ] as Point[],
          closed: true,
          color: [1, 0, 0, 1] as [number, number, number, number],
        },
        {
          points: [
            [0, 0, 0],
            [1, 1, 0],
          ] as Point[],
          closed: false,
        },
      ],
      meshes: [],
      pointColors: [null],
    };
    const out = fillCurves(geo);
    expect(out.meshes).toHaveLength(1);
    expect(out.meshes[0]!.positions).toEqual(geo.curves[0]!.points);
    expect(out.meshes[0]!.faces).toHaveLength(2);
    expect(out.meshes[0]!.color).toEqual([1, 0, 0, 1]);
    expect(out.curves).toHaveLength(1);
    expect(out.curves[0]!.closed).toBe(false);
    expect(out.points).toEqual([[9, 9, 9]]);
    expect(out.pointColors).toEqual([null]);
  });

  it('passes untriangulatable closed curves through unchanged', () => {
    const degenerate = {
      points: [] as Point[],
      curves: [
        {
          points: [
            [0, 0, 0],
            [1, 1, 0],
          ] as Point[],
          closed: true,
        },
      ],
      meshes: [],
    };
    const out = fillCurves(degenerate);
    expect(out.meshes).toHaveLength(0);
    expect(out.curves).toHaveLength(1);
  });
});
