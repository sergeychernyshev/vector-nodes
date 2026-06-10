/** Clamp `v` to the inclusive range `[lo, hi]`. */
export function clamp(v: number, lo: number, hi: number): number {
  return Math.min(Math.max(v, lo), hi);
}

/**
 * Remap `v` from the range `[inMin, inMax]` to `[outMin, outMax]` (linear,
 * unclamped). A zero-width input range maps to `outMin`.
 */
export function mapRange(
  v: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
): number {
  const t = inMax === inMin ? 0 : (v - inMin) / (inMax - inMin);
  return outMin + t * (outMax - outMin);
}

/** Linear interpolation between `a` and `b` by `t`. */
export function mix(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
