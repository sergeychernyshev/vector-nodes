import type { Geometry } from '@vector-nodes/runtime';
import { useMemo } from 'react';

import { buildSvgScene, padBounds, type Point2 } from './svg-scene';

export interface SvgViewProps {
  geometry: Geometry;
}

const COLORS = {
  point: '#ffd34d',
  curve: '#4a90d9',
  mesh: '#8a8f98',
};

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
            fill={COLORS.mesh}
            fillOpacity={0.5}
            stroke={COLORS.mesh}
            strokeWidth={strokeWidth}
          />
        ))}
        {scene.curves.map((curve, i) =>
          curve.closed ? (
            <polygon
              key={`c${i}`}
              points={pointsAttr(curve.points)}
              fill="none"
              stroke={COLORS.curve}
              strokeWidth={strokeWidth}
            />
          ) : (
            <polyline
              key={`c${i}`}
              points={pointsAttr(curve.points)}
              fill="none"
              stroke={COLORS.curve}
              strokeWidth={strokeWidth}
            />
          ),
        )}
        {scene.points.map(([x, y], i) => (
          <circle key={`p${i}`} cx={x} cy={y} r={pointRadius} fill={COLORS.point} />
        ))}
      </g>
    </svg>
  );
}
