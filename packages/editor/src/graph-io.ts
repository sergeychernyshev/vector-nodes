import { createGraph, type Graph, type GraphNode } from '@vector-nodes/core';
import type { Edge } from '@xyflow/react';

import type { VNodeFlowNode } from './flow';

/**
 * Convert the editor's React Flow nodes and edges back into a core {@link Graph},
 * preserving node positions and params. The inverse of `graphToFlowNodes` /
 * `graphToFlowEdges`.
 */
export function flowToGraph(nodes: VNodeFlowNode[], edges: Edge[]): Graph {
  return createGraph({
    nodes: nodes.map((node): GraphNode => {
      const graphNode: GraphNode = {
        id: node.id,
        type: node.data.nodeType,
        position: [node.position.x, node.position.y],
      };
      if (Object.keys(node.data.params).length > 0) {
        graphNode.params = { ...node.data.params };
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
