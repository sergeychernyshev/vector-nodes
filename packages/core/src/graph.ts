import type { SocketType } from './socket-types.js';

/** Format discriminator written into every `.vnodes` document. */
export const VNODES_FORMAT = 'vector-nodes';

/** Current `.vnodes` format version. */
export const VNODES_VERSION = '1.0';

/** Node type of the network's single result node. */
export const OUTPUT_NODE_TYPE = 'OutputGeometry';

/** Human-facing network info; `name` seeds the generated function name. */
export interface GraphMetadata {
  name?: string;
  author?: string;
  description?: string;
  created?: string;
  [key: string]: unknown;
}

/**
 * A network-level parameter: an external, typed input exposed as an argument of
 * the generated function. Distinct from a node's baked-in `params`.
 */
export interface GraphParameter {
  id: string;
  type: SocketType;
  isArray?: boolean;
  default?: unknown;
  min?: number;
  max?: number;
}

/** A node instance in a graph; `type` references a definition in the registry. */
export interface GraphNode {
  /** Stable unique id used by links. */
  id: string;
  type: string;
  /** Editor canvas position `[x, y]`. */
  position?: [number, number];
  /** Static parameter values baked into this node. */
  params?: Record<string, unknown>;
  /**
   * Per-instance values for unconnected input sockets, keyed by socket name.
   * They override the definition's socket defaults and are ignored when the
   * input is connected (the link supplies the value instead).
   */
  inputDefaults?: Record<string, unknown>;
  label?: string;
}

/** A `[nodeId, socketName]` reference to one end of a link. */
export type Endpoint = [nodeId: string, socket: string];

/** An edge connecting an output socket to an input socket. */
export interface GraphLink {
  /** Source output socket `[nodeId, outputSocketName]`. */
  from: Endpoint;
  /** Target input socket `[nodeId, inputSocketName]`. */
  to: Endpoint;
}

/** A boundary socket on a meta-node's interface. */
export interface InterfaceSocket {
  name: string;
  type: SocketType;
  isArray?: boolean;
}

/** The input/output boundary that a meta-node exposes to its parent graph. */
export interface NodeInterface {
  inputs: InterfaceSocket[];
  outputs: InterfaceSocket[];
}

/** A reusable meta-node (function) definition embedded in a graph. */
export interface MetaNodeDefinition {
  interface: NodeInterface;
  nodes: GraphNode[];
  links: GraphLink[];
}

/** The in-memory representation of a `.vnodes` network. */
export interface Graph {
  format: typeof VNODES_FORMAT;
  version: string;
  metadata?: GraphMetadata;
  parameters: GraphParameter[];
  nodes: GraphNode[];
  links: GraphLink[];
  /** Reusable meta-node definitions, keyed by name. */
  metaNodes?: Record<string, MetaNodeDefinition>;
}

/** Fields a caller may seed when constructing a graph. */
export type GraphInit = Partial<
  Pick<Graph, 'version' | 'metadata' | 'parameters' | 'nodes' | 'links' | 'metaNodes'>
>;

/**
 * Construct a {@link Graph} with the format discriminator set and array fields
 * defaulted to empty, overlaying any provided `init`.
 */
export function createGraph(init: GraphInit = {}): Graph {
  const graph: Graph = {
    format: VNODES_FORMAT,
    version: init.version ?? VNODES_VERSION,
    parameters: init.parameters ?? [],
    nodes: init.nodes ?? [],
    links: init.links ?? [],
  };
  if (init.metadata !== undefined) graph.metadata = init.metadata;
  if (init.metaNodes !== undefined) graph.metaNodes = init.metaNodes;
  return graph;
}

/** Append a node and return it. */
export function addNode(graph: Graph, node: GraphNode): GraphNode {
  graph.nodes.push(node);
  return node;
}

/** Append a link and return it. */
export function addLink(graph: Graph, link: GraphLink): GraphLink {
  graph.links.push(link);
  return link;
}

/** The node id of an endpoint. */
export function endpointNode(endpoint: Endpoint): string {
  return endpoint[0];
}

/** The socket name of an endpoint. */
export function endpointSocket(endpoint: Endpoint): string {
  return endpoint[1];
}

/** Find a node by id, or `undefined` if absent. */
export function getNode(graph: Graph, id: string): GraphNode | undefined {
  return graph.nodes.find((node) => node.id === id);
}

/** All nodes of a given node type. */
export function getNodesByType(graph: Graph, type: string): GraphNode[] {
  return graph.nodes.filter((node) => node.type === type);
}

/**
 * The network's output node (first node of type {@link OUTPUT_NODE_TYPE}), or
 * `undefined` if none exists. The single-output rule is enforced in validation.
 */
export function getOutputNode(graph: Graph): GraphNode | undefined {
  return graph.nodes.find((node) => node.type === OUTPUT_NODE_TYPE);
}

/** Links whose source (`from`) is the given node. */
export function linksFrom(graph: Graph, nodeId: string): GraphLink[] {
  return graph.links.filter((link) => link.from[0] === nodeId);
}

/** Links whose target (`to`) is the given node. */
export function linksTo(graph: Graph, nodeId: string): GraphLink[] {
  return graph.links.filter((link) => link.to[0] === nodeId);
}
