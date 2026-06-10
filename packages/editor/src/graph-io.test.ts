import { createBasicRegistry, createGraph, parseVnodes, serializeVnodes } from '@vector-nodes/core';
import { describe, expect, it } from 'vitest';

import { graphToFlowEdges, graphToFlowNodes } from './flow';
import { flowToGraph, maxAutoId } from './graph-io';

const registry = createBasicRegistry();

const graph = createGraph({
  nodes: [
    {
      id: 'pa',
      type: 'PointCircle',
      position: [10, 20],
      params: { radius: 2, count: 6 },
    },
    { id: 'out', type: 'OutputGeometry', position: [300, 40] },
  ],
  links: [{ from: ['pa', 'geometry'], to: ['out', 'geometry'] }],
});

describe('flowToGraph', () => {
  it('maps nodes/edges and migrates legacy config params to input defaults (#58)', () => {
    const nodes = graphToFlowNodes(graph, registry);
    const edges = graphToFlowEdges(graph);
    const result = flowToGraph(nodes, edges);

    // PointCircle's radius/count are input sockets now (issue #58), so a graph
    // that stored them under `params` round-trips them as inputDefaults.
    expect(result.nodes).toEqual([
      {
        id: 'pa',
        type: 'PointCircle',
        position: [10, 20],
        inputDefaults: { radius: 2, count: 6 },
      },
      { id: 'out', type: 'OutputGeometry', position: [300, 40] },
    ]);
    expect(result.links).toEqual([{ from: ['pa', 'geometry'], to: ['out', 'geometry'] }]);
  });

  it('derives network parameters from named Parameter nodes (issue #81)', () => {
    const withParams = createGraph({
      nodes: [
        { id: 'pf', type: 'ParameterFloat', params: { name: 'radius' } },
        { id: 'pv', type: 'ParameterVector', params: { name: 'shift' } },
        // Duplicate name collapses to one argument; unnamed node is ignored.
        { id: 'pf2', type: 'ParameterFloat', params: { name: 'radius' } },
        { id: 'pf3', type: 'ParameterFloat', params: { name: '' } },
        { id: 'out', type: 'OutputGeometry' },
      ],
    });
    const result = flowToGraph(graphToFlowNodes(withParams, registry), []);
    expect(result.parameters).toEqual([
      { id: 'radius', type: 'Float' },
      { id: 'shift', type: 'Vector' },
    ]);
  });

  it('emits no parameters when there are no Parameter nodes', () => {
    const result = flowToGraph(graphToFlowNodes(graph, registry), graphToFlowEdges(graph));
    expect(result.parameters).toEqual([]);
  });

  it('persists per-instance input defaults (issue #23)', () => {
    const withDefaults = createGraph({
      nodes: [
        { id: 't', type: 'Translate', inputDefaults: { offset: [1, 2, 3] } },
        { id: 'out', type: 'OutputGeometry' },
      ],
      links: [{ from: ['t', 'geometry'], to: ['out', 'geometry'] }],
    });
    const result = flowToGraph(graphToFlowNodes(withDefaults, registry), []);
    expect(result.nodes.find((n) => n.id === 't')!.inputDefaults).toEqual({ offset: [1, 2, 3] });
    // Nodes without overrides omit the field entirely.
    expect(result.nodes.find((n) => n.id === 'out')!.inputDefaults).toBeUndefined();
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
          { id: 'pa', type: 'PointCircle' },
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
