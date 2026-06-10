import type { SocketType } from './socket-types.js';

/**
 * An input or output socket on a node definition.
 *
 * `isArray` marks a field (array) socket and defaults to `false`. `default` is
 * an optional value used for an input socket that is left unconnected; its shape
 * depends on `type` (e.g. a number for `Float`, `[x, y, z]` for `Vector`).
 */
export interface SocketDefinition {
  readonly name: string;
  readonly type: SocketType;
  readonly isArray?: boolean;
  readonly default?: unknown;
  readonly description?: string;
}

/**
 * A static parameter baked into a node (the node's `params` in a `.vnodes`
 * file). Carries an optional `default` plus an optional numeric `min`/`max`
 * range for editor widgets and validation.
 */
export interface ParamDefinition {
  readonly name: string;
  readonly type: SocketType;
  readonly isArray?: boolean;
  readonly default?: unknown;
  readonly min?: number;
  readonly max?: number;
  /** Enumerated allowed values; when set, editors present a dropdown. */
  readonly options?: readonly string[];
  readonly description?: string;
}

/**
 * The declarative definition of a node *type* in the library — its sockets and
 * parameters plus display metadata. This is the single source of truth consumed
 * by the editor, validator, interpreter, and codegen. Node *instances* in a
 * graph reference a definition by its `type`.
 */
export interface NodeDefinition {
  /** Unique node-type id, e.g. `"VectorMath"` or `"OutputGeometry"`. */
  readonly type: string;
  /** Display name for the palette; falls back to `type` when omitted. */
  readonly label?: string;
  /** Palette grouping, e.g. `"Vector"` or `"Geometry"`. */
  readonly category?: string;
  readonly description?: string;
  readonly inputs: readonly SocketDefinition[];
  readonly outputs: readonly SocketDefinition[];
  readonly params: readonly ParamDefinition[];
  /**
   * A variable-arity input: the node accepts any number of links into sockets
   * named `${name}0`, `${name}1`, … of this type (e.g. Merge — issue #65). The
   * editor grows the handles as they fill; the interpreter/codegen gather them.
   */
  readonly variadicInput?: {
    readonly name: string;
    readonly type: SocketType;
    readonly isArray?: boolean;
  };
}

/** Parse the index `n` from a `${prefix}n` socket name, or `null` if it doesn't match. */
export function parseVariadicIndex(prefix: string, socketName: string): number | null {
  if (!socketName.startsWith(prefix)) return null;
  const rest = socketName.slice(prefix.length);
  return /^\d+$/.test(rest) ? Number(rest) : null;
}

/** Parse the index `n` from a variadic socket name `${name}n`, or `null`. */
export function variadicSocketIndex(def: NodeDefinition, socketName: string): number | null {
  return def.variadicInput ? parseVariadicIndex(def.variadicInput.name, socketName) : null;
}

/** Keys matching `${prefix}n`, sorted by their numeric index. */
export function orderedVariadicKeys(keys: Iterable<string>, prefix: string): string[] {
  return [...keys]
    .map((key) => ({ key, index: parseVariadicIndex(prefix, key) }))
    .filter((entry): entry is { key: string; index: number } => entry.index !== null)
    .sort((a, b) => a.index - b.index)
    .map((entry) => entry.key);
}

/**
 * Resolve an input socket by name, accounting for a definition's variadic input:
 * a `${name}n` socket resolves to a synthesized socket of the variadic type.
 */
export function resolveInputSocket(
  def: NodeDefinition,
  socketName: string,
): SocketDefinition | undefined {
  const fixed = def.inputs.find((s) => s.name === socketName);
  if (fixed) return fixed;
  if (variadicSocketIndex(def, socketName) !== null) {
    const v = def.variadicInput!;
    return { name: socketName, type: v.type, ...(v.isArray ? { isArray: true } : {}) };
  }
  return undefined;
}

/**
 * Resolve a node definition's parameter defaults into a `name → value` map,
 * including only parameters that declare a `default`.
 */
export function resolveParamDefaults(def: NodeDefinition): Record<string, unknown> {
  const defaults: Record<string, unknown> = {};
  for (const param of def.params) {
    if (param.default !== undefined) {
      defaults[param.name] = param.default;
    }
  }
  return defaults;
}
