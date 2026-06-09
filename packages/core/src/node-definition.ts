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
