import type { SocketType } from './socket-types.js';

/**
 * Canonical Blender socket-palette colors for each socket type, as hex strings.
 *
 * These mirror Blender's Geometry/Shader node socket colors so a network reads
 * at a glance for anyone familiar with Blender. Values are the canonical hex
 * codes from the README's type-system table; in the editor they are theme
 * values and can be overridden, but these are the defaults.
 */
export const SOCKET_COLORS: Record<SocketType, string> = {
  Float: '#A1A1A1', // Gray
  Integer: '#108526', // Green
  Boolean: '#CCA6D6', // Lavender
  Vector: '#6363C7', // Blue
  Color: '#C7C729', // Yellow
  String: '#70B3FF', // Light blue
  Geometry: '#00D6A3', // Teal
  Matrix: '#ED9E5C', // Orange
  Angle: '#C77DBB', // Pink — a numeric scalar in radians, distinct from Float
};

/** Look up the canonical Blender color for a socket type. */
export function socketColor(type: SocketType): string {
  return SOCKET_COLORS[type];
}
