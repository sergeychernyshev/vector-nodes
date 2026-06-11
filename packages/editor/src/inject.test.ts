import { createBasicRegistry, createGraph } from '@vector-nodes/core';
import type { Edge } from '@xyflow/react';
import { describe, expect, it } from 'vitest';

import { graphToFlowNodes, socketsOf } from './flow';
import {
  downstreamNodeIds,
  planInjection,
  planReconnects,
  shiftNodesRight,
  spliceEdge,
  suggestSourceNodes,
} from './inject';

const registry = createBasicRegistry();

// Translate: in geometry (Geometry), offset (Vector); out geometry (Geometry).
const translate = registry.require('Translate');
const geomOut = socketsOf(registry.require('PointCircle')).outputs.find(
  (s) => s.name === 'geometry',
)!;
const geomIn = socketsOf(registry.require('OutputGeometry')).inputs.find(
  (s) => s.name === 'geometry',
)!;

describe('planInjection', () => {
  it('routes a Geometry→Geometry connection through a Translate', () => {
    expect(planInjection(translate, geomOut, geomIn)).toEqual({
      inputHandle: 'geometry',
      outputHandle: 'geometry',
    });
  });

  it('returns null when the node has no compatible input for the source', () => {
    // ConstFloat has no inputs, so nothing can feed it.
    expect(planInjection(registry.require('ConstFloat'), geomOut, geomIn)).toBeNull();
  });
});

describe('suggestSourceNodes', () => {
  it('only includes nodes with an output compatible with the input', () => {
    const geomInput = socketsOf(registry.require('Translate')).inputs.find(
      (s) => s.name === 'geometry',
    )!;
    const suggestions = suggestSourceNodes(registry, geomInput);
    // Every suggestion exposes the named output and it accepts Geometry.
    expect(suggestions.length).toBeGreaterThan(0);
    for (const s of suggestions) {
      const out = socketsOf(registry.require(s.type)).outputs.find(
        (o) => o.name === s.outputHandle,
      );
      expect(out?.type).toBe('Geometry');
    }
    // PointCircle (Geometry out) qualifies; ConstFloat (Float out) does not.
    expect(suggestions.map((s) => s.type)).toContain('PointCircle');
    expect(suggestions.map((s) => s.type)).not.toContain('ConstFloat');
  });

  it('matches a field input to both field and scalar sources (issue #99)', () => {
    const fieldInput = { name: 'points', type: 'Vector' as const, isArray: true };
    const suggestions = suggestSourceNodes(registry, fieldInput).map((s) => s.type);
    // A scalar Vector source (Point) is now collectible into the field, and a
    // field source (PointGrid.points) still passes through.
    expect(suggestions).toContain('Point');
    expect(suggestions).toContain('PointGrid');
  });
});

describe('spliceEdge', () => {
  const edge: Edge = {
    id: 'e0',
    source: 'pa',
    sourceHandle: 'geometry',
    target: 'out',
    targetHandle: 'geometry',
  };

  it('replaces the edge with source→node and node→destination', () => {
    const result = spliceEdge([edge], edge, 'n1', {
      inputHandle: 'geometry',
      outputHandle: 'geometry',
    });
    expect(result.some((e) => e.id === 'e0')).toBe(false);
    expect(
      result.some((e) => e.source === 'pa' && e.target === 'n1' && e.targetHandle === 'geometry'),
    ).toBe(true);
    expect(
      result.some((e) => e.source === 'n1' && e.sourceHandle === 'geometry' && e.target === 'out'),
    ).toBe(true);
  });

  it('leaves unrelated edges untouched', () => {
    const other: Edge = {
      id: 'e1',
      source: 'cf',
      sourceHandle: 'value',
      target: 'out2',
      targetHandle: 'value',
    };
    const result = spliceEdge([edge, other], edge, 'n1', {
      inputHandle: 'geometry',
      outputHandle: 'geometry',
    });
    expect(result).toContainEqual(other);
  });
});

