import {
  metaNodeDefinitionToNodeDef,
  metaNodeName,
  OUTPUT_NODE_TYPE,
  resolveParamDefaults,
  socketColor,
  type Graph,
  type MetaNodeDefinition,
  type NodeDefinition,
  type NodeRegistry,
  type ParamDefinition,
  type SocketType,
} from '@vector-nodes/core';
import type { Edge, Node } from '@xyflow/react';

/** The React Flow node type id for our custom node component. */
export const VNODE_TYPE = 'vnode';

/** A socket as rendered on a flow node. */
export interface FlowSocket {
  name: string;
  type: SocketType;
  isArray: boolean;
}

/** Data carried on a React Flow node mirroring a graph node. */
export interface FlowNodeData extends Record<string, unknown> {
  /** Display label. */
  label: string;
  /** The underlying node type. */
  nodeType: string;
  /** Static parameter values. */
  params: Record<string, unknown>;
  /** Parameter definitions (type/range) for rendering inline editors. */
  paramDefs: readonly ParamDefinition[];
  inputs: FlowSocket[];
  outputs: FlowSocket[];
}

export type VNodeFlowNode = Node<FlowNodeData>;

/** The input/output sockets of a definition, as {@link FlowSocket}s. */
export function socketsOf(def: NodeDefinition): {
  inputs: FlowSocket[];
  outputs: FlowSocket[];
} {
  const toSocket = (s: { name: string; type: SocketType; isArray?: boolean }): FlowSocket => ({
    name: s.name,
    type: s.type,
    isArray: s.isArray ?? false,
  });
  return {
    inputs: def.inputs.map(toSocket),
    outputs: def.outputs.map(toSocket),
  };
}

/** Inline style for a socket handle: its Blender color. */
export function socketStyle(socket: FlowSocket): { background: string } {
  return { background: socketColor(socket.type) };
}

/** Class name for a socket handle (field sockets get a ring). */
export function socketClassName(socket: FlowSocket): string {
  return socket.isArray ? 'vnode__handle vnode__handle--field' : 'vnode__handle';
}

/** Convert a graph's nodes into React Flow nodes, resolving labels/sockets via the registry. */
export function graphToFlowNodes(graph: Graph, registry: NodeRegistry): VNodeFlowNode[] {
  return graph.nodes.map((node) => {
    const def = registry.get(node.type);
    const sockets = def ? socketsOf(def) : { inputs: [], outputs: [] };
    return {
      id: node.id,
      type: VNODE_TYPE,
      position: { x: node.position?.[0] ?? 0, y: node.position?.[1] ?? 0 },
      data: {
        label: node.label ?? def?.label ?? node.type,
        nodeType: node.type,
        params: node.params ?? {},
        paramDefs: def?.params ?? [],
        inputs: sockets.inputs,
        outputs: sockets.outputs,
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

/**
 * Build a new React Flow node for a definition at `position`, with params
 * initialized to the definition's defaults.
 */
export function createFlowNode(
  def: NodeDefinition,
  position: { x: number; y: number },
  id: string,
): VNodeFlowNode {
  const sockets = socketsOf(def);
  return {
    id,
    type: VNODE_TYPE,
    position,
    data: {
      label: def.label ?? def.type,
      nodeType: def.type,
      params: resolveParamDefaults(def),
      paramDefs: def.params,
      inputs: sockets.inputs,
      outputs: sockets.outputs,
    },
  };
}

/** Whether the canvas already contains an OutputGeometry node. */
export function hasOutputNode(nodes: VNodeFlowNode[]): boolean {
  return nodes.some((n) => n.data.nodeType === OUTPUT_NODE_TYPE);
}

/** Result of checking whether a node type may be added to the canvas. */
export interface AddCheck {
  ok: boolean;
  reason?: string;
}

/**
 * Whether a node of `type` may be added. Enforces the single-output rule: a
 * graph may contain only one OutputGeometry node.
 */
export function canAddNode(type: string, nodes: VNodeFlowNode[]): AddCheck {
  if (type === OUTPUT_NODE_TYPE && hasOutputNode(nodes)) {
    return {
      ok: false,
      reason: 'There can only be one Output Geometry node.',
    };
  }
  return { ok: true };
}

/**
 * Resolve the {@link NodeDefinition} for a palette `type`, looking past the
 * active registry into the meta-node `library` for library-only entries. When
 * the definition comes from the library, `metaToAdd` carries the `[name, def]`
 * the caller must register so the instance keeps rendering. Returns an empty
 * object for unknown types.
 */
export function resolveAddableDef(
  type: string,
  registry: NodeRegistry,
  library: Record<string, MetaNodeDefinition>,
): { def?: NodeDefinition; metaToAdd?: [string, MetaNodeDefinition] } {
  const existing = registry.get(type);
  if (existing) return { def: existing };
  const libName = metaNodeName(type);
  if (libName && library[libName]) {
    return {
      def: metaNodeDefinitionToNodeDef(libName, library[libName]),
      metaToAdd: [libName, library[libName]],
    };
  }
  return {};
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

/** Case-insensitive filter of palette items by label, type, or category. */
export function filterPalette(items: PaletteItem[], query: string): PaletteItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter(
    (item) =>
      item.label.toLowerCase().includes(q) ||
      item.type.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q),
  );
}
