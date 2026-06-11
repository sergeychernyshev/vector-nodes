import { makeRng } from './geometry.js';

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

// --- Seeded randomness (issue #119) ---------------------------------------------

/** `count` floats uniformly in `[min, max)`, reproducible from `seed`. */
export function randomFloats(count: number, min: number, max: number, seed = 0): number[] {
  const rng = makeRng(seed);
  const out: number[] = [];
  for (let i = 0; i < count; i++) out.push(min + rng() * (max - min));
  return out;
}

/**
 * `count` integers uniformly in `[ceil(min), floor(max)]` (inclusive),
 * reproducible from `seed`. An empty integer range collapses to its lower end.
 */
export function randomInts(count: number, min: number, max: number, seed = 0): number[] {
  const lo = Math.ceil(min);
  const hi = Math.floor(max);
  const rng = makeRng(seed);
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    out.push(hi < lo ? lo : lo + Math.floor(rng() * (hi - lo + 1)));
  }
  return out;
}