describe('downstreamNodeIds (issue #86)', () => {
  // a → b → c
  const edges: Edge[] = [
    { id: 'e0', source: 'a', sourceHandle: 'geometry', target: 'b', targetHandle: 'geometry' },
    { id: 'e1', source: 'b', sourceHandle: 'geometry', target: 'c', targetHandle: 'geometry' },
  ];

  it('collects the start node and everything downstream of it', () => {
    expect([...downstreamNodeIds(edges, 'b')].sort()).toEqual(['b', 'c']);
  });

  it('walks the whole chain from the head', () => {
    expect([...downstreamNodeIds(edges, 'a')].sort()).toEqual(['a', 'b', 'c']);
  });

  it('returns just the node when nothing is downstream', () => {
    expect([...downstreamNodeIds(edges, 'c')]).toEqual(['c']);
  });
});

describe('shiftNodesRight (issue #86)', () => {
  const nodes = graphToFlowNodes(
    createGraph({
      nodes: [
        { id: 'a', type: 'PointCircle', position: [0, 0] },
        { id: 'b', type: 'Translate', position: [100, 10] },
        { id: 'out', type: 'OutputGeometry', position: [200, 20] },
      ],
    }),
    registry,
  );

  it('shifts only the named nodes by dx, leaving others put', () => {
    const moved = shiftNodesRight(nodes, new Set(['b', 'out']), 50);
    expect(moved.find((n) => n.id === 'a')!.position.x).toBe(0);
    expect(moved.find((n) => n.id === 'b')!.position.x).toBe(150);
    expect(moved.find((n) => n.id === 'out')!.position.x).toBe(250);
    // Y is untouched.
    expect(moved.find((n) => n.id === 'b')!.position.y).toBe(10);
  });

  it('returns the same array reference for a zero shift', () => {
    expect(shiftNodesRight(nodes, new Set(['b']), 0)).toBe(nodes);
  });
});

describe('planReconnects', () => {
  // pa.geometry → t.geometry → out.geometry; deleting t should bridge pa → out.
  const nodes = graphToFlowNodes(
    createGraph({
      nodes: [
        { id: 'pa', type: 'PointCircle' },
        { id: 't', type: 'Translate' },
        { id: 'cf', type: 'ConstFloat' },
        { id: 'out', type: 'OutputGeometry' },
      ],
    }),
    registry,
  );
  const chain: Edge[] = [
    { id: 'e0', source: 'pa', sourceHandle: 'geometry', target: 't', targetHandle: 'geometry' },
    { id: 'e1', source: 't', sourceHandle: 'geometry', target: 'out', targetHandle: 'geometry' },
  ];

  it('bridges a deleted pass-through node when sockets are compatible', () => {
    expect(planReconnects(chain, nodes, new Set(['t']))).toEqual([
      { source: 'pa', sourceHandle: 'geometry', target: 'out', targetHandle: 'geometry' },
    ]);
  });

  it('does not bridge when the upstream output is incompatible with the downstream input', () => {
    // cf.value (Float) → t.geometry is not a real link; build an incompatible chain:
    // cf.value → t.offset (Vector input, Float ok via conversion) is compatible, but
    // t.geometry → out.geometry downstream needs a Geometry source. cf is Float.
    const incompatible: Edge[] = [
      { id: 'e0', source: 'cf', sourceHandle: 'value', target: 't', targetHandle: 'offset' },
      { id: 'e1', source: 't', sourceHandle: 'geometry', target: 'out', targetHandle: 'geometry' },
    ];
    expect(planReconnects(incompatible, nodes, new Set(['t']))).toEqual([]);
  });

  it('ignores links to or from other deleted nodes (no chain healing)', () => {
    // Deleting both pa and t: the pa→t link is internal, so nothing bridges to out.
    expect(planReconnects(chain, nodes, new Set(['pa', 't']))).toEqual([]);
  });
});
