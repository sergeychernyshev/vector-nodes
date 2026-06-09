import { describe, expect, it } from 'vitest';

import {
  BASIC_NODE_DEFINITIONS,
  createBasicRegistry,
  isParameterNodeType,
  parameterNodeType,
  PARAMETER_NODE_TYPES,
} from './nodes';
import { SOCKET_TYPES } from './socket-types';

describe('BASIC_NODE_DEFINITIONS', () => {
  it('registers without duplicates', () => {
    const registry = createBasicRegistry();
    expect(registry.size).toBe(BASIC_NODE_DEFINITIONS.length);
  });

  it('includes the OutputGeometry node with a Geometry input', () => {
    const out = createBasicRegistry().require('OutputGeometry');
    expect(out.inputs).toEqual([{ name: 'geometry', type: 'Geometry' }]);
    expect(out.outputs).toEqual([]);
  });

  it('defines VectorMath with vector and value outputs', () => {
    const def = createBasicRegistry().require('VectorMath');
    expect(def.outputs.map((o) => o.name)).toEqual(['vector', 'value']);
    expect(def.params[0]?.name).toBe('operation');
  });

  it('enumerates options for choice params', () => {
    const registry = createBasicRegistry();
    const operation = registry.require('VectorMath').params.find((p) => p.name === 'operation');
    expect(operation?.options).toContain('cross');
    const mode = registry.require('PointArray').params.find((p) => p.name === 'mode');
    expect(mode?.options).toEqual(['grid', 'line', 'circle', 'random']);
  });
});

describe('parameter node helpers', () => {
  it('builds a type per socket type', () => {
    expect(parameterNodeType('Geometry')).toBe('ParameterGeometry');
    expect(PARAMETER_NODE_TYPES).toHaveLength(SOCKET_TYPES.length);
  });

  it('recognizes parameter node types', () => {
    expect(isParameterNodeType('ParameterFloat')).toBe(true);
    expect(isParameterNodeType('ParameterGeometry')).toBe(true);
    expect(isParameterNodeType('Parameterize')).toBe(false);
    expect(isParameterNodeType('VectorMath')).toBe(false);
  });

  it('typed parameter nodes output their declared type', () => {
    const registry = createBasicRegistry();
    const geoParam = registry.require('ParameterGeometry');
    expect(geoParam.outputs).toEqual([{ name: 'value', type: 'Geometry' }]);
  });
});
