import type { Connection, Edge } from '@xyflow/react';

import { socketsCompatible } from './connection';
import type { VNodeFlowNode } from './flow';

/** Max gap (px) between the facing edges of two nodes to trigger auto-connect. */
export const ADJACENCY_GAP = 80;
/** Allow this much horizontal overlap and still treat the nodes as adjacent. */
const OVERLAP_TOL = 30;
/** Require this fraction of the smaller node's height to overlap vertically. */
const MIN_V_OVERLAP = 0.25;

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

function boxOf(node: VNodeFlowNode): Box {
  const w = node.measured?.width ?? node.width ?? 160;
  const h = node.measured?.height ?? node.height ?? 80;
  return { x: node.position.x, y: node.position.y, w, h };
}

/**
 * The first output→input pair between `src` and `dst` that may connect: types
 * compatible, not already wired, and (for a single-value input) not already
 * occupied. Array inputs always qualify since they collect connections (#99).
 */
function firstCompatiblePair(
  src: VNodeFlowNode,
  dst: VNodeFlowNode,
  edges: Edge[],
): Connection | null {
  for (const out of src.data.outputs) {
    for (const input of dst.data.inputs) {
      if (!socketsCompatible(out, input)) continue;
      const already = edges.some(
        (e) =>
          e.source === src.id &&
          e.sourceHandle === out.name &&
          e.target === dst.id &&
          e.targetHandle === input.name,
      );
      if (already) continue;
      if (
        !input.isArray &&
        edges.some((e) => e.target === dst.id && e.targetHandle === input.name)
      ) {
        continue;
      }
      return { source: src.id, sourceHandle: out.name, target: dst.id, targetHandle: input.name };
    }
  }
  return null;
}

/**
 * Propose a connection for a node being dragged next to a compatible neighbor
 * (issue #137): when the dragged node's box sits just left or right of another's
 * (within {@link ADJACENCY_GAP}, vertically overlapping), wire the left node's
 * output into the right node's input — the closest such pair wins. Returns `null`
 * when no neighbor is adjacent and compatible.
 */
export function autoConnectCandidate(
  dragged: VNodeFlowNode,
  others: VNodeFlowNode[],
  edges: Edge[],
): Connection | null {
  const a = boxOf(dragged);
  let best: { conn: Connection; gap: number } | null = null;
  for (const other of others) {
    if (other.id === dragged.id) continue;
    const b = boxOf(other);
    const vOverlap = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
    if (vOverlap < Math.min(a.h, b.h) * MIN_V_OVERLAP) continue;

    const gapDraggedLeft = b.x - (a.x + a.w); // dragged sits left of other
    const gapOtherLeft = a.x - (b.x + b.w); // other sits left of dragged
    let src: VNodeFlowNode;
    let dst: VNodeFlowNode;
    let gap: number;
    if (gapDraggedLeft >= -OVERLAP_TOL && gapDraggedLeft <= ADJACENCY_GAP) {
      [src, dst, gap] = [dragged, other, gapDraggedLeft];
    } else if (gapOtherLeft >= -OVERLAP_TOL && gapOtherLeft <= ADJACENCY_GAP) {
      [src, dst, gap] = [other, dragged, gapOtherLeft];
    } else {
      continue;
    }

    const conn = firstCompatiblePair(src, dst, edges);
    if (!conn) continue;
    const score = Math.abs(gap);
    if (!best || score < best.gap) best = { conn, gap: score };
  }
  return best?.conn ?? null;
}
