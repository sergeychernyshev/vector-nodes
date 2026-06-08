import { describe, expect, it } from 'vitest';

import {
  addLink,
  addNode,
  createGraph,
  endpointNode,
  endpointSocket,
  getNode,
  getNodesByType,
  getOutputNode,
  linksFrom,
  linksTo,
  OUTPUT_NODE_TYPE,
  VNODES_FORMAT,
  VNODES_VERSION,
} from './graph';

describe('createGraph', () => {
  it('sets the format discriminator and defaults', () => {
    const graph = createGraph();
    expect(graph.format).toBe(VNODES_FORMAT);
    expect(graph.version).toBe(VNODES_VERSION);
    expect(graph.parameters).toEqual([]);
    expect(graph.nodes).toEqual([]);
    expect(graph.links).toEqual([]);
    expect(graph.metadata).toBeUndefined();
    expect(graph.metaNodes).toBeUndefined();
  });

  it('overlays provided init fields', () => {
    const graph = createGraph({
      version: '1.0',
      metadata: { name: 'Spiral' },
      parameters: [{ id: 'turns', type: 'Float', default: 3, min: 1, max: 10 }],
    });
    expect(graph.metadata).toEqual({ name: 'Spiral' });
    expect(graph.parameters).toHaveLength(1);
  });
});

describe('graph building and queries', () => {
  it('builds a graph in code and queries nodes and links', () => {
    const graph = createGraph();
    addNode(graph, { id: 'n1', type: 'Circle', params: { radius: 5 } });
    addNode(graph, { id: 'out', type: OUTPUT_NODE_TYPE });
    addLink(graph, { from: ['n1', 'curve'], to: ['out', 'geometry'] });

    expect(getNode(graph, 'n1')?.type).toBe('Circle');
    expect(getNode(graph, 'missing')).toBeUndefined();
    expect(getNodesByType(graph, 'Circle')).toHaveLength(1);
    expect(getOutputNode(graph)?.id).toBe('out');

    expect(linksFrom(graph, 'n1')).toHaveLength(1);
    expect(linksFrom(graph, 'out')).toHaveLength(0);
    expect(linksTo(graph, 'out')).toHaveLength(1);
  });

  it('returns undefined when there is no output node', () => {
    const graph = createGraph({ nodes: [{ id: 'n1', type: 'Circle' }] });
    expect(getOutputNode(graph)).toBeUndefined();
  });
});

describe('endpoint helpers', () => {
  it('extract the node id and socket name', () => {
    expect(endpointNode(['n1', 'curve'])).toBe('n1');
    expect(endpointSocket(['n1', 'curve'])).toBe('curve');
  });
});
