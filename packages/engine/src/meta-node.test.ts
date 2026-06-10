import {
  collapseSelection,
  createBasicRegistry,
  createGraph,
  type Graph,
} from '@vector-nodes/core';
import type { Geometry } from '@vector-nodes/runtime';
import { describe, expect, it } from 'vitest';

import { BASIC_OPERATORS } from './basic-nodes.js';
import { evaluateGraph } from './interpreter.js';

const registry = createBasicRegistry();

function network(): Graph {
  return createGraph({
    nodes: [
      { id: 'pc', type: 'PointCircle', params: { radius: 2, count: 6 } },
      { id: 'v', type: 'ConstVector', params: { value: [1, 2, 0] } },
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

describe('meta-node evaluation', () => {
  it('a collapsed network evaluates identically to the expanded one', () => {
    const base = network();
    const expected = evaluateGraph(base, registry, BASIC_OPERATORS).output.geometry as Geometry;

    const { graph: collapsed } = collapseSelection(base, ['pc', 't'], registry);
    // The graph now contains a meta-node instance; the interpreter inlines it.
    const actual = evaluateGraph(collapsed, registry, BASIC_OPERATORS).output.geometry as Geometry;

    expect(actual.points).toEqual(expected.points);
  });
});
