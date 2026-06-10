import { describe, expect, it } from 'vitest';

import {
  boundingBox,
  circleCurve,
  colorGeometry,
  instanceOnPoints,
  mergeAll,
  mergeGeometry,
  polyline,
  transformGeometry,
} from './geometry.js';
import { clamp, mapRange, mix } from './scalar.js';
import { emptyGeometry, type Geometry } from './types.js';
import { rotateAxisAngle, scaleAxes } from './vector.js';

describe('scalar ops', () => {
  it('clamp bounds the value', () => {
    expect(clamp(5, 0, 1)).toBe(1);
    expect(clamp(-5, 0, 1)).toBe(0);
    expect(clamp(0.4, 0, 1)).toBe(0.4);
  });

  it('mapRange remaps linearly and handles a zero-width input', () => {
    expect(mapRange(0.5, 0, 1, 0, 10)).toBe(5);
    expect(mapRange(2, 0, 0, 3, 9)).toBe(3);
  });

  it('mix interpolates', () => {
    expect(mix(0, 10, 0.25)).toBe(2.5);
  });
});

describe('vector ops', () => {
  it('scaleAxes multiplies component-wise', () => {
    expect(scaleAxes([2, 3, 4], [10, 100, 1000])).toEqual([20, 300, 4000]);
  });

  it('rotateAxisAngle by 90° about Z maps +X to +Y', () => {
    const r = rotateAxisAngle([1, 0, 0], [0, 0, 1], Math.PI / 2);
    expect(r[0]).toBeCloseTo(0);
    expect(r[1]).toBeCloseTo(1);
    expect(r[2]).toBeCloseTo(0);
  });

  it('rotateAxisAngle leaves a point unchanged for a zero axis', () => {
    expect(rotateAxisAngle([1, 2, 3], [0, 0, 0], 1)).toEqual([1, 2, 3]);
  });
});

describe('geometry combinators', () => {
  it('circleCurve is closed with `count` points', () => {
    const c = circleCurve(1, 6);
    expect(c.closed).toBe(true);
    expect(c.points).toHaveLength(6);
  });

  it('polyline carries its points and closed flag', () => {
    expect(
      polyline(
        [
          [0, 0, 0],
          [1, 0, 0],
        ],
        true,
      ),
    ).toEqual({
      points: [
        [0, 0, 0],
        [1, 0, 0],
      ],
      closed: true,
    });
  });

  it('mergeGeometry concatenates points/curves/meshes', () => {
    const a: Geometry = { points: [[0, 0, 0]], curves: [], meshes: [] };
    const b: Geometry = {
      points: [[1, 1, 1]],
      curves: [{ points: [], closed: false }],
      meshes: [],
    };
    const m = mergeGeometry(a, b);
    expect(m.points).toHaveLength(2);
    expect(m.curves).toHaveLength(1);
    // Neither side is colored, so no point-color array is materialized.
    expect(m.pointColors).toBeUndefined();
  });

  it('boundingBox returns 8 corners (empty for no points)', () => {
    expect(boundingBox(emptyGeometry())).toEqual([]);
    const box = boundingBox({
      points: [
        [-1, -2, -3],
        [1, 2, 3],
      ],
      curves: [],
      meshes: [],
    });
    expect(box).toHaveLength(8);
    expect(box).toContainEqual([-1, -2, -3]);
    expect(box).toContainEqual([1, 2, 3]);
  });

  it('instanceOnPoints places a copy at each point', () => {
    const inst: Geometry = { points: [[0, 0, 0]], curves: [], meshes: [] };
    const out = instanceOnPoints(inst, [
      [1, 0, 0],
      [0, 1, 0],
    ]);
    expect(out.points).toEqual([
      [1, 0, 0],
      [0, 1, 0],
    ]);
  });
});

describe('per-element color (issues #80, #85)', () => {
  const RED: [number, number, number, number] = [1, 0, 0, 1];
  const BLUE: [number, number, number, number] = [0, 0, 1, 1];

  it('colorGeometry tags every point, curve, and mesh', () => {
    const colored = colorGeometry(
      {
        points: [
          [0, 0, 0],
          [1, 0, 0],
        ],
        curves: [{ points: [[0, 0, 0]], closed: false }],
        meshes: [{ positions: [[0, 0, 0]], faces: [[0]] }],
      },
      RED,
    );
    expect(colored.pointColors).toEqual([RED, RED]);
    expect(colored.curves[0]!.color).toEqual(RED);
    expect(colored.meshes[0]!.color).toEqual(RED);
  });

  it('transformGeometry preserves colors (issue #80)', () => {
    const colored = colorGeometry(
      { points: [[0, 0, 0]], curves: [{ points: [[0, 0, 0]], closed: false }], meshes: [] },
      RED,
    );
    const moved = transformGeometry(colored, (p) => [p[0] + 1, p[1], p[2]]);
    expect(moved.points).toEqual([[1, 0, 0]]);
    expect(moved.pointColors).toEqual([RED]);
    expect(moved.curves[0]!.color).toEqual(RED);
  });

  it('merge keeps each side’s distinct colors (issue #85)', () => {
    const red = colorGeometry({ points: [[0, 0, 0]], curves: [], meshes: [] }, RED);
    const blue = colorGeometry({ points: [[1, 0, 0]], curves: [], meshes: [] }, BLUE);
    const merged = mergeAll([red, blue]);
    expect(merged.points).toHaveLength(2);
    expect(merged.pointColors).toEqual([RED, BLUE]);
  });

  it('merge pads an uncolored side with default (null) entries (issue #85)', () => {
    const red = colorGeometry({ points: [[0, 0, 0]], curves: [], meshes: [] }, RED);
    const plain: Geometry = { points: [[1, 0, 0]], curves: [], meshes: [] };
    const merged = mergeGeometry(red, plain);
    expect(merged.pointColors).toEqual([RED, null]);
  });
});
