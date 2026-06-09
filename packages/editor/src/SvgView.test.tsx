// @vitest-environment jsdom
import type { Geometry } from '@vector-nodes/runtime';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { SvgView } from './SvgView';

afterEach(cleanup);

function geometry(partial: Partial<Geometry>): Geometry {
  return { points: [], curves: [], meshes: [], ...partial };
}

describe('SvgView', () => {
  it('renders all points as a single <path> (no per-point circles) and a polyline per open curve', () => {
    const { container } = render(
      <SvgView
        geometry={geometry({
          points: [
            [0, 0, 0],
            [1, 1, 0],
          ],
          curves: [
            {
              points: [
                [0, 0, 0],
                [1, 0, 0],
              ],
              closed: false,
            },
          ],
        })}
      />,
    );
    // Points collapse into one path element — never one DOM node per point.
    expect(container.querySelectorAll('circle')).toHaveLength(0);
    const pointsPath = container.querySelector('path.svg-points');
    expect(pointsPath).not.toBeNull();
    expect(pointsPath?.getAttribute('d')).toBe('M0 0l0 0M1 1l0 0');
    expect(container.querySelectorAll('polyline')).toHaveLength(1);
  });

  it('omits the points path when there are no points', () => {
    const { container } = render(
      <SvgView geometry={geometry({ curves: [{ points: [[0, 0, 0]], closed: false }] })} />,
    );
    expect(container.querySelector('path.svg-points')).toBeNull();
  });

  it('renders closed curves and mesh faces as polygons', () => {
    const { container } = render(
      <SvgView
        geometry={geometry({
          curves: [
            {
              points: [
                [0, 0, 0],
                [1, 0, 0],
                [1, 1, 0],
              ],
              closed: true,
            },
          ],
          meshes: [
            {
              positions: [
                [0, 0, 0],
                [2, 0, 0],
                [2, 2, 0],
              ],
              faces: [[0, 1, 2]],
            },
          ],
        })}
      />,
    );
    // One closed curve + one mesh face = two polygons.
    expect(container.querySelectorAll('polygon')).toHaveLength(2);
  });

  it('computes the viewBox from X–Y only (Z dropped)', () => {
    const { getByTestId } = render(
      <SvgView
        geometry={geometry({
          points: [
            [0, 0, 50],
            [10, 10, -50],
          ],
        })}
      />,
    );
    // Bounds 0..10 padded by 10% of extent (1) → -1..11 → 12 wide/tall.
    expect(getByTestId('preview-svg').getAttribute('viewBox')).toBe('-1 -1 12 12');
  });
});
