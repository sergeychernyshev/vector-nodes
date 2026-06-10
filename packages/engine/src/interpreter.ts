import {
  assertValidGraph,
  flattenMetaNodes,
  getOutputNode,
  resolveParamDefaults,
  type Graph,
  type GraphNode,
  type NodeDefinition,
  type NodeRegistry,
} from '@vector-nodes/core';

import type { OperatorTable } from './operator.js';

/** The result of evaluating a graph. */
export interface EvaluationResult {
  /**
   * The network result: the resolved input values of the OutputGeometry node,
   * keyed by its input socket name (typically `{ geometry }`).
   */
  output: Record<string, unknown>;
  /** Every evaluated node's outputs, keyed by node id (for inspection/tests). */
  nodeOutputs: Map<string, Record<string, unknown>>;
}

/** Error thrown when a node type has no registered operator. */
export class MissingOperatorError extends Error {
  readonly nodeType: string;

  constructor(nodeType: string) {
    super(`No operator registered for node type "${nodeType}".`);
    this.name = 'MissingOperatorError';
    this.nodeType = nodeType;
  }
}

/**
 * Evaluate a graph by pulling from its OutputGeometry node.
 *
 * The graph is validated first (throwing {@link import('@vector-nodes/core').GraphValidationError}
 * on any problem), then nodes are evaluated lazily and recursively from the
 * output: each node is computed exactly once and memoized for the run, which
 * yields a topological evaluation order. Each input socket resolves to the
 * connected upstream output, or to the socket's default when unconnected.
 *
 * @throws MissingOperatorError if a node needed for the result has no operator.
 */
export function evaluateGraph(
  graph: Graph,
  registry: NodeRegistry,
  operators: OperatorTable,
  parameters: Record<string, unknown> = {},
): EvaluationResult {
  // Inline any meta-node instances so evaluation matches the expanded network
  // and the base registry/operators suffice (no per-meta-node operator needed).
  graph = flattenMetaNodes(graph);
  assertValidGraph(graph, registry);

  const outputNode = getOutputNode(graph);
  // assertValidGraph guarantees exactly one OutputGeometry node.
  if (outputNode === undefined) {
    throw new Error('Graph has no OutputGeometry node.');
  }

  const nodeOutputs = new Map<string, Record<string, unknown>>();
  const visiting = new Set<string>();

  const nodeById = new Map<string, GraphNode>();
  for (const node of graph.nodes) nodeById.set(node.id, node);

  function resolveInputs(node: GraphNode, def: NodeDefinition): Record<string, unknown> {
    const inputs: Record<string, unknown> = {};
    for (const socket of def.inputs) {
      const link = graph.links.find((l) => l.to[0] === node.id && l.to[1] === socket.name);
      if (link) {
        const sourceOutputs = evaluateNode(link.from[0]);
        inputs[socket.name] = sourceOutputs[link.from[1]];
      } else if (socket.default !== undefined) {
        inputs[socket.name] = socket.default;
      }
    }
    return inputs;
  }

  function evaluateNode(nodeId: string): Record<string, unknown> {
    const cached = nodeOutputs.get(nodeId);
    if (cached) return cached;
    if (visiting.has(nodeId)) {
      throw new Error(`Cycle detected while evaluating node "${nodeId}".`);
    }
    visiting.add(nodeId);

    const node = nodeById.get(nodeId)!;
    const def = registry.require(node.type);
    const inputs = resolveInputs(node, def);
    const params = { ...resolveParamDefaults(def), ...(node.params ?? {}) };

    const evaluator = operators[node.type];
    if (evaluator === undefined) {
      throw new MissingOperatorError(node.type);
    }
    const outputs = evaluator({ inputs, params, parameters, node });

    visiting.delete(nodeId);
    nodeOutputs.set(nodeId, outputs);
    return outputs;
  }

  // The OutputGeometry node holds the result on its inputs; resolving them pulls
  // and evaluates the whole upstream subtree.
  const outputDef = registry.require(outputNode.type);
  const output = resolveInputs(outputNode, outputDef);

  return { output, nodeOutputs };
}
