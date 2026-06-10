import { describe, expect, it } from 'vitest';

import { createGraph, getNode, type Graph } from './graph.js';
import {
  collapseSelection,
  expandMetaNode,
  flattenMetaNodes,
  isMetaNodeType,
  META_INPUT_ID,
  META_OUTPUT_ID,
  metaNodeDefinitions,
  metaNodeName,
  metaNodeType,
} from './meta-node.js';
import { createBasicRegistry } from './nodes.js';
import { parseVnodes, serializeVnodes } from './vnodes.js';

const registry = createBasicRegistry();

// v(Vector) ─offset→ t(Translate) ; pc(PointCircle) ─geometry→ t ─geometry→ out
function sampleGraph(): Graph {
  return createGraph({
    nodes: [
      { id: 'pc', type: 'PointCircle', params: { radius: 1, count: 4 } },
      { id: 'v', type: 'ConstVector', params: { value: [1, 0, 0] } },
      { id: 't', type: 'Translate' },
      { id: 'out', type: 'OutputGeometry' },
    ],
    links: [
      { from: ['pc', 'geometry'], to: ['t', 'geometry'] },
      { from: ['v', 'value'], to: ['t', 'offset'] },
      { from: ['t', 'geometry'], to: ['out', 'geometry'] },
    ],
  });
}

describe('type helpers', () => {
  it('round-trips meta-node type and name', () => {
    expect(metaNodeType('Group')).toBe('Meta:Group');
    expect(isMetaNodeType('Meta:Group')).toBe(true);
    expect(isMetaNodeType('PointCircle')).toBe(false);
    expect(metaNodeName('Meta:Group')).toBe('Group');
    expect(metaNodeName('PointCircle')).toBeUndefined();
  });
});

describe('collapseSelection', () => {
  it('derives the interface from boundary links and replaces the selection', () => {
    const { graph, name, instanceId } = collapseSelection(sampleGraph(), ['pc', 't'], registry);

    // Selection replaced by a single instance; v and out remain.
    expect(graph.nodes.map((n) => n.id).sort()).toEqual(['out', 'v', instanceId].sort());
    const instance = getNode(graph, instanceId)!;
    expect(instance.type).toBe(metaNodeType(name));

    const def = graph.metaNodes![name]!;
    expect(def.interface.inputs).toEqual([{ name: 'offset', type: 'Vector' }]);
    expect(def.interface.outputs).toEqual([{ name: 'geometry', type: 'Geometry' }]);
    expect(def.nodes.map((n) => n.id).sort()).toEqual(['pc', 't']);

    // Subgraph keeps the internal link and adds $in/$out bridges.
    expect(def.links).toContainEqual({ from: ['pc', 'geometry'], to: ['t', 'geometry'] });
    expect(def.links).toContainEqual({ from: [META_INPUT_ID, 'offset'], to: ['t', 'offset'] });
    expect(def.links).toContainEqual({ from: ['t', 'geometry'], to: [META_OUTPUT_ID, 'geometry'] });

    // Boundary links rewired to the instance.
    expect(graph.links).toContainEqual({ from: ['v', 'value'], to: [instanceId, 'offset'] });
    expect(graph.links).toContainEqual({ from: [instanceId, 'geometry'], to: ['out', 'geometry'] });
  });

  it('exposes a NodeDefinition mirroring the interface', () => {
    const { graph, name } = collapseSelection(sampleGraph(), ['pc', 't'], registry);
    const def = metaNodeDefinitions(graph).find((d) => d.type === metaNodeType(name))!;
    expect(def.category).toBe('Meta');
    expect(def.inputs).toEqual([{ name: 'offset', type: 'Vector' }]);
    expect(def.outputs).toEqual([{ name: 'geometry', type: 'Geometry' }]);
  });

  it('collapses a fanned-out output into a single interface output', () => {
    const graph = createGraph({
      nodes: [
        { id: 'pc', type: 'PointCircle' },
        { id: 't1', type: 'Translate' },
        { id: 't2', type: 'Translate' },
        { id: 'out', type: 'OutputGeometry' },
      ],
      links: [
        { from: ['pc', 'geometry'], to: ['t1', 'geometry'] },
        { from: ['pc', 'geometry'], to: ['t2', 'geometry'] }, // fan-out from pc
        { from: ['t1', 'geometry'], to: ['out', 'geometry'] },
      ],
    });
    const { graph: collapsed, name, instanceId } = collapseSelection(graph, ['pc'], registry);
    // pc has one output socket feeding two consumers → one interface output.
    expect(collapsed.metaNodes![name]!.interface.outputs).toEqual([
      { name: 'geometry', type: 'Geometry' },
    ]);
    const toInstance = collapsed.links.filter((l) => l.from[0] === instanceId);
    expect(toInstance).toHaveLength(2);
  });

  it('round-trips through .vnodes losslessly', () => {
    const { graph } = collapseSelection(sampleGraph(), ['pc', 't'], registry);
    expect(parseVnodes(serializeVnodes(graph))).toEqual(graph);
  });
});

describe('expandMetaNode', () => {
  it('inverts a collapse (restores the subgraph and reconnects boundaries)', () => {
    const { graph: collapsed, instanceId } = collapseSelection(
      sampleGraph(),
      ['pc', 't'],
      registry,
    );
    const expanded = expandMetaNode(collapsed, instanceId);

    // Instance gone, meta-node definition dropped, subgraph spliced back.
    expect(expanded.nodes.some((n) => isMetaNodeType(n.type))).toBe(false);
    expect(expanded.metaNodes).toBeUndefined();

    const translate = expanded.nodes.find((n) => n.type === 'Translate')!;
    const pointCircle = expanded.nodes.find((n) => n.type === 'PointCircle')!;
    // v → translate.offset, pointCircle → translate.geometry, translate → out.geometry.
    expect(expanded.links).toContainEqual({ from: ['v', 'value'], to: [translate.id, 'offset'] });
    expect(expanded.links).toContainEqual({
      from: [pointCircle.id, 'geometry'],
      to: [translate.id, 'geometry'],
    });
    expect(expanded.links).toContainEqual({
      from: [translate.id, 'geometry'],
      to: ['out', 'geometry'],
    });
  });
});

describe('flattenMetaNodes', () => {
  it('removes every meta-node instance', () => {
    const { graph } = collapseSelection(sampleGraph(), ['pc', 't'], registry);
    const flat = flattenMetaNodes(graph);
    expect(flat.nodes.some((n) => isMetaNodeType(n.type))).toBe(false);
    expect(flat.metaNodes).toBeUndefined();
    // 4 original nodes restored (pc, v, t, out).
    expect(flat.nodes).toHaveLength(4);
  });

  it('is a no-op for a graph with no meta-nodes', () => {
    const graph = sampleGraph();
    expect(flattenMetaNodes(graph)).toEqual(graph);
  });
});
