import type { SocketType } from './socket-types.js';

/**
 * Allowed implicit conversions between socket types.
 *
 * Per the README, implicit conversions "mirror Blender where unambiguous";
 * everything else requires an explicit conversion node. We seed the table only
 * with conversions that are both unambiguous *and* shape-preserving:
 *
 * - **Numeric widening** (lossless, no reshaping): `Boolean → Integer → Float`.
 * - **Angle** is a scalar (radians) at runtime, so any number flows into an
 *   `Angle` input (`Boolean → Integer → Float → Angle`) and an `Angle` flows back
 *   out to a `Float` — all identity at runtime, hence lossless.
 *
 * Deliberately excluded (ambiguous, lossy, or reshaping — require an explicit
 * node): narrowing (`Float → Integer` rounding, `Float → Boolean` thresholding),
 * `Vector → Float` (which component / average?), `Vector ↔ Color`, anything
 * involving `String`, `Geometry`, or `Matrix`, and the **scalar → Vector / Color
 * broadcasts** (`f → (f, f, f)` / `(f, f, f, 1)`) — those reshape a scalar into a
 * tuple, which isn't applied at runtime, so a `Vector`/`Color` value must come
 * from an explicit `Vector`/`Combine Color` node.
 *
 * The map is keyed by source type; the value lists the target types reachable
 * without an explicit conversion node. The identity conversion (`T → T`) is
 * always allowed and is not listed here.
 */
const IMPLICIT_CONVERSIONS: Record<SocketType, readonly SocketType[]> = {
  Boolean: ['Integer', 'Float', 'Angle'],
  Integer: ['Float', 'Angle'],
  Float: ['Angle'],
  Vector: [],
  Color: [],
  String: [],
  Geometry: [],
  Matrix: [],
  Angle: ['Float'],
};

/**
 * Whether a value of type `from` may feed a socket of type `to` without an
 * explicit conversion node. Identity (`from === to`) is always allowed.
 */
export function canConvertImplicitly(from: SocketType, to: SocketType): boolean {
  return from === to || IMPLICIT_CONVERSIONS[from].includes(to);
}

/**
 * The target types `from` can implicitly convert to, excluding the identity
 * conversion. Returns a fresh array so callers cannot mutate the table.
 */
export function implicitConversionTargets(from: SocketType): SocketType[] {
  return [...IMPLICIT_CONVERSIONS[from]];
}
