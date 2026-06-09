import { createBasicRegistry, createGraph } from '@vector-nodes/core';
import { describe, expect, it } from 'vitest';

import { graphToFlowEdges, graphToFlowNodes, paletteItems } from './flow';

const registry = createBasicRegistry();

const graph = createGraph({
  nodes: [
    { id: 'pa', type: 'PointArray', position: [10, 20] },
    { id: 'out', type: 'OutputGeometry' },
  ],
  links: [{ from: ['pa', 'geometry'], to: ['out', 'geometry'] }],
});

describe('graphToFlowNodes', () => {
  it('maps id, position, and resolves the label from the registry', () => {
    const [pa, out] = graphToFlowNodes(graph, registry);
    expect(pa).toMatchObject({
      id: 'pa',
      position: { x: 10, y: 20 },
      data: { label: 'Point Array', nodeType: 'PointArray' },
    });
    // Missing position defaults to the origin.
    expect(out!.position).toEqual({ x: 0, y: 0 });
  });

  it('prefers an explicit node label over the definition label', () => {
    const g = createGraph({
      nodes: [{ id: 'n', type: 'PointArray', label: 'My Points' }],
    });
    expect(graphToFlowNodes(g, registry)[0]!.data.label).toBe('My Points');
  });
});

describe('graphToFlowEdges', () => {
  it('maps endpoints to source/target with socket handles', () => {
    expect(graphToFlowEdges(graph)).toEqual([
      {
        id: 'e0',
        source: 'pa',
        sourceHandle: 'geometry',
        target: 'out',
        targetHandle: 'geometry',
      },
    ]);
  });
});

describe('paletteItems', () => {
  it('lists every definition with a category, sorted', () => {
    const items = paletteItems(registry);
    expect(items.length).toBe(registry.size);
    expect(items.some((i) => i.type === 'PointArray')).toBe(true);
    // Sorted by category then label.
    const categories = items.map((i) => i.category);
    expect([...categories]).toEqual([...categories].sort());
  });
});
