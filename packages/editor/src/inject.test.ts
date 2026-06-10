import { createBasicRegistry } from '@vector-nodes/core';
import type { Edge } from '@xyflow/react';
import { describe, expect, it } from 'vitest';

import { socketsOf } from './flow';
import { planInjection, spliceEdge } from './inject';

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
