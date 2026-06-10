import type { Geometry } from '@vector-nodes/runtime';
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
  // A bundle color (issue #55) overrides the per-kind defaults.
  const tint = geometry.color ? rgbCss(geometry.color) : null;
  const meshColor = tint ?? COLORS.mesh;
  const curveColor = tint ?? COLORS.curve;
  const pointColor = tint ?? COLORS.point;

  return (
    <svg
      className="preview__svg"
      data-testid="preview-svg"
      viewBox={`${bounds.minX} ${bounds.minY} ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
    >
      <g transform={flip}>
        {scene.polygons.map((polygon, i) => (
          <polygon
            key={`m${i}`}
            points={pointsAttr(polygon)}
            fill={meshColor}
            fillOpacity={0.5}
            stroke={meshColor}
            strokeWidth={strokeWidth}
          />
        ))}
        {scene.curves.map((curve, i) =>
          curve.closed ? (
            <polygon
              key={`c${i}`}
              points={pointsAttr(curve.points)}
              fill="none"
              stroke={curveColor}
              strokeWidth={strokeWidth}
            />
          ) : (
            <polyline
              key={`c${i}`}
              points={pointsAttr(curve.points)}
              fill="none"
              stroke={curveColor}
              strokeWidth={strokeWidth}
            />
          ),
        )}
        {/* All points as one <path> (one DOM node) — round caps draw each as a dot. */}
        {scene.points.length > 0 && (
          <path
            className="svg-points"
            d={pointsPathD(scene.points)}
            fill="none"
            stroke={pointColor}
            strokeWidth={pointRadius * 2}
            strokeLinecap="round"
          />
        )}
      </g>
    </svg>
  );
}
