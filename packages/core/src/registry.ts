import type { NodeDefinition } from './node-definition.js';

/**
 * A lookup table of {@link NodeDefinition}s keyed by their `type`.
 *
 * The editor, validator, interpreter, and codegen all resolve node types
 * through a registry so that adding a node in one place flows everywhere.
 */
export class NodeRegistry {
  readonly #definitions = new Map<string, NodeDefinition>();

  /** Create a registry, optionally pre-populated with definitions. */
  constructor(definitions: Iterable<NodeDefinition> = []) {
    for (const def of definitions) {
      this.register(def);
    }
  }

  /**
   * Register a definition. Throws if a definition with the same `type` is
   * already registered.
   */
  register(def: NodeDefinition): void {
    if (this.#definitions.has(def.type)) {
      throw new Error(`Node type already registered: "${def.type}"`);
    }
    this.#definitions.set(def.type, def);
  }

  /** Whether a definition is registered for `type`. */
  has(type: string): boolean {
    return this.#definitions.has(type);
  }

  /** Get a definition by `type`, or `undefined` if none is registered. */
  get(type: string): NodeDefinition | undefined {
    return this.#definitions.get(type);
  }

  /** Get a definition by `type`, throwing if none is registered. */
  require(type: string): NodeDefinition {
    const def = this.#definitions.get(type);
    if (def === undefined) {
      throw new Error(`Unknown node type: "${type}"`);
    }
    return def;
  }

  /** All registered definitions, in registration order. */
  list(): NodeDefinition[] {
    return [...this.#definitions.values()];
  }

  /** Number of registered definitions. */
  get size(): number {
    return this.#definitions.size;
  }
}
