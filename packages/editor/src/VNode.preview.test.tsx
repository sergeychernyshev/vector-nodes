import { createBasicRegistry } from '@vector-nodes/core';
import { describe, expect, it } from 'vitest';

import { createFlowNode } from './flow';
import { isPreviewable } from './VNode';

const registry = createBasicRegistry();
const dataFor = (type: string) => createFlowNode(registry.require(type), { x: 0, y: 0 }, 'n').data;

describe('isPreviewable (issue #79)', () => {
  it('is true for nodes that emit a Geometry output', () => {
    expect(isPreviewable(dataFor('PointCircle'))).toBe(true); // geometry + points
    expect(isPreviewable(dataFor('Translate'))).toBe(true);
    expect(isPreviewable(dataFor('BoxMesh'))).toBe(true);
  });

  it('is false for nodes without a Geometry output', () => {
    expect(isPreviewable(dataFor('ConstFloat'))).toBe(false);
    expect(isPreviewable(dataFor('VectorMath'))).toBe(false);
    // OutputGeometry consumes geometry but emits none.
    expect(isPreviewable(dataFor('OutputGeometry'))).toBe(false);
  });
});
