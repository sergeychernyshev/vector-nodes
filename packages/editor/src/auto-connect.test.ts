import { createBasicRegistry } from '@vector-nodes/core';
import type { Edge } from '@xyflow/react';
import { describe, expect, it } from 'vitest';

import { autoConnectCandidate } from './auto-connect';
import { createFlowNode } from './flow';

const registry = createBasicRegistry();
// Default node box in tests (no measurement) is 160×80 — see auto-connect.ts.
const node = (type: string, id: string, x: number, y: number) =>
  createFlowNode(registry.require(type), { x, y }, id);

describe('autoConnectCandidate (issue #137)', () => {
  it('connects the left node’s output into the right node’s input when adjacent', () => {
    const pc = node('PointCircle', 'pc', 0, 0); // box 0–160
    const t = node('Translate', 't', 200, 0); // 40px gap, vertically aligned
    expect(autoConnectCandidate(pc, [t], [])).toEqual({
      source: 'pc',
      sourceHandle: 'geometry',
      target: 't',
      targetHandle: 'geometry',
    });
  });

  it('works when the dragged node is to the right (other feeds it)', () => {
    const t = node('Translate', 't', 200, 0);
    const pc = node('PointCircle', 'pc', 0, 0);
    // Dragging `t`, with `pc` adjacent on its left.
    expect(autoConnectCandidate(t, [pc], [])).toEqual({
      source: 'pc',
      sourceHandle: 'geometry',
      target: 't',
      targetHandle: 'geometry',
    });
  });

  it('returns null when the neighbor is too far away', () => {
    const pc = node('PointCircle', 'pc', 0, 0);
    const t = node('Translate', 't', 400, 0); // 240px gap > threshold
    expect(autoConnectCandidate(pc, [t], [])).toBeNull();
  });

  it('returns null without vertical overlap', () => {
    const pc = node('PointCircle', 'pc', 0, 0);
    const t = node('Translate', 't', 200, 300); // adjacent in x, far in y
    expect(autoConnectCandidate(pc, [t], [])).toBeNull();
  });

  it('returns null when the only compatible pair is already connected', () => {
    const pc = node('PointCircle', 'pc', 0, 0);
    const t = node('Translate', 't', 200, 0);
    const edges: Edge[] = [
      { id: 'e0', source: 'pc', sourceHandle: 'geometry', target: 't', targetHandle: 'geometry' },
    ];
    // geometry is taken (scalar input); points (field) can't drive offset (single).
    expect(autoConnectCandidate(pc, [t], edges)).toBeNull();
  });

  it('ignores incompatible neighbors', () => {
    const cf = node('ConstFloat', 'cf', 0, 0); // out: value (Float)
    const out = node('OutputGeometry', 'out', 200, 0); // in: geometry (Geometry)
    expect(autoConnectCandidate(cf, [out], [])).toBeNull();
  });
});
