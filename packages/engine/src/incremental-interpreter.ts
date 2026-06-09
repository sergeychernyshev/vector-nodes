import {
  assertValidGraph,
  getOutputNode,
  isParameterNodeType,
  resolveParamDefaults,
  type Graph,
  type GraphNode,
  type NodeDefinition,
  type NodeRegistry,
} from '@vector-nodes/core';

import { cyrb53, stableStringify } from './hash.js';
import { MissingOperatorError, type EvaluationResult } from './interpreter.js';
import type { OperatorTable } from './operator.js';

/** An {@link EvaluationResult} plus which nodes were (re)computed this run. */
export interface IncrementalEvaluationResult extends EvaluationResult {
  /**
   * Ids of nodes whose operator actually ran this evaluation. Nodes served from
   * the cache are absent. Useful to confirm only the dirty subtree recomputed.
   */
  evaluated: Set<string>;
}

interface CacheEntry {
  signature: string;
  outputs: Record<string, unknown>;
}

/**
 * A stateful, memoizing interpreter.
 *
 * Each node's outputs are cached keyed by a *content signature* derived from its
 * node type, effective params, and the signatures of the values feeding its
 * inputs. Re-evaluating after an edit recomputes a node only when its signature
 * changed — i.e. only the edited node and everything downstream of it (the dirty
 * subtree). Nodes whose inputs and params are unchanged are served from cache.
 */
export class Interpreter {
  readonly #registry: NodeRegistry;
  readonly #operators: OperatorTable;
  readonly #cache = new Map<string, CacheEntry>();

  constructor(registry: NodeRegistry, operators: OperatorTable) {
    this.#registry = registry;
    this.#operators = operators;
  }

  /** Drop all cached results; the next evaluation recomputes everything. */
  clearCache(): void {
    this.#cache.clear();
  }

  /** Evaluate `graph`, reusing cached node results where signatures match. */
  evaluate(graph: Graph, parameters: Record<string, unknown> = {}): IncrementalEvaluationResult {
    assertValidGraph(graph, this.#registry);

    const outputNode = getOutputNode(graph);
    if (outputNode === undefined) {
      throw new Error('Graph has no OutputGeometry node.');
    }

    const nodeById = new Map<string, GraphNode>();
    for (const node of graph.nodes) nodeById.set(node.id, node);

    const nodeOutputs = new Map<string, Record<string, unknown>>();
    const signatures = new Map<string, string>();
    const evaluated = new Set<string>();
    const visiting = new Set<string>();

    const resolveInputs = (
      node: GraphNode,
      def: NodeDefinition,
    ): { values: Record<string, unknown>; signatureParts: string[] } => {
      const values: Record<string, unknown> = {};
      const signatureParts: string[] = [];
      for (const socket of def.inputs) {
        const link = graph.links.find((l) => l.to[0] === node.id && l.to[1] === socket.name);
        if (link) {
          const sourceOutputs = evaluateNode(link.from[0]);
          values[socket.name] = sourceOutputs[link.from[1]];
          signatureParts.push(
            `${socket.name}<-${link.from[0]}.${link.from[1]}#${signatures.get(link.from[0])}`,
          );
        } else if (socket.default !== undefined) {
          values[socket.name] = socket.default;
          signatureParts.push(`${socket.name}=${stableStringify(socket.default)}`);
        } else {
          signatureParts.push(`${socket.name}:unset`);
        }
      }
      return { values, signatureParts };
    };

    const evaluateNode = (nodeId: string): Record<string, unknown> => {
      const ran = nodeOutputs.get(nodeId);
      if (ran) return ran;
      if (visiting.has(nodeId)) {
        throw new Error(`Cycle detected while evaluating node "${nodeId}".`);
      }
      visiting.add(nodeId);

      const node = nodeById.get(nodeId)!;
      const def = this.#registry.require(node.type);
      const { values, signatureParts } = resolveInputs(node, def);
      const params = { ...resolveParamDefaults(def), ...(node.params ?? {}) };

      // Parameter nodes read an external binding; fold it into the signature so
      // changing a binding invalidates only the parameter node and its subtree.
      const external = isParameterNodeType(node.type)
        ? `|param=${stableStringify(parameters[params.name as string])}`
        : '';
      const signature = String(
        cyrb53(`${node.type}|${stableStringify(params)}|${signatureParts.join('|')}${external}`),
      );
      signatures.set(nodeId, signature);

      const cached = this.#cache.get(nodeId);
      let outputs: Record<string, unknown>;
      if (cached && cached.signature === signature) {
        outputs = cached.outputs;
      } else {
        const evaluator = this.#operators[node.type];
        if (evaluator === undefined) {
          throw new MissingOperatorError(node.type);
        }
        outputs = evaluator({ inputs: values, params, parameters, node });
        this.#cache.set(nodeId, { signature, outputs });
        evaluated.add(nodeId);
      }

      visiting.delete(nodeId);
      nodeOutputs.set(nodeId, outputs);
      return outputs;
    };

    const outputDef = this.#registry.require(outputNode.type);
    const output = resolveInputs(outputNode, outputDef).values;

    return { output, nodeOutputs, evaluated };
  }
}
