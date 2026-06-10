import { createBasicRegistry, createGraph } from '@vector-nodes/core';
import { describe, expect, it } from 'vitest';

import { graphToFlowNodes } from './flow';
import {
  asRgba,
  asVec3,
  asVec3Array,
  hexToRgb,
  rgbToHex,
  setNodeInputDefault,
  setNodeParam,
} from './param';

const registry = createBasicRegistry();
const nodes = graphToFlowNodes(
  createGraph({
    nodes: [
      { id: 'a', type: 'ConstFloat', params: { value: 1 } },
      { id: 'b', type: 'ConstFloat', params: { value: 2 } },
    ],
  }),
  registry,
);

describe('setNodeParam', () => {
  it('updates only the target node, immutably', () => {
    const next = setNodeParam(nodes, 'a', 'value', 9);
    expect(next.find((n) => n.id === 'a')!.data.params.value).toBe(9);
    expect(next.find((n) => n.id === 'b')!.data.params.value).toBe(2);
    // Original is untouched.
    expect(nodes.find((n) => n.id === 'a')!.data.params.value).toBe(1);
  });
});

describe('setNodeInputDefault', () => {
  const tnodes = graphToFlowNodes(
    createGraph({ nodes: [{ id: 't', type: 'Translate' }] }),
    registry,
  );

  it('sets an input default on only the target node, immutably', () => {
    const next = setNodeInputDefault(tnodes, 't', 'offset', [1, 2, 3]);
    expect(next.find((n) => n.id === 't')!.data.inputDefaults.offset).toEqual([1, 2, 3]);
    // Original untouched.
    expect(tnodes.find((n) => n.id === 't')!.data.inputDefaults.offset).toBeUndefined();
  });
});

describe('coercion helpers', () => {
  it('asVec3 coerces arrays and falls back to origin', () => {
    expect(asVec3([1, 2, 3])).toEqual([1, 2, 3]);
    expect(asVec3('nope')).toEqual([0, 0, 0]);
    expect(asVec3([1])).toEqual([0, 0, 0]);
  });

  it('asRgba coerces arrays and falls back to opaque black', () => {
    expect(asRgba([0.1, 0.2, 0.3, 0.4])).toEqual([0.1, 0.2, 0.3, 0.4]);
    expect(asRgba(null)).toEqual([0, 0, 0, 1]);
  });

  it('asVec3Array coerces each entry and falls back to an empty list', () => {
    expect(
      asVec3Array([
        [1, 2, 3],
        [4, 5, 6],
      ]),
    ).toEqual([
      [1, 2, 3],
      [4, 5, 6],
    ]);
    // Short/garbage entries become the origin; non-arrays yield [].
    expect(asVec3Array([[1], 'x'])).toEqual([
      [0, 0, 0],
      [0, 0, 0],
    ]);
    expect(asVec3Array('nope')).toEqual([]);
  });
});

describe('color hex conversion', () => {
  it('round-trips RGB through hex (within quantization)', () => {
    expect(rgbToHex([1, 0, 0])).toBe('#ff0000');
    expect(rgbToHex([0, 0, 0])).toBe('#000000');
    const [r, g, b] = hexToRgb('#3366cc');
    expect(r).toBeCloseTo(0x33 / 255, 6);
    expect(g).toBeCloseTo(0x66 / 255, 6);
    expect(b).toBeCloseTo(0xcc / 255, 6);
  });

  it('hexToRgb tolerates a missing leading hash and bad input', () => {
    expect(hexToRgb('ffffff')).toEqual([1, 1, 1]);
    expect(hexToRgb('not-a-color')).toEqual([0, 0, 0]);
  });
});
