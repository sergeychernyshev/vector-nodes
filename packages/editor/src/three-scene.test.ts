import type { Geometry } from '@vector-nodes/runtime';
import { Line, LineLoop, Mesh as ThreeMesh, Points } from 'three';
import { describe, expect, it } from 'vitest';

import { buildGeometryGroup, buildMesh, disposeGroup, triangulateFace } from './three-scene';

function geometry(partial: Partial<Geometry>): Geometry {
  return { points: [], curves: [], meshes: [], ...partial };
}

describe('triangulateFace', () => {
  it('passes a triangle through unchanged', () => {
    expect(triangulateFace([0, 1, 2])).toEqual([0, 1, 2]);
  });

  it('fan-triangulates a quad into two triangles', () => {
    expect(triangulateFace([0, 1, 2, 3])).toEqual([0, 1, 2, 0, 2, 3]);
  });
});

describe('buildGeometryGroup', () => {
  it('adds a single Points object for bare points', () => {
    const group = buildGeometryGroup(
      geometry({
        points: [
          [0, 0, 0],
          [1, 1, 0],
        ],
      }),
    );
    const points = group.children.filter((c) => c instanceof Points);
    expect(points).toHaveLength(1);
    expect((points[0] as Points).geometry.getAttribute('position').count).toBe(2);
  });

  it('uses LineLoop for closed curves and Line for open ones', () => {
    const group = buildGeometryGroup(
      geometry({
        curves: [
          {
            points: [
              [0, 0, 0],
              [1, 0, 0],
            ],
            closed: false,
          },
          {
            points: [
              [0, 0, 0],
              [1, 0, 0],
              [1, 1, 0],
            ],
            closed: true,
          },
        ],
      }),
    );
    expect(group.children.some((c) => c instanceof LineLoop)).toBe(true);
    expect(group.children.some((c) => c instanceof Line && !(c instanceof LineLoop))).toBe(true);
  });

  it('builds a mesh with indexed, triangulated faces', () => {
    const group = buildGeometryGroup(
      geometry({
        meshes: [
          {
            positions: [
              [0, 0, 0],
              [1, 0, 0],
              [1, 1, 0],
              [0, 1, 0],
            ],
            faces: [[0, 1, 2, 3]],
          },
        ],
      }),
    );
    const mesh = group.children.find((c) => c instanceof ThreeMesh) as ThreeMesh;
    expect(mesh).toBeDefined();
    // Quad → two triangles → 6 indices.
    expect(mesh.geometry.getIndex()?.count).toBe(6);
  });

  it('omits the points object when there are no points', () => {
    const group = buildGeometryGroup(geometry({}));
    expect(group.children).toHaveLength(0);
  });
});

describe('disposeGroup', () => {
  it('clears all children', () => {
    const group = buildMeshGroup();
    disposeGroup(group);
    expect(group.children).toHaveLength(0);
  });
});

function buildMeshGroup() {
  const group = buildGeometryGroup(geometry({}));
  group.add(
    buildMesh({
      positions: [
        [0, 0, 0],
        [1, 0, 0],
        [1, 1, 0],
      ],
      faces: [[0, 1, 2]],
    }),
  );
  return group;
}
