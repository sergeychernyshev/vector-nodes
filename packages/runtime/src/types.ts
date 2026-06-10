/**
 * Geometry interchange types.
 *
 * Geometry values are plain arrays/objects of numbers so they serialize
 * trivially and are shared between the interpreter and generated code. The same
 * shapes back the TS codegen argument types (see the README export table).
 */

/**
 * A 3D vector. 2D is represented with `z = 0`; a *point* is just a `Vector` used
 * as a position. Maps to the TS `[number, number, number]` argument type.
 */
export type Vector = [number, number, number];

/** A position in space — an alias for {@link Vector}. */
export type Point = Vector;

/** RGBA color, each component nominally in `[0, 1]`. */
export type Color = [number, number, number, number];

/** An ordered list of points; `closed` joins the last point back to the first. */
export interface Curve {
  points: Point[];
  closed: boolean;
  /** Optional display color for this curve (issue #80). */
  color?: Color;
}

/**
 * A polygonal mesh: vertex `positions` plus `faces`, each face a list of indices
 * into `positions`. Full mesh ops arrive in Phase 8; this is the interchange
 * shape.
 */
export interface Mesh {
  positions: Point[];
  faces: number[][];
  /** Optional display color for this mesh (issue #80). */
  color?: Color;
}

/**
 * A geometry bundle: the value carried on `Geometry` sockets.
 *
 * Color lives per element so it survives transforms and merges (issues #80,
 * #85): each curve/mesh carries its own optional `color`, and bare points are
 * colored via `pointColors`, index-aligned with `points` (a `null` entry, or a
 * missing/`undefined` `pointColors`, means "use the renderer's default").
 */
export interface Geometry {
  points: Point[];
  curves: Curve[];
  meshes: Mesh[];
  /** Per-point display colors, index-aligned with `points` (issues #80, #85). */
  pointColors?: (Color | null)[];
}

/** The origin `[0, 0, 0]`. */
export const ORIGIN: Vector = [0, 0, 0];

/** Construct a {@link Vector}; `z` defaults to `0` for 2D use. */
export function vector(x: number, y: number, z = 0): Vector {
  return [x, y, z];
}

/** An empty {@link Geometry} bundle. */
export function emptyGeometry(): Geometry {
  return { points: [], curves: [], meshes: [] };
}
