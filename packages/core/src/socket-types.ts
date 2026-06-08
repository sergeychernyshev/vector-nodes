/**
 * The eight socket types of the Vector Nodes type system.
 *
 * A single internal `Vector` type represents both points and directions (2D is a
 * `Vector` with `z = 0`); there is no separate `Point` type. See the README's
 * "type system" section for the full rationale.
 */
export const SOCKET_TYPES = [
  'Float',
  'Integer',
  'Boolean',
  'Vector',
  'Color',
  'String',
  'Geometry',
  'Matrix',
] as const;

/** Union of every valid socket type. */
export type SocketType = (typeof SOCKET_TYPES)[number];

/** Narrow an arbitrary string to a {@link SocketType}. */
export function isSocketType(value: string): value is SocketType {
  return (SOCKET_TYPES as readonly string[]).includes(value);
}

/**
 * A socket's full type: its base {@link SocketType} plus whether it carries a
 * single value or an array ("field" in Blender terms). Any socket may be a
 * field, so this flag is orthogonal to the base type.
 */
export interface SocketTypeDescriptor {
  readonly type: SocketType;
  /** When `true`, the socket carries an array/field of `type` rather than one value. */
  readonly isArray: boolean;
}

/** Convenience constructor for a {@link SocketTypeDescriptor}. */
export function socketTypeDescriptor(type: SocketType, isArray = false): SocketTypeDescriptor {
  return { type, isArray };
}
