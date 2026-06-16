import { createBasicRegistry } from '@vector-nodes/core';
import { describe, expect, it } from 'vitest';

import { createFlowNode } from './flow';
import { colorToCss, nodeColor } from './node-color';

const registry = createBasicRegistry();
const dataFor = (
  type: string,
  inputDefaults?: Record<string, unknown>,
  params?: Record<string, unknown>,
) => {
  const data = createFlowNode(registry.require(type), { x: 0, y: 0 }, 'n').data;
  if (inputDefaults) data.inputDefaults = { ...data.inputDefaults, ...inputDefaults };
  if (params) data.params = { ...data.params, ...params };
  return data;
};

describe('nodeColor (issue #139)', () => {
  it('computes Combine RGB from its channel inputs', () => {
    expect(
      nodeColor(dataFor('CombineColorRGB', { red: 0.2, green: 0.4, blue: 0.6, alpha: 0.8 })),
    ).toEqual([0.2, 0.4, 0.6, 0.8]);
  });

  it('computes Combine HSL, converting to RGBA', () => {
    const color = nodeColor(
      dataFor('CombineColorHSL', { hue: 1 / 3, saturation: 1, lightness: 0.5 }),
    )!;
    expect(color[0]).toBeCloseTo(0, 6);
    expect(color[1]).toBeCloseTo(1, 6);
    expect(color[2]).toBeCloseTo(0, 6);
    expect(color[3]).toBe(1); // alpha default
  });

  it('computes Combine HSV', () => {
    const color = nodeColor(dataFor('CombineColorHSV', { hue: 2 / 3, saturation: 1, value: 1 }))!;
    expect(color[0]).toBeCloseTo(0, 6);
    expect(color[2]).toBeCloseTo(1, 6);
  });

  it('reads the value of a Color constant', () => {
    expect(nodeColor(dataFor('ConstColor', undefined, { value: [1, 0, 0, 1] }))).toEqual([
      1, 0, 0, 1,
    ]);
  });

  it('returns null for non-color nodes', () => {
    expect(nodeColor(dataFor('PointCircle'))).toBeNull();
  });
});

describe('colorToCss', () => {
  it('maps [0,1] components to rgba() and clamps', () => {
    expect(colorToCss([1, 0, 0.5, 1])).toBe('rgba(255, 0, 128, 1)');
    expect(colorToCss([2, -1, 0, 0.5])).toBe('rgba(255, 0, 0, 0.5)');
  });
});
