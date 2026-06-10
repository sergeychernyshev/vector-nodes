import { canConvertImplicitly } from './conversions.js';
import {
  endpointNode,
  endpointSocket,
  OUTPUT_NODE_TYPE,
  type Endpoint,
  type Graph,
  type GraphLink,
} from './graph.js';
import {
  resolveInputSocket,
  type NodeDefinition,
  type SocketDefinition,
} from './node-definition.js';
import type { NodeRegistry } from './registry.js';

/** The kinds of static-validation problems a graph can have. */
export type GraphValidationCode =
  | 'duplicate-node-id'
  | 'unknown-node-type'
  | 'missing-output'
  | 'multiple-outputs'
  | 'dangling-link-node'
  | 'dangling-link-socket'
  | 'duplicate-input-link'
  | 'type-mismatch'
  | 'field-mismatch'
  | 'cycle';

/** A single static-validation problem with enough context to locate it. */
export interface GraphValidationIssue {
  code: GraphValidationCode;
  message: string;
  /** Relevant node id, when the issue concerns a node. */
  nodeId?: string;
  /** Index into `graph.links`, when the issue concerns a link. */
  linkIndex?: number;
}

/** The outcome of {@link validateGraph}. */
export interface GraphValidationResult {
  valid: boolean;
  issues: GraphValidationIssue[];
}

/** Error thrown by {@link assertValidGraph} carrying the structured issues. */
export class GraphValidationError extends Error {
  readonly issues: GraphValidationIssue[];

  constructor(issues: GraphValidationIssue[]) {
    super(
      `Invalid graph:\n${issues.map((issue) => `  - [${issue.code}] ${issue.message}`).join('\n')}`,
    );
    this.name = 'GraphValidationError';
    this.issues = issues;
  }
}

function endpointLabel(endpoint: Endpoint): string {
  return `${endpointNode(endpoint)}.${endpointSocket(endpoint)}`;
}

function findSocket(
  sockets: readonly SocketDefinition[],
  name: string,
): SocketDefinition | undefined {
  return sockets.find((socket) => socket.name === name);
}

/**
 * Statically validate a {@link Graph} against the node definitions in
 * `registry`. Checks, in order: duplicate node ids, unknown node types, the
 * single-output rule, dangling links (to a missing node or socket), duplicate
 * links into one input, link type/field compatibility (honoring implicit
 * conversions), and dependency cycles.
 *
 * Returns every issue found; an empty `issues` array means the graph is valid.
 * Validation of embedded meta-node definitions is deferred to Phase 5.
 */
