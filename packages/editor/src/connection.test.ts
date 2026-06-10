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
      { id: 'pa', type: 'PointCircle' }, // out: geometry (Geometry), points (Vector field)
      { id: 'cf', type: 'ConstFloat' }, // out: value (Float)
      { id: 't', type: 'Translate' }, // in: geometry (Geometry), offset (Vector)
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

  it('allows implicit conversions (Float → Vector)', () => {
    expect(checkConnection(conn('cf', 'value', 't', 'offset'), nodes).ok).toBe(true);
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
