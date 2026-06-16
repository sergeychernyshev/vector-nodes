import {
  assertValidGraph,
  flattenMetaNodes,
  getOutputNode,
  resolveParamDefaults,
  type Graph,
  type GraphLink,
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
  previewRoots: readonly string[] = [],
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

  /** Whether a link's source output socket is itself a field (array). */
  function sourceIsArray(link: GraphLink): boolean {
    const sourceNode = nodeById.get(link.from[0]);
    if (!sourceNode) return false;
    const def = registry.get(sourceNode.type);
    return def?.outputs.find((s) => s.name === link.from[1])?.isArray ?? false;
  }

  function resolveInputs(node: GraphNode, def: NodeDefinition): Record<string, unknown> {
    const inputs: Record<string, unknown> = {};
    for (const socket of def.inputs) {
      if (socket.isArray) {
        // Array inputs collect every connection (issue #99): each scalar source
        // contributes one element, in link order. A single field (array) source
        // passes through as the whole array (e.g. a wired point field).
        const links = graph.links.filter((l) => l.to[0] === node.id && l.to[1] === socket.name);
        if (links.length > 0) {
          const values = links.map((l) => evaluateNode(l.from[0])[l.from[1]]);
          inputs[socket.name] = links.length === 1 && sourceIsArray(links[0]!) ? values[0] : values;
        } else if (node.inputDefaults?.[socket.name] !== undefined) {
          inputs[socket.name] = node.inputDefaults[socket.name];
        } else if (node.params?.[socket.name] !== undefined) {
          inputs[socket.name] = node.params[socket.name];
        } else {
          inputs[socket.name] = socket.default ?? [];
        }
        continue;
      }
      const link = graph.links.find((l) => l.to[0] === node.id && l.to[1] === socket.name);
      if (link) {
        const sourceOutputs = evaluateNode(link.from[0]);
        inputs[socket.name] = sourceOutputs[link.from[1]];
      } else if (node.inputDefaults?.[socket.name] !== undefined) {
        // Per-instance override for this unconnected input.
        inputs[socket.name] = node.inputDefaults[socket.name];
      } else if (node.params?.[socket.name] !== undefined) {
        // Backward compat: config moved from params to inputs (issue #58) is
        // still honored when an older graph stores it under `params`.
        inputs[socket.name] = node.params[socket.name];
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
    // Config that became input sockets (issue #58) is exposed to operators via
    // `params` too, so operators reading `params.x` keep working whether the
    // value is typed in or wired from another node.
    const params = { ...resolveParamDefaults(def), ...(node.params ?? {}), ...inputs };

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

  // Best-effort: also evaluate nodes whose per-node preview is open even when
  // they're not reachable from the output (issue #140) — a node being built up
  // in isolation should still preview. A standalone node with unmet inputs may
  // throw; that node's preview is skipped without failing the whole run. Reset
  // the cycle-guard after a failure since a thrown evaluation unwinds without
  // clearing the ids it marked as visiting.
  for (const id of previewRoots) {
    if (!nodeById.has(id) || nodeOutputs.has(id)) continue;
    try {
      evaluateNode(id);
    } catch {
      visiting.clear();
    }
  }

  return { output, nodeOutputs };
}
