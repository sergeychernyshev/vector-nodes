import type { Vector } from './types.js';

/** Component-wise sum `a + b`. */
export function add(a: Vector, b: Vector): Vector {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

/** Component-wise difference `a - b`. */
export function sub(a: Vector, b: Vector): Vector {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

/** Scale `a` by scalar `s`. */
export function scale(a: Vector, s: number): Vector {
  return [a[0] * s, a[1] * s, a[2] * s];
}

/** Dot product `a · b`. */
export function dot(a: Vector, b: Vector): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

/** Cross product `a × b`. */
export function cross(a: Vector, b: Vector): Vector {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

/** Euclidean length (magnitude) of `a`. */
export function length(a: Vector): number {
  return Math.hypot(a[0], a[1], a[2]);
}

/**
 * Unit vector in the direction of `a`. Returns `[0, 0, 0]` for the zero vector
 * rather than producing `NaN`s.
 */
export function normalize(a: Vector): Vector {
  const len = length(a);
  return len === 0 ? [0, 0, 0] : [a[0] / len, a[1] / len, a[2] / len];
}

/** Euclidean distance between points `a` and `b`. */
export function distance(a: Vector, b: Vector): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}
