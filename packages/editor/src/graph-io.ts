import {
  createGraph,
  parameterSocketType,
  type Graph,
  type GraphNode,
  type GraphParameter,
} from '@vector-nodes/core';
import type { Edge } from '@xyflow/react';

import type { VNodeFlowNode } from './flow';

/**
 * Derive the network's function parameters from the Parameter nodes on the
 * canvas (issue #81). Each named Parameter node exposes one argument of the
 * generated function; its `name` param becomes the parameter `id` (codegen
 * sanitizes both the signature arg and the in-body reference identically, so
 * they bind). Multiple Parameter nodes sharing a name collapse to one argument,
 * kept in first-appearance order; unnamed Parameter nodes are ignored.
 */
function parametersFromNodes(nodes: VNodeFlowNode[]): GraphParameter[] {
  const params: GraphParameter[] = [];
  const seen = new Set<string>();
  for (const node of nodes) {
    const type = parameterSocketType(node.data.nodeType);
    if (type === null) continue;
    const name = node.data.params.name;
    if (typeof name !== 'string' || name.trim() === '' || seen.has(name)) continue;
    seen.add(name);
    params.push({ id: name, type });
  }
  return params;
}

/**
 * Convert the editor's React Flow nodes and edges back into a core {@link Graph},
 * preserving node positions and params. The inverse of `graphToFlowNodes` /
 * `graphToFlowEdges`.
 */
export function flowToGraph(nodes: VNodeFlowNode[], edges: Edge[]): Graph {
  return createGraph({
    parameters: parametersFromNodes(nodes),
    nodes: nodes.map((node): GraphNode => {
      const graphNode: GraphNode = {
        id: node.id,
        type: node.data.nodeType,
        position: [node.position.x, node.position.y],
      };
      if (Object.keys(node.data.params).length > 0) {
        graphNode.params = { ...node.data.params };
      }
      if (Object.keys(node.data.inputDefaults).length > 0) {
        graphNode.inputDefaults = { ...node.data.inputDefaults };
      }
      return graphNode;
    }),
    links: edges.map((edge) => ({
      from: [edge.source, edge.sourceHandle ?? ''],
      to: [edge.target, edge.targetHandle ?? ''],
    })),
  });
}

/** Trigger a browser download of `text` as `filename`. */
export function downloadText(filename: string, text: string): void {
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

/** The largest `n<number>` id suffix among nodes, or 0. Used to keep new ids unique. */
export function maxAutoId(nodes: VNodeFlowNode[]): number {
  let max = 0;
  for (const node of nodes) {
    const m = /^n(\d+)$/.exec(node.id);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return max;
}
