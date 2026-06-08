import type { SocketType } from './socket-types';

/**
 * Allowed implicit conversions between socket types.
 *
 * Per the README, implicit conversions "mirror Blender where unambiguous";
 * everything else requires an explicit conversion node. We seed the table with
 * the conversions that have a single, well-defined meaning:
 *
 * - **Numeric widening** (lossless): `Boolean → Integer → Float`.
 * - **Scalar → Vector broadcast**: a scalar `f` fills all components, `(f, f, f)`.
 * - **Scalar → Color broadcast**: a scalar `f` becomes grayscale `(f, f, f, 1)`.
 *
 * Deliberately excluded (ambiguous or lossy — require an explicit node):
 * narrowing (`Float → Integer` rounding, `Float → Boolean` thresholding),
 * `Vector → Float` (which component / average?), `Vector ↔ Color`, and anything
 * involving `String`, `Geometry`, or `Matrix`.
 *
 * The map is keyed by source type; the value lists the target types reachable
 * without an explicit conversion node. The identity conversion (`T → T`) is
 * always allowed and is not listed here.
 */
const IMPLICIT_CONVERSIONS: Record<SocketType, readonly SocketType[]> = {
  Boolean: ['Integer', 'Float', 'Vector', 'Color'],
  Integer: ['Float', 'Vector', 'Color'],
  Float: ['Vector', 'Color'],
  Vector: [],
  Color: [],
  String: [],
  Geometry: [],
  Matrix: [],
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
