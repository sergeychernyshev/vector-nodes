import type { Geometry } from '@vector-nodes/runtime';
import { describe, expect, it } from 'vitest';

import { boundsOf, buildSvgScene, padBounds, pointsPathD, project } from './svg-scene';

function geometry(partial: Partial<Geometry>): Geometry {
  return { points: [], curves: [], meshes: [], ...partial };
}

describe('project', () => {
  it('drops the Z component', () => {
    expect(project([1, 2, 3])).toEqual([1, 2]);
  });
});

describe('pointsPathD', () => {
  it('builds one zero-length subpath per point', () => {
    expect(
      pointsPathD([
        [0, 0],
        [1, 2],
      ]),
    ).toBe('M0 0l0 0M1 2l0 0');
  });

  it('is empty for no points', () => {
    expect(pointsPathD([])).toBe('');
  });
});

describe('boundsOf', () => {
  it('returns a unit box when there are no points', () => {
    expect(boundsOf([])).toEqual({ minX: -1, minY: -1, maxX: 1, maxY: 1 });
  });

  it('encloses all points', () => {
    expect(
      boundsOf([
        [-2, 1],
        [3, -4],
      ]),
    ).toEqual({ minX: -2, minY: -4, maxX: 3, maxY: 1 });
  });
});

describe('buildSvgScene', () => {
  it('projects points to 2D, dropping Z', () => {
    const scene = buildSvgScene(
      geometry({
        points: [
          [1, 2, 99],
          [3, 4, -99],
        ],
      }),
    );
    expect(scene.points).toEqual([
      [1, 2],
      [3, 4],
    ]);
    // Z does not affect bounds.
    expect(scene.bounds).toEqual({ minX: 1, minY: 2, maxX: 3, maxY: 4 });
  });

  it('preserves curve closed-ness', () => {
    const scene = buildSvgScene(
      geometry({
        curves: [
          {
            points: [
              [0, 0, 0],
              [1, 1, 5],
            ],
            closed: true,
          },
        ],
      }),
    );
    expect(scene.curves).toEqual([
      {
        points: [
          [0, 0],
          [1, 1],
        ],
        closed: true,
      },
    ]);
  });

  it('turns each mesh face into a projected polygon', () => {
    const scene = buildSvgScene(
      geometry({
        meshes: [
          {
            positions: [
              [0, 0, 1],
              [2, 0, 1],
              [2, 2, 1],
            ],
            faces: [[0, 1, 2]],
          },
        ],
      }),
    );
    expect(scene.polygons).toEqual([
      {
        points: [
          [0, 0],
          [2, 0],
          [2, 2],
        ],
      },
    ]);
  });

  it('carries per-element colors onto the scene (issues #80, #85)', () => {
    const scene = buildSvgScene(
      geometry({
        points: [[0, 0, 0]],
        pointColors: [[1, 0, 0, 1]],
        curves: [{ points: [[0, 0, 0]], closed: false, color: [0, 1, 0, 1] }],
        meshes: [{ positions: [[0, 0, 0]], faces: [[0]], color: [0, 0, 1, 1] }],
      }),
    );
    expect(scene.pointColors).toEqual([[1, 0, 0, 1]]);
    expect(scene.curves[0]!.color).toEqual([0, 1, 0, 1]);
    expect(scene.polygons[0]!.color).toEqual([0, 0, 1, 1]);
  });
});

describe('padBounds', () => {
  it('pads by a fraction of the largest extent', () => {
    expect(padBounds({ minX: 0, minY: 0, maxX: 10, maxY: 4 }, 0.1)).toEqual({
      minX: -1,
      minY: -1,
      maxX: 11,
      maxY: 5,
    });
  });

  it('inflates degenerate zero-size bounds', () => {
    expect(padBounds({ minX: 2, minY: 2, maxX: 2, maxY: 2 }, 0.1)).toEqual({
      minX: 1.9,
      minY: 1.9,
      maxX: 2.1,
      maxY: 2.1,
    });
  });
});
