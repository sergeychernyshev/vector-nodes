import type { Graph, NodeRegistry } from '@vector-nodes/core';
import type { Edge, Node } from '@xyflow/react';

/** Data carried on a React Flow node mirroring a graph node. */
export interface FlowNodeData extends Record<string, unknown> {
  /** Display label (default node renders this). */
  label: string;
  /** The underlying node type. */
  nodeType: string;
  /** Static parameter values. */
  params: Record<string, unknown>;
}

export type VNodeFlowNode = Node<FlowNodeData>;

/** Convert a graph's nodes into React Flow nodes, resolving labels via the registry. */
export function graphToFlowNodes(graph: Graph, registry: NodeRegistry): VNodeFlowNode[] {
  return graph.nodes.map((node) => {
    const def = registry.get(node.type);
    return {
      id: node.id,
      position: { x: node.position?.[0] ?? 0, y: node.position?.[1] ?? 0 },
      data: {
        label: node.label ?? def?.label ?? node.type,
        nodeType: node.type,
        params: node.params ?? {},
      },
    };
  });
}

/** Convert a graph's links into React Flow edges (socket names become handles). */
export function graphToFlowEdges(graph: Graph): Edge[] {
  return graph.links.map((link, i) => ({
    id: `e${i}`,
    source: link.from[0],
    sourceHandle: link.from[1],
    target: link.to[0],
    targetHandle: link.to[1],
  }));
}

/** A palette entry for adding a node, derived from a definition. */
export interface PaletteItem {
  type: string;
  label: string;
  category: string;
}

/** List the registry's definitions as palette items, sorted by category then label. */
export function paletteItems(registry: NodeRegistry): PaletteItem[] {
  return registry
    .list()
    .map((def) => ({
      type: def.type,
      label: def.label ?? def.type,
      category: def.category ?? 'Other',
    }))
    .sort((a, b) => a.category.localeCompare(b.category) || a.label.localeCompare(b.label));
}
