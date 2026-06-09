import { createBasicRegistry, createGraph, parseVnodes, serializeVnodes } from '@vector-nodes/core';
import { describe, expect, it } from 'vitest';

import { graphToFlowEdges, graphToFlowNodes } from './flow';
import { flowToGraph, maxAutoId } from './graph-io';

const registry = createBasicRegistry();

const graph = createGraph({
  nodes: [
    {
      id: 'pa',
      type: 'PointArray',
      position: [10, 20],
      params: { mode: 'circle', radius: 2, count: 6 },
    },
    { id: 'out', type: 'OutputGeometry', position: [300, 40] },
  ],
  links: [{ from: ['pa', 'geometry'], to: ['out', 'geometry'] }],
});

describe('flowToGraph', () => {
  it('maps nodes (id/type/position/params) and edges to links', () => {
    const nodes = graphToFlowNodes(graph, registry);
    const edges = graphToFlowEdges(graph);
    const result = flowToGraph(nodes, edges);

    expect(result.nodes).toEqual([
      {
        id: 'pa',
        type: 'PointArray',
        position: [10, 20],
        params: { mode: 'circle', radius: 2, count: 6 },
      },
      { id: 'out', type: 'OutputGeometry', position: [300, 40] },
    ]);
    expect(result.links).toEqual([{ from: ['pa', 'geometry'], to: ['out', 'geometry'] }]);
  });
});

describe('save → reopen round-trip', () => {
  it('yields an identical editor graph through serialize + validate', () => {
    const nodes = graphToFlowNodes(graph, registry);
    const edges = graphToFlowEdges(graph);

    // build → save (flow → graph → text) → reopen (parse → flow)
    const text = serializeVnodes(flowToGraph(nodes, edges));
    const reopened = parseVnodes(text);

    expect(graphToFlowNodes(reopened, registry)).toEqual(nodes);
    expect(graphToFlowEdges(reopened)).toEqual(edges);
  });
});

describe('maxAutoId', () => {
  it('returns the largest n<number> id suffix, else 0', () => {
    const nodes = graphToFlowNodes(
      createGraph({
        nodes: [
          { id: 'pa', type: 'PointArray' },
          { id: 'n3', type: 'ConstFloat' },
          { id: 'n1', type: 'ConstFloat' },
          { id: 'out', type: 'OutputGeometry' },
        ],
      }),
      registry,
    );
    expect(maxAutoId(nodes)).toBe(3);
    expect(maxAutoId([])).toBe(0);
  });
});
