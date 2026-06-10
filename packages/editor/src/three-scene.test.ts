import type { Geometry } from '@vector-nodes/runtime';
import { Line, LineBasicMaterial, LineLoop, Mesh as ThreeMesh, Points } from 'three';
import { describe, expect, it } from 'vitest';

import {
  buildGeometryGroup,
  buildMesh,
  colorToHex,
  disposeGroup,
  triangulateFace,
} from './three-scene';
import { PointsMaterial } from 'three';

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

describe('colorToHex (issue #55)', () => {
  it('packs RGBA components (0..1) into 0xRRGGBB, ignoring alpha', () => {
    expect(colorToHex([1, 0, 0, 1])).toBe(0xff0000);
    expect(colorToHex([0, 1, 0, 1])).toBe(0x00ff00);
    expect(colorToHex([0, 0, 1, 0.5])).toBe(0x0000ff);
  });
});

describe('buildGeometryGroup', () => {
  it('colors points from per-point colors (issues #80, #85)', () => {
    const group = buildGeometryGroup(
      geometry({ points: [[0, 0, 0]], pointColors: [[1, 0, 0, 1]] }),
    );
    const points = group.children.find((c) => c instanceof Points) as Points;
    expect((points.material as PointsMaterial).color.getHex()).toBe(0xff0000);
  });

  it('groups points into one cloud per distinct color (issue #85)', () => {
    const group = buildGeometryGroup(
      geometry({
        points: [
          [0, 0, 0],
          [1, 0, 0],
          [2, 0, 0],
        ],
        // Two red, one blue → two Points clouds.
        pointColors: [
          [1, 0, 0, 1],
          [1, 0, 0, 1],
          [0, 0, 1, 1],
        ],
      }),
    );
    const clouds = group.children.filter((c) => c instanceof Points) as Points[];
    expect(clouds).toHaveLength(2);
    const hexes = clouds
      .map((c) => (c.material as PointsMaterial).color.getHex())
      .sort((a, b) => a - b);
    expect(hexes).toEqual([0x0000ff, 0xff0000]);
  });

  it('colors a curve from its own color (issue #80)', () => {
    const group = buildGeometryGroup(
      geometry({ curves: [{ points: [[0, 0, 0]], closed: false, color: [0, 1, 0, 1] }] }),
    );
    const line = group.children.find((c) => c instanceof Line) as Line;
    expect((line.material as LineBasicMaterial).color.getHex()).toBe(0x00ff00);
  });

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
