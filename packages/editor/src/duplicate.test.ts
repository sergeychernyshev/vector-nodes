import { createBasicRegistry, createGraph } from '@vector-nodes/core';
import type { Edge } from '@xyflow/react';
import { describe, expect, it } from 'vitest';

import { cloneFlowNode, rewireCloneWithConnections, rewireForAltDrag } from './duplicate';
import { graphToFlowNodes } from './flow';

const registry = createBasicRegistry();

function node(id: string, type = 'Translate') {
  const [flow] = graphToFlowNodes(
    createGraph({ nodes: [{ id, type, position: [10, 20] }] }),
    registry,
  );
  return flow!;
}

describe('cloneFlowNode (issue #98)', () => {
  it('copies position and gives a new, unselected id', () => {
    const clone = cloneFlowNode(node('a'), 'b');
    expect(clone.id).toBe('b');
    expect(clone.position).toEqual({ x: 10, y: 20 });
    expect(clone.selected).toBe(false);
    expect(clone.dragging).toBe(false);
  });

  it('clones params and inputDefaults so edits do not leak between copies', () => {
    const original = node('a');
    original.data.inputDefaults = { offset: [1, 2, 3] };
    const clone = cloneFlowNode(original, 'b');
    expect(clone.data.inputDefaults).toEqual({ offset: [1, 2, 3] });
    expect(clone.data.inputDefaults).not.toBe(original.data.inputDefaults);
    expect(clone.data.params).not.toBe(original.data.params);
  });
});

describe('rewireForAltDrag (issue #98)', () => {
  // src → A → dst, plus an unrelated edge.
  const edges: Edge[] = [
    { id: 'in', source: 'src', sourceHandle: 'geometry', target: 'A', targetHandle: 'geometry' },
    { id: 'out', source: 'A', sourceHandle: 'geometry', target: 'dst', targetHandle: 'geometry' },
    { id: 'other', source: 'x', sourceHandle: 'v', target: 'y', targetHandle: 'v' },
  ];
  const result = rewireForAltDrag(edges, 'A', 'B', (e) => `${e.id}__B`);

  it("moves the dragged node's outputs to the clone, re-id'd to free the original id", () => {
    const out = result.find((e) => e.id === 'out__B')!;
    expect(out.source).toBe('B');
    expect(out.target).toBe('dst');
    // The original output-edge id is freed so reconnecting the dragged node to
    // the same target later isn't dropped as a duplicate (issue #98 follow-up).
    expect(result.find((e) => e.id === 'out')).toBeUndefined();
  });

  it("duplicates the dragged node's inputs into the clone, keeping the original", () => {
    const original = result.find((e) => e.id === 'in')!;
    expect(original.target).toBe('A'); // dragged copy keeps its input
    const dup = result.find((e) => e.id === 'in__B')!;
    expect(dup.source).toBe('src');
    expect(dup.target).toBe('B'); // clone wired to the same source
  });

  it('leaves unrelated edges untouched', () => {
    expect(result.find((e) => e.id === 'other')).toEqual(edges[2]);
  });

  it('adds exactly one edge (the duplicated input)', () => {
    expect(result).toHaveLength(edges.length + 1);
  });
});

describe('rewireCloneWithConnections (alt+shift-drag)', () => {
  // src → A; A → M.points (array target); A → T.val (single-value target).
  const edges: Edge[] = [
    { id: 'in', source: 'src', sourceHandle: 'v', target: 'A', targetHandle: 'a' },
    { id: 'arr', source: 'A', sourceHandle: 'out', target: 'M', targetHandle: 'points' },
    { id: 'sc', source: 'A', sourceHandle: 'out', target: 'T', targetHandle: 'val' },
  ];
  const canDuplicateOutput = (e: Edge) => e.targetHandle === 'points'; // only the array input
  const result = rewireCloneWithConnections(
    edges,
    'A',
    'B',
    (e) => `${e.id}__B`,
    canDuplicateOutput,
  );

  it("keeps all of the original's edges", () => {
    expect(result.find((e) => e.id === 'in')).toEqual(edges[0]);
    expect(result.find((e) => e.id === 'arr')).toEqual(edges[1]);
    expect(result.find((e) => e.id === 'sc')).toEqual(edges[2]);
  });

  it("duplicates the original's inputs into the clone", () => {
    const dup = result.find((e) => e.id === 'in__B')!;
    expect(dup.source).toBe('src');
    expect(dup.target).toBe('B');
  });

  it('duplicates outputs into array targets but skips single-value targets', () => {
    const arrDup = result.find((e) => e.id === 'arr__B')!;
    expect(arrDup.source).toBe('B');
    expect(arrDup.target).toBe('M');
    // The single-value output slot is already held by the original, so skip it.
    expect(result.find((e) => e.id === 'sc__B')).toBeUndefined();
  });
});
