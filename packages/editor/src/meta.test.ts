import { createBasicRegistry, createGraph, isMetaNodeType } from '@vector-nodes/core';
import { describe, expect, it } from 'vitest';

import { graphToFlowEdges, graphToFlowNodes } from './flow';
import {
  augmentedRegistry,
  collapse,
  expand,
  flowToSubgraph,
  subgraphToFlow,
  type FlowState,
} from './meta';

const base = createBasicRegistry();

function sampleState(): FlowState {
  const graph = createGraph({
    nodes: [
      { id: 'pc', type: 'PointCircle', position: [0, 0] },
      { id: 'v', type: 'ConstVector', position: [0, 100] },
      { id: 't', type: 'Translate', position: [200, 0] },
      { id: 'out', type: 'OutputGeometry', position: [400, 0] },
    ],
    links: [
      { from: ['pc', 'geometry'], to: ['t', 'geometry'] },
      { from: ['v', 'value'], to: ['t', 'offset'] },
      { from: ['t', 'geometry'], to: ['out', 'geometry'] },
    ],
  });
  return { nodes: graphToFlowNodes(graph, base), edges: graphToFlowEdges(graph), metaNodes: {} };
}

describe('augmentedRegistry', () => {
  it('adds a definition for each meta-node', () => {
    const { metaNodes } = collapse(sampleState(), ['pc', 't'], base);
    const reg = augmentedRegistry(base, metaNodes);
    const metaType = Object.keys(metaNodes).map((n) => `Meta:${n}`)[0]!;
    expect(reg.get(metaType)?.category).toBe('Meta');
    expect(reg.size).toBe(base.size + 1);
  });
});

describe('collapse / expand round-trip (flow level)', () => {
  it('collapse replaces the selection with one meta instance carrying its sockets', () => {
    const next = collapse(sampleState(), ['pc', 't'], base);
    const instance = next.nodes.find((n) => n.id === next.instanceId)!;
    expect(isMetaNodeType(instance.data.nodeType)).toBe(true);
    // Interface: one input (offset) and one output (geometry).
    expect(instance.data.inputs.map((s) => s.name)).toEqual(['offset']);
    expect(instance.data.outputs.map((s) => s.name)).toEqual(['geometry']);
    // pc and t are gone from the top level; v, out, and the instance remain.
    expect(next.nodes.map((n) => n.id).sort()).toEqual(['out', 'v', next.instanceId].sort());
  });

  it('expand restores the interior and clears the meta-node', () => {
    const collapsed = collapse(sampleState(), ['pc', 't'], base);
    const expanded = expand(collapsed, collapsed.instanceId, base);
    expect(expanded.nodes.some((n) => isMetaNodeType(n.data.nodeType))).toBe(false);
    expect(Object.keys(expanded.metaNodes)).toHaveLength(0);
    expect(expanded.nodes.filter((n) => n.data.nodeType === 'Translate')).toHaveLength(1);
    expect(expanded.nodes.filter((n) => n.data.nodeType === 'PointCircle')).toHaveLength(1);
  });
});

describe('subgraph editor helpers', () => {
  it('shows $in/$out boundary nodes and preserves the def through a round-trip', () => {
    const { metaNodes } = collapse(sampleState(), ['pc', 't'], base);
    const [name] = Object.keys(metaNodes);
    const def = metaNodes[name!]!;
    const reg = augmentedRegistry(base, metaNodes);

    const { nodes, edges } = subgraphToFlow(def, reg);
    // Boundary nodes plus the two interior nodes (pc, t).
    expect(nodes.find((n) => n.id === '$in')).toBeTruthy();
    expect(nodes.find((n) => n.id === '$out')).toBeTruthy();
    expect(
      nodes
        .filter((n) => n.id !== '$in' && n.id !== '$out')
        .map((n) => n.id)
        .sort(),
    ).toEqual(['pc', 't']);

    const rebuilt = flowToSubgraph(def, nodes, edges);
    expect(rebuilt.interface).toEqual(def.interface);
    expect(rebuilt.nodes.map((n) => n.type).sort()).toEqual(['PointCircle', 'Translate']);
    // Bridges + internal link survive.
    expect(rebuilt.links).toContainEqual({ from: ['$in', 'offset'], to: ['t', 'offset'] });
    expect(rebuilt.links).toContainEqual({ from: ['t', 'geometry'], to: ['$out', 'geometry'] });
    expect(rebuilt.links).toContainEqual({ from: ['pc', 'geometry'], to: ['t', 'geometry'] });
  });
});
