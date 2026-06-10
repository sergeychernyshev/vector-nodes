import type { Color, Geometry } from '@vector-nodes/runtime';
import { useMemo } from 'react';

import { buildSvgScene, padBounds, pointsPathD, type Point2 } from './svg-scene';

export interface SvgViewProps {
  geometry: Geometry;
}

const COLORS = {
  point: '#ffd34d',
  curve: '#4a90d9',
  mesh: '#8a8f98',
};

/** A CSS `rgb(...)` string from an RGBA geometry color (0..1 components). */
function rgbCss([r, g, b]: readonly number[]): string {
  const ch = (v = 0) => Math.max(0, Math.min(255, Math.round(v * 255)));
  return `rgb(${ch(r)}, ${ch(g)}, ${ch(b)})`;
}

/** A per-element color resolved to CSS, falling back to a default (issue #80). */
function colorCss(color: Color | null | undefined, fallback: string): string {
  return color ? rgbCss(color) : fallback;
}

/**
 * Split the scene's points into one group per resolved color (issues #80, #85),
 * preserving first-seen order. Each group becomes a single `<path>` so distinct
 * colors survive a merge while still collapsing to a handful of DOM nodes.
 */
function pointGroups(
  points: readonly Point2[],
  pointColors: readonly (Color | null)[] | undefined,
): { color: string; points: Point2[] }[] {
  const groups = new Map<string, Point2[]>();
  points.forEach((p, i) => {
    const css = colorCss(pointColors?.[i], COLORS.point);
    const bucket = groups.get(css);
    if (bucket) bucket.push(p);
    else groups.set(css, [p]);
  });
  return [...groups].map(([color, pts]) => ({ color, points: pts }));
}

function pointsAttr(points: readonly Point2[]): string {
  return points.map(([x, y]) => `${x},${y}`).join(' ');
}

/**
 * SVG 2D preview: projects the geometry to the X–Y plane (Z dropped) and draws
 * mesh faces, curve outlines, and points. The Y axis is flipped so positive Y
 * points up, matching the 3D view's drawing plane.
 */
export function SvgView({ geometry }: SvgViewProps) {
  const scene = useMemo(() => buildSvgScene(geometry), [geometry]);
  const bounds = padBounds(scene.bounds);
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;
  const extent = Math.max(width, height) || 1;
  const strokeWidth = extent * 0.006;
  const pointRadius = extent * 0.012;
  // Flip Y for display (SVG y grows downward; we want y-up).
  const flip = `scale(1,-1) translate(0,${-(bounds.minY + bounds.maxY)})`;
  // Per-element colors (issues #80, #85), falling back to the per-kind defaults.
  const groups = pointGroups(scene.points, scene.pointColors);

  return (
    <svg
      className="preview__svg"
      data-testid="preview-svg"
      viewBox={`${bounds.minX} ${bounds.minY} ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
    >
      <g transform={flip}>
        {scene.polygons.map((polygon, i) => {
          const color = colorCss(polygon.color, COLORS.mesh);
          return (
            <polygon
              key={`m${i}`}
              points={pointsAttr(polygon.points)}
              fill={color}
              fillOpacity={0.5}
              stroke={color}
              strokeWidth={strokeWidth}
            />
          );
        })}
        {scene.curves.map((curve, i) => {
          const color = colorCss(curve.color, COLORS.curve);
          return curve.closed ? (
            <polygon
              key={`c${i}`}
              points={pointsAttr(curve.points)}
              fill="none"
              stroke={color}
              strokeWidth={strokeWidth}
            />
          ) : (
            <polyline
              key={`c${i}`}
              points={pointsAttr(curve.points)}
              fill="none"
              stroke={color}
              strokeWidth={strokeWidth}
            />
          );
        })}
        {/* One <path> per distinct point color — round caps draw each point as a dot. */}
        {groups.map((g) => (
          <path
            key={g.color}
            className="svg-points"
            d={pointsPathD(g.points)}
            fill="none"
            stroke={g.color}
            strokeWidth={pointRadius * 2}
            strokeLinecap="round"
          />
        ))}
      </g>
    </svg>
  );
}
