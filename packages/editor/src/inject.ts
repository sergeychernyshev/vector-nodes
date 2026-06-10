import type { NodeDefinition, NodeRegistry } from '@vector-nodes/core';
import { addEdge, type Edge } from '@xyflow/react';

import { socketsCompatible } from './connection';
import { socketsOf, type FlowSocket, type PaletteItem } from './flow';

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

/** A palette entry that can feed a particular input, with the output to use. */
export interface SourceSuggestion extends PaletteItem {
  /** Output handle on this node that feeds the dragged input. */
  outputHandle: string;
}

/**
 * Registry definitions that could feed `input` — i.e. have an output socket
 * compatible with it — as palette entries carrying that output's handle. Used to
 * filter the node menu shown when a connection is dragged off an input into
 * empty space (issue #45). Sorted by category then label.
 */
export function suggestSourceNodes(registry: NodeRegistry, input: FlowSocket): SourceSuggestion[] {
  const suggestions: SourceSuggestion[] = [];
  for (const def of registry.list()) {
    const match = socketsOf(def).outputs.find((s) => socketsCompatible(s, input));
    if (match) {
      suggestions.push({
        type: def.type,
        label: def.label ?? def.type,
        category: def.category ?? 'Other',
        outputHandle: match.name,
      });
    }
  }
  return suggestions.sort(
    (a, b) => a.category.localeCompare(b.category) || a.label.localeCompare(b.label),
  );
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
