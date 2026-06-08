import { describe, expect, it } from 'vitest';

import type { NodeDefinition } from './node-definition';
import { NodeRegistry } from './registry';

const sample: NodeDefinition = {
  type: 'OutputGeometry',
  label: 'Output Geometry',
  inputs: [{ name: 'geometry', type: 'Geometry' }],
  outputs: [],
  params: [],
};

const other: NodeDefinition = {
  type: 'Circle',
  inputs: [],
  outputs: [{ name: 'curve', type: 'Geometry' }],
  params: [{ name: 'radius', type: 'Float', default: 1 }],
};

describe('NodeRegistry', () => {
  it('registers and retrieves a definition by type', () => {
    const registry = new NodeRegistry();
    registry.register(sample);
    expect(registry.get('OutputGeometry')).toBe(sample);
    expect(registry.has('OutputGeometry')).toBe(true);
    expect(registry.size).toBe(1);
  });

  it('returns undefined for unknown types via get', () => {
    const registry = new NodeRegistry();
    expect(registry.get('Nope')).toBeUndefined();
    expect(registry.has('Nope')).toBe(false);
  });

  it('throws on duplicate registration', () => {
    const registry = new NodeRegistry([sample]);
    expect(() => registry.register(sample)).toThrow(/already registered/);
  });

  it('require() returns the definition or throws for unknown types', () => {
    const registry = new NodeRegistry([sample]);
    expect(registry.require('OutputGeometry')).toBe(sample);
    expect(() => registry.require('Nope')).toThrow(/Unknown node type/);
  });

  it('lists definitions in registration order', () => {
    const registry = new NodeRegistry();
    registry.register(sample);
    registry.register(other);
    expect(registry.list()).toEqual([sample, other]);
  });

  it('can be constructed pre-populated', () => {
    const registry = new NodeRegistry([sample, other]);
    expect(registry.size).toBe(2);
    expect(registry.require('Circle')).toBe(other);
  });
});
