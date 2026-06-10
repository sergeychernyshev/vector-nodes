import { describe, expect, it } from 'vitest';

import {
  boxMesh,
  coneMesh,
  cylinderMesh,
  gridMesh,
  meshGeometry,
  planeMesh,
  uvSphere,
} from './mesh.js';

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
