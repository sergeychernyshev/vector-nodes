import {
  collapseSelection,
  expandMetaNode,
  META_INPUT_ID,
  META_OUTPUT_ID,
  metaNodeDefinitionToNodeDef,
  NodeRegistry,
  type Graph,
  type GraphLink,
  type GraphNode,
  type InterfaceSocket,
  type MetaNodeDefinition,
} from '@vector-nodes/core';
import type { Edge } from '@xyflow/react';

import {
  graphToFlowEdges,
  graphToFlowNodes,
  VNODE_TYPE,
  type FlowSocket,
  type VNodeFlowNode,
} from './flow';
import { flowToGraph } from './graph-io';

/** Meta-node definitions held alongside the editor's nodes/edges. */
export type MetaNodes = Record<string, MetaNodeDefinition>;

/** A registry = base definitions + a definition per meta-node, so instances
 * render with their interface sockets and links type-check. */
export function augmentedRegistry(base: NodeRegistry, metaNodes: MetaNodes): NodeRegistry {
  const metaDefs = Object.entries(metaNodes).map(([name, def]) =>
    metaNodeDefinitionToNodeDef(name, def),
  );
  return new NodeRegistry([...base.list(), ...metaDefs]);
}

/** Reassemble the current editor state into a core {@link Graph}. */
export function currentGraph(nodes: VNodeFlowNode[], edges: Edge[], metaNodes: MetaNodes): Graph {
  const graph = flowToGraph(nodes, edges);
  return Object.keys(metaNodes).length > 0 ? { ...graph, metaNodes } : graph;
}

/** Editor view of a graph: flow nodes/edges plus meta-node definitions. */
export interface FlowState {
  nodes: VNodeFlowNode[];
  edges: Edge[];
  metaNodes: MetaNodes;
}

function flowStateOf(graph: Graph, base: NodeRegistry): FlowState {
  const metaNodes = graph.metaNodes ?? {};
  const registry = augmentedRegistry(base, metaNodes);
  return {
    nodes: graphToFlowNodes(graph, registry),
    edges: graphToFlowEdges(graph),
    metaNodes,
  };
}

function centroid(nodes: VNodeFlowNode[]): [number, number] {
  if (nodes.length === 0) return [0, 0];
  let sx = 0;
  let sy = 0;
  for (const n of nodes) {
    sx += n.position.x;
    sy += n.position.y;
  }
  return [sx / nodes.length, sy / nodes.length];
}

/** Collapse the selected node ids into a meta-node instance. */
export function collapse(
  state: FlowState,
  selectedIds: readonly string[],
  base: NodeRegistry,
): FlowState & { instanceId: string } {
  const registry = augmentedRegistry(base, state.metaNodes);
  const graph = currentGraph(state.nodes, state.edges, state.metaNodes);
  const selectedNodes = state.nodes.filter((n) => selectedIds.includes(n.id));
  const { graph: collapsed, instanceId } = collapseSelection(graph, selectedIds, registry, {
    position: centroid(selectedNodes),
  });
  return { ...flowStateOf(collapsed, base), instanceId };
}

/** Expand (ungroup) the meta-node instance back into the graph. */
export function expand(state: FlowState, instanceId: string, base: NodeRegistry): FlowState {
  const graph = currentGraph(state.nodes, state.edges, state.metaNodes);
  return flowStateOf(expandMetaNode(graph, instanceId), base);
}

const toFlowSocket = (s: InterfaceSocket): FlowSocket => ({
  name: s.name,
  type: s.type,
  isArray: s.isArray ?? false,
});

function boundaryNode(
  id: string,
  inputs: FlowSocket[],
  outputs: FlowSocket[],
  position: { x: number; y: number },
): VNodeFlowNode {
  return {
    id,
    type: VNODE_TYPE,
    position,
    deletable: false,
    data: { label: id, nodeType: id, params: {}, paramDefs: [], inputs, outputs },
  };
}

/**
 * Render a meta-node subgraph as editable flow nodes/edges. The interface is
 * shown as two boundary pseudo-nodes — `$in` (its outputs are the meta-node's
 * inputs) and `$out` (its inputs are the meta-node's outputs) — so links to the
 * boundary are visible and editable.
 */
export function subgraphToFlow(
  def: MetaNodeDefinition,
  registry: NodeRegistry,
): { nodes: VNodeFlowNode[]; edges: Edge[] } {
  const interior = graphToFlowNodes({ nodes: def.nodes, links: [] } as unknown as Graph, registry);
  const ys = interior.map((n) => n.position.y);
  const midY = ys.length ? ys.reduce((a, b) => a + b, 0) / ys.length : 0;
  const minX = interior.length ? Math.min(...interior.map((n) => n.position.x)) : 0;
  const maxX = interior.length ? Math.max(...interior.map((n) => n.position.x)) : 200;
  const nodes = [
    boundaryNode(META_INPUT_ID, [], def.interface.inputs.map(toFlowSocket), {
      x: minX - 220,
      y: midY,
    }),
    ...interior,
    boundaryNode(META_OUTPUT_ID, def.interface.outputs.map(toFlowSocket), [], {
      x: maxX + 220,
      y: midY,
    }),
  ];
  const edges = graphToFlowEdges({ links: def.links } as unknown as Graph);
  return { nodes, edges };
}

/**
 * Rebuild a meta-node definition from edited subgraph flow nodes/edges,
 * preserving the interface. Boundary `$in`/`$out` nodes are excluded from the
 * subgraph's nodes; links touching them are kept as interface bridges.
 */
export function flowToSubgraph(
  def: MetaNodeDefinition,
  nodes: VNodeFlowNode[],
  edges: Edge[],
): MetaNodeDefinition {
  const interior = nodes.filter((n) => n.id !== META_INPUT_ID && n.id !== META_OUTPUT_ID);
  const subNodes: GraphNode[] = interior.map((node) => {
    const graphNode: GraphNode = {
      id: node.id,
      type: node.data.nodeType,
      position: [node.position.x, node.position.y],
    };
    if (Object.keys(node.data.params).length > 0) graphNode.params = { ...node.data.params };
    return graphNode;
  });
  const links: GraphLink[] = edges.map((edge) => ({
    from: [edge.source, edge.sourceHandle ?? ''],
    to: [edge.target, edge.targetHandle ?? ''],
  }));
  return { interface: def.interface, nodes: subNodes, links };
}
