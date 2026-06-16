import { createBasicRegistry, createGraph } from '@vector-nodes/core';
import type { Edge } from '@xyflow/react';
import { describe, expect, it } from 'vitest';

import { checkConnection, edgesWithoutInput } from './connection';
import { graphToFlowNodes } from './flow';

const registry = createBasicRegistry();

// Nodes covering: Geometry/Vector/Float outputs, a field output, and inputs.
const nodes = graphToFlowNodes(
  createGraph({
    nodes: [
      { id: 'pa', type: 'PointCircle' }, // out: geometry (Geometry), points (Vector field); in: radius (Float)
      { id: 'cf', type: 'ConstFloat' }, // out: value (Float)
      { id: 'ci', type: 'ConstInteger' }, // out: value (Integer)
      { id: 't', type: 'Translate' }, // in: geometry (Geometry), offset (Vector)
      { id: 'm', type: 'MergeGeometry' }, // in: geometry (Geometry, field)
      { id: 'out', type: 'OutputGeometry' }, // in: geometry (Geometry)
    ],
  }),
  registry,
);

const conn = (source: string, sourceHandle: string, target: string, targetHandle: string) => ({
  source,
  sourceHandle,
  target,
  targetHandle,
});

describe('checkConnection — accepted', () => {
  it('allows matching socket types', () => {
    expect(checkConnection(conn('pa', 'geometry', 't', 'geometry'), nodes).ok).toBe(true);
  });

  it('allows numeric-widening implicit conversions (Integer → Float)', () => {
    // ci.value (Integer) → pa.radius (Float): a shape-preserving widening.
    expect(checkConnection(conn('ci', 'value', 'pa', 'radius'), nodes).ok).toBe(true);
  });
});

describe('checkConnection — rejected', () => {
  it('rejects incompatible types with a reason', () => {
    const res = checkConnection(conn('pa', 'geometry', 't', 'offset'), nodes);
    expect(res.ok).toBe(false);
    expect(res.reason).toContain('Geometry');
    expect(res.reason).toContain('Vector');
  });

  it('rejects a field connected to a single value', () => {
    const res = checkConnection(conn('pa', 'points', 't', 'offset'), nodes);
    expect(res.ok).toBe(false);
    expect(res.reason).toMatch(/field/);
  });

  it('rejects a scalar feeding a Vector — no implicit broadcast', () => {
    // cf.value (Float) → t.offset (Vector): the reshaping broadcast isn't allowed.
    const res = checkConnection(conn('cf', 'value', 't', 'offset'), nodes);
    expect(res.ok).toBe(false);
    expect(res.reason).toContain('Float');
    expect(res.reason).toContain('Vector');
  });

  it('rejects self-connections', () => {
    expect(checkConnection(conn('t', 'geometry', 't', 'geometry'), nodes)).toMatchObject({
      ok: false,
    });
  });

  it('rejects unknown sockets', () => {
    expect(checkConnection(conn('pa', 'nope', 't', 'geometry'), nodes).ok).toBe(false);
  });

  it('rejects incomplete connections', () => {
    expect(
      checkConnection(
        { source: 'pa', sourceHandle: 'geometry', target: null, targetHandle: null },
        nodes,
      ).ok,
    ).toBe(false);
  });
});

describe('array inputs accept many connections (issue #99)', () => {
  it('allows a single value into an array input (collected as an element)', () => {
    // pa.geometry (scalar Geometry) → m.geometry (Geometry field).
    expect(checkConnection(conn('pa', 'geometry', 'm', 'geometry'), nodes).ok).toBe(true);
  });

  it('still rejects a field output into a single-value input', () => {
    const res = checkConnection(conn('pa', 'points', 't', 'offset'), nodes);
    expect(res.ok).toBe(false);
    expect(res.reason).toMatch(/field/);
  });

  it('does not drop existing links into an array input on connect (App keeps them)', () => {
    // The editor only calls edgesWithoutInput for scalar inputs; array inputs
    // keep their edges. Here we assert the helper would (if misused) drop both —
    // documenting why App guards it behind the isArray check.
    const existing: Edge[] = [
      { id: 'e0', source: 'pa', sourceHandle: 'geometry', target: 'm', targetHandle: 'geometry' },
    ];
    expect(edgesWithoutInput(existing, 'm', 'geometry')).toEqual([]);
  });
});

describe('field sources merge into an array input (issue #146)', () => {
  // A node with a Vector-field input (Polyline.points) plus two field sources.
  const merge = graphToFlowNodes(
    createGraph({
      nodes: [
        { id: 'a', type: 'PointCircle' }, // out: points (Vector field)
        { id: 'b', type: 'PointGrid' }, // out: points (Vector field)
        { id: 'pl', type: 'Polyline' }, // in: points (Vector field)
      ],
    }),
    registry,
  );

  it('accepts a field output into a field input (merged, not rejected)', () => {
    expect(checkConnection(conn('a', 'points', 'pl', 'points'), merge).ok).toBe(true);
  });

  it('accepts a second field source into the same array input', () => {
    // Validation does not consider existing edges for an array input, so a
    // second field connection is allowed and the engine flattens both in.
    expect(checkConnection(conn('b', 'points', 'pl', 'points'), merge).ok).toBe(true);
  });
});

describe('replacing an occupied input (issue #41)', () => {
  const occupied: Edge[] = [
    { id: 'e0', source: 'pa', sourceHandle: 'geometry', target: 't', targetHandle: 'geometry' },
  ];

  it('allows a new link into an already-connected input', () => {
    expect(checkConnection(conn('pa', 'geometry', 't', 'geometry'), nodes).ok).toBe(true);
  });

  it('edgesWithoutInput drops the old link into that input only', () => {
    const other: Edge = {
      id: 'e1',
      source: 'cf',
      sourceHandle: 'value',
      target: 't',
      targetHandle: 'offset',
    };
    const result = edgesWithoutInput([...occupied, other], 't', 'geometry');
    expect(result).toEqual([other]);
  });
});
