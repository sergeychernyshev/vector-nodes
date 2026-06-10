import type { NodeDefinition } from '@vector-nodes/core';
import { addEdge, type Edge } from '@xyflow/react';

import { socketsCompatible } from './connection';
import { socketsOf, type FlowSocket } from './flow';

/** How a node splices into a connection: which of its handles join each end. */
export interface InjectionPlan {
  /** Input handle on the new node that the connection's source feeds. */
  inputHandle: string;
  /** Output handle on the new node that feeds the connection's destination. */
  outputHandle: string;
}

/**
 * Plan how `def` could be injected onto a connection from `source` (an output
 * socket) to `dest` (an input socket): the new node needs an input that accepts
 * `source` and an output that `dest` accepts. Returns the handles to use, or
 * `null` when no compatible pair exists (issue #43).
 */
export function planInjection(
  def: NodeDefinition,
  source: FlowSocket,
  dest: FlowSocket,
): InjectionPlan | null {
  const { inputs, outputs } = socketsOf(def);
  const inputHandle = inputs.find((s) => socketsCompatible(source, s))?.name;
  const outputHandle = outputs.find((s) => socketsCompatible(s, dest))?.name;
  if (!inputHandle || !outputHandle) return null;
  return { inputHandle, outputHandle };
}

/**
 * Replace `edge` with two edges routed through the node `newNodeId`:
 * source → new node's `inputHandle`, and new node's `outputHandle` → destination.
 */
export function spliceEdge(
  edges: Edge[],
  edge: Edge,
  newNodeId: string,
  plan: InjectionPlan,
): Edge[] {
  const without = edges.filter((e) => e.id !== edge.id);
  return addEdge(
    {
      source: edge.source,
      sourceHandle: edge.sourceHandle ?? null,
      target: newNodeId,
      targetHandle: plan.inputHandle,
    },
    addEdge(
      {
        source: newNodeId,
        sourceHandle: plan.outputHandle,
        target: edge.target,
        targetHandle: edge.targetHandle ?? null,
      },
      without,
    ),
  );
}
