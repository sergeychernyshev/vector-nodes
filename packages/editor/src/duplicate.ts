import type { Edge } from '@xyflow/react';

import type { VNodeFlowNode } from './flow';

/**
 * A copy of `node` with a new id, at the same position, with its params and
 * input defaults cloned (so editing one doesn't change the other). Used for
 * alt-drag duplication (issue #98).
 */
export function cloneFlowNode(node: VNodeFlowNode, id: string): VNodeFlowNode {
  return {
    ...node,
    id,
    selected: false,
    dragging: false,
    position: { ...node.position },
    data: {
      ...node.data,
      params: { ...node.data.params },
      inputDefaults: { ...node.data.inputDefaults },
    },
  };
}

/**
 * Rewire edges for an alt-drag duplicate (issue #98), where the dragged node
 * (`draggedId`) is pulled away as the copy and `cloneId` is left behind to keep
 * the original's full wiring:
 *
 * - the dragged node's **output** edges move to the clone (so the node left
 *   behind keeps feeding its downstream), and
 * - the dragged node's **input** edges are duplicated into the clone (so both
 *   the copy and the clone read from the same sources).
 *
 * The dragged node thus keeps only its inputs — a copy wired to the same
 * sources, with no outputs — while the clone left at the origin is unchanged
 * from how the node was before the drag. `edgeId` mints a unique id per moved or
 * duplicated edge; re-id'ing the moved output edges frees their original id so
 * reconnecting the dragged node to the same target afterward isn't dropped as a
 * duplicate (an output edge's id is derived from its old source).
 */
export function rewireForAltDrag(
  edges: Edge[],
  draggedId: string,
  cloneId: string,
  edgeId: (edge: Edge) => string,
): Edge[] {
  const next: Edge[] = [];
  for (const edge of edges) {
    next.push(edge.source === draggedId ? { ...edge, id: edgeId(edge), source: cloneId } : edge);
    if (edge.target === draggedId) {
      next.push({ ...edge, id: edgeId(edge), target: cloneId });
    }
  }
  return next;
}

/**
 * Rewire edges for an alt+shift-drag duplicate, where the dragged node
 * (`draggedId`) is pulled away and `cloneId` is left at the origin. Both end up
 * wired in parallel wherever a target can take it:
 *
 * - every **input** edge is duplicated so both read from the same sources;
 * - an **output** edge whose target can take another connection
 *   (`canDuplicateOutput`, e.g. an array input) is duplicated so both feed it;
 * - an output edge into a **single-value** input is *moved* to the clone left at
 *   the origin, so the node staying in place keeps that connection and the
 *   dragged copy doesn't steal the one slot.
 *
 * `edgeId` mints a unique id per moved/duplicated edge.
 */
export function rewireCloneWithConnections(
  edges: Edge[],
  draggedId: string,
  cloneId: string,
  edgeId: (edge: Edge) => string,
  canDuplicateOutput: (edge: Edge) => boolean,
): Edge[] {
  const next: Edge[] = [];
  for (const edge of edges) {
    if (edge.source === draggedId) {
      if (canDuplicateOutput(edge)) {
        next.push(edge); // the dragged copy keeps feeding it…
        next.push({ ...edge, id: edgeId(edge), source: cloneId }); // …and so does the clone
      } else {
        // Single-value target: leave the connection on the clone at the origin.
        next.push({ ...edge, id: edgeId(edge), source: cloneId });
      }
    } else {
      next.push(edge);
    }
    if (edge.target === draggedId) {
      next.push({ ...edge, id: edgeId(edge), target: cloneId });
    }
  }
  return next;
}
