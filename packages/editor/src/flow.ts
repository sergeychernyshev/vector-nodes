import {
  metaNodeDefinitionToNodeDef,
  metaNodeName,
  OUTPUT_NODE_TYPE,
  parseVariadicIndex,
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
  /** Definition default for an unconnected input socket, if any. */
  default?: unknown;
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
  /** Per-instance values for unconnected input sockets, keyed by socket name. */
  inputDefaults: Record<string, unknown>;
}

export type VNodeFlowNode = Node<FlowNodeData>;

/** The input/output sockets of a definition, as {@link FlowSocket}s. */
export function socketsOf(def: NodeDefinition): {
  inputs: FlowSocket[];
  outputs: FlowSocket[];
} {
  const toSocket = (s: {
    name: string;
    type: SocketType;
    isArray?: boolean;
    default?: unknown;
  }): FlowSocket => ({
    name: s.name,
    type: s.type,
    isArray: s.isArray ?? false,
    ...(s.default !== undefined ? { default: s.default } : {}),
  });
  return {
    inputs: def.inputs.map(toSocket),
    outputs: def.outputs.map(toSocket),
  };
}

/**
 * The input sockets to render on a node *instance*, given which input handles
 * currently have a link. For a node with a variadic input (issue #65) this is
 * the fixed inputs plus one socket per used variadic index and one trailing
 * empty socket, so there's always a free handle to connect another input.
 */
export function instanceInputs(
  def: NodeDefinition,
  incomingHandles: Iterable<string>,
): FlowSocket[] {
  const base = socketsOf(def).inputs;
  const variadic = def.variadicInput;
  if (!variadic) return base;
  let maxIndex = -1;
  for (const handle of incomingHandles) {
    const index = parseVariadicIndex(variadic.name, handle);
    if (index !== null && index > maxIndex) maxIndex = index;
  }
  const sockets: FlowSocket[] = Array.from({ length: maxIndex + 2 }, (_, i) => ({
    name: `${variadic.name}${i}`,
    type: variadic.type,
    isArray: variadic.isArray ?? false,
  }));
  return [...base, ...sockets];
}

/** Whether two socket lists are equal by name/type/field (ignoring defaults). */
function sameSockets(a: FlowSocket[], b: FlowSocket[]): boolean {
  return (
    a.length === b.length &&
    a.every((s, i) => s.name === b[i]!.name && s.type === b[i]!.type && s.isArray === b[i]!.isArray)
  );
}

/**
 * Recompute variadic nodes' input sockets from the current edges so their
 * handles grow/shrink as connections change (issue #65). Returns the same array
 * reference when nothing changed, so it's safe to call from an effect.
 */
export function reconcileVariadicInputs(
  nodes: VNodeFlowNode[],
  edges: Edge[],
  registry: NodeRegistry,
): VNodeFlowNode[] {
  let changed = false;
  const next = nodes.map((node) => {
    const def = registry.get(node.data.nodeType);
    if (!def?.variadicInput) return node;
    const incoming = edges.filter((e) => e.target === node.id).map((e) => e.targetHandle ?? '');
    const desired = instanceInputs(def, incoming);
    if (sameSockets(node.data.inputs, desired)) return node;
    changed = true;
    return { ...node, data: { ...node.data, inputs: desired } };
  });
  return changed ? next : nodes;
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
  // Variadic nodes size their input handles from how many links target them.
  const incoming = new Map<string, string[]>();
  for (const link of graph.links) {
    const list = incoming.get(link.to[0]);
    if (list) list.push(link.to[1]);
    else incoming.set(link.to[0], [link.to[1]]);
  }
  return graph.nodes.map((node) => {
    const def = registry.get(node.type);
    return {
      id: node.id,
      type: VNODE_TYPE,
      position: { x: node.position?.[0] ?? 0, y: node.position?.[1] ?? 0 },
      data: {
        label: node.label ?? def?.label ?? node.type,
        nodeType: node.type,
        params: node.params ?? {},
        paramDefs: def?.params ?? [],
        inputs: def ? instanceInputs(def, incoming.get(node.id) ?? []) : [],
        outputs: def ? socketsOf(def).outputs : [],
        inputDefaults: node.inputDefaults ?? {},
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
      // A fresh node has no links yet; variadic nodes start with one empty socket.
      inputs: instanceInputs(def, []),
      outputs: sockets.outputs,
      inputDefaults: {},
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

/**
 * Whether a pointer-up at `(bx, by)` is close enough to its pointer-down at
 * `(ax, ay)` to count as a tap rather than a drag/pan. Used so placing a node
 * works with mouse, touch, and pen alike (issue #59) without firing after a pan.
 */
export function isTap(ax: number, ay: number, bx: number, by: number, threshold = 6): boolean {
  return Math.hypot(bx - ax, by - ay) <= threshold;
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
