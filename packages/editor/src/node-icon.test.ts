import { createBasicRegistry } from '@vector-nodes/core';
import { describe, expect, it } from 'vitest';

import { createFlowNode } from './flow';
import { colorToCss, nodeDefaultGeometry, nodeIcon } from './node-icon';

const registry = createBasicRegistry();
const dataFor = (type: string, params?: Record<string, unknown>) => {
  const data = createFlowNode(registry.require(type), { x: 0, y: 0 }, 'n').data;
  if (params) data.params = { ...data.params, ...params };
  return data;
};

describe('nodeIcon (issue #142)', () => {
  it('renders a color constant as a swatch', () => {
    expect(nodeIcon(dataFor('ConstColor', { value: [1, 0, 0, 1] }))).toEqual({
      kind: 'color',
      rgba: [1, 0, 0, 1],
    });
  });

  it('renders numeric constants as their formatted value', () => {
    expect(nodeIcon(dataFor('ConstFloat', { value: 3 }))).toEqual({ kind: 'text', text: '3' });
    expect(nodeIcon(dataFor('ConstFloat', { value: 1.5 }))).toEqual({ kind: 'text', text: '1.5' });
    expect(nodeIcon(dataFor('ConstInteger', { value: 7 }))).toEqual({ kind: 'text', text: '7' });
  });

  it('renders a boolean constant as a check or cross', () => {
    expect(nodeIcon(dataFor('ConstBoolean', { value: true })).text).toBe('✓');
    expect(nodeIcon(dataFor('ConstBoolean', { value: false })).text).toBe('✗');
  });

  it('renders a string constant as its first characters', () => {
    expect(nodeIcon(dataFor('ConstString', { value: 'hello' }))).toEqual({
      kind: 'text',
      text: 'he',
    });
  });

  it('falls back to the label initial for nodes without a value', () => {
    // PointCircle has no `value` param → its label initial.
    expect(nodeIcon(dataFor('PointCircle'))).toEqual({ kind: 'text', text: 'P' });
  });
});

describe('nodeDefaultGeometry (issue #142)', () => {
  it('evaluates a geometry node from its defaults for the icon render', () => {
    const geo = nodeDefaultGeometry(dataFor('PointCircle', { radius: 1, count: 6 }));
    expect(geo?.points).toHaveLength(6);
  });

  it('returns null for nodes that produce no geometry', () => {
    expect(nodeDefaultGeometry(dataFor('ConstFloat', { value: 3 }))).toBeNull();
    expect(nodeDefaultGeometry(dataFor('MathFloat'))).toBeNull();
  });

  it('returns null when a geometry node cannot evaluate from defaults', () => {
    // Translate has no default geometry input, so evaluating it standalone fails.
    expect(nodeDefaultGeometry(dataFor('Translate'))).toBeNull();
  });
});

describe('colorToCss', () => {
  it('maps [0,1] components to an rgba() string', () => {
    expect(colorToCss([1, 0, 0.5, 1])).toBe('rgba(255, 0, 128, 1)');
    expect(colorToCss([0, 0, 0, 0.5])).toBe('rgba(0, 0, 0, 0.5)');
  });

  it('clamps out-of-range components', () => {
    expect(colorToCss([2, -1, 0, 1])).toBe('rgba(255, 0, 0, 1)');
  });
});
