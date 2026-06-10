import { createBasicRegistry, createGraph } from '@vector-nodes/core';
import type { Edge } from '@xyflow/react';
import { describe, expect, it } from 'vitest';

import { cloneFlowNode, rewireForAltDrag } from './duplicate';
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

  it("moves the dragged node's outputs to the clone", () => {
    const out = result.find((e) => e.id === 'out')!;
    expect(out.source).toBe('B');
    expect(out.target).toBe('dst');
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