export function validateGraph(graph: Graph, registry: NodeRegistry): GraphValidationResult {
  const issues: GraphValidationIssue[] = [];

  // Resolve each node's definition once; track known node ids.
  const definitions = new Map<string, NodeDefinition>();
  const knownNodeIds = new Set<string>();
  for (const node of graph.nodes) {
    if (knownNodeIds.has(node.id)) {
      issues.push({
        code: 'duplicate-node-id',
        nodeId: node.id,
        message: `Duplicate node id "${node.id}".`,
      });
      continue;
    }
    knownNodeIds.add(node.id);

    const def = registry.get(node.type);
    if (def === undefined) {
      issues.push({
        code: 'unknown-node-type',
        nodeId: node.id,
        message: `Node "${node.id}" has unknown type "${node.type}".`,
      });
    } else {
      definitions.set(node.id, def);
    }
  }

  // Single-output rule.
  const outputs = graph.nodes.filter((node) => node.type === OUTPUT_NODE_TYPE);
  if (outputs.length === 0) {
    issues.push({
      code: 'missing-output',
      message: `Graph has no ${OUTPUT_NODE_TYPE} node; exactly one is required.`,
    });
  } else if (outputs.length > 1) {
    issues.push({
      code: 'multiple-outputs',
      message: `Graph has ${outputs.length} ${OUTPUT_NODE_TYPE} nodes; exactly one is allowed.`,
    });
  }

  // Per-link checks: dangling references, fan-in, type/field compatibility.
  const inputSeen = new Set<string>();
  graph.links.forEach((link, linkIndex) => {
    /** Report a dangling node reference; returns the node's definition if usable. */
    const checkEndpointNode = (
      endpoint: Endpoint,
      side: 'from' | 'to',
    ): NodeDefinition | undefined => {
      const id = endpointNode(endpoint);
      if (!knownNodeIds.has(id)) {
        issues.push({
          code: 'dangling-link-node',
          linkIndex,
          message: `Link ${side} references unknown node "${id}".`,
        });
        return undefined;
      }
      return definitions.get(id);
    };

    const fromDef = checkEndpointNode(link.from, 'from');
    const toDef = checkEndpointNode(link.to, 'to');

    // Detect more than one link into the same input socket.
    const toKey = endpointLabel(link.to);
    if (inputSeen.has(toKey)) {
      issues.push({
        code: 'duplicate-input-link',
        linkIndex,
        message: `Input ${toKey} receives more than one link.`,
      });
    }
    inputSeen.add(toKey);

    if (fromDef === undefined || toDef === undefined) return;

    const fromSocket = findSocket(fromDef.outputs, endpointSocket(link.from));
    const toSocket = resolveInputSocket(toDef, endpointSocket(link.to));
    if (fromSocket === undefined) {
      issues.push({
        code: 'dangling-link-socket',
        linkIndex,
        message: `No output socket "${endpointSocket(link.from)}" on node "${endpointNode(
          link.from,
        )}".`,
      });
    }
    if (toSocket === undefined) {
      issues.push({
        code: 'dangling-link-socket',
        linkIndex,
        message: `No input socket "${endpointSocket(link.to)}" on node "${endpointNode(link.to)}".`,
      });
    }
    if (fromSocket === undefined || toSocket === undefined) return;

    if ((fromSocket.isArray ?? false) !== (toSocket.isArray ?? false)) {
      issues.push({
        code: 'field-mismatch',
        linkIndex,
        message: `Link ${endpointLabel(link.from)} → ${endpointLabel(
          link.to,
        )} connects a ${fromSocket.isArray ? 'field' : 'single value'} to a ${
          toSocket.isArray ? 'field' : 'single value'
        }.`,
      });
    } else if (!canConvertImplicitly(fromSocket.type, toSocket.type)) {
      issues.push({
        code: 'type-mismatch',
        linkIndex,
        message: `Link ${endpointLabel(link.from)} → ${endpointLabel(
          link.to,
        )} connects ${fromSocket.type} to ${toSocket.type}, with no implicit conversion.`,
      });
    }
  });

  // Dependency cycle detection over links between known nodes.
  const cycle = detectCycle(graph.links, knownNodeIds);
  if (cycle.length > 0) {
    issues.push({
      code: 'cycle',
      message: `Graph contains a cycle: ${cycle.join(' → ')}.`,
    });
  }

  return { valid: issues.length === 0, issues };
}

/** Assert a graph is valid against `registry`, throwing on any issue. */
export function assertValidGraph(graph: Graph, registry: NodeRegistry): void {
  const { issues } = validateGraph(graph, registry);
  if (issues.length > 0) {
    throw new GraphValidationError(issues);
  }
}

/**
 * Find one dependency cycle among `links` (treating each link as a directed
 * edge `from → to`), restricted to nodes in `knownNodeIds`. Returns the cycle
 * as a list of node ids (closing back on the first), or an empty array if the
 * graph is acyclic.
 */
function detectCycle(links: readonly GraphLink[], knownNodeIds: ReadonlySet<string>): string[] {
  const adjacency = new Map<string, string[]>();
  for (const link of links) {
    const from = endpointNode(link.from);
    const to = endpointNode(link.to);
    if (!knownNodeIds.has(from) || !knownNodeIds.has(to)) continue;
    const targets = adjacency.get(from);
    if (targets) targets.push(to);
    else adjacency.set(from, [to]);
  }

  const WHITE = 0;
  const GRAY = 1;
  const BLACK = 2;
  const color = new Map<string, number>();
  const stack: string[] = [];

  function visit(node: string): string[] | null {
    color.set(node, GRAY);
    stack.push(node);
    for (const next of adjacency.get(node) ?? []) {
      const state = color.get(next) ?? WHITE;
      if (state === GRAY) {
        const start = stack.indexOf(next);
        return [...stack.slice(start), next];
      }
      if (state === WHITE) {
        const found = visit(next);
        if (found) return found;
      }
    }
    stack.pop();
    color.set(node, BLACK);
    return null;
  }

  for (const node of knownNodeIds) {
    if ((color.get(node) ?? WHITE) === WHITE) {
      const found = visit(node);
      if (found) return found;
    }
  }
  return [];
}
