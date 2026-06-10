import { describe, expect, it } from 'vitest';

import {
  orderedVariadicKeys,
  parseVariadicIndex,
  resolveInputSocket,
  resolveParamDefaults,
  variadicSocketIndex,
  type NodeDefinition,
} from './node-definition';

const vectorMath: NodeDefinition = {
  type: 'VectorMath',
  label: 'Vector Math',
  category: 'Vector',
  inputs: [
    { name: 'a', type: 'Vector' },
    { name: 'b', type: 'Vector' },
  ],
  outputs: [{ name: 'result', type: 'Vector' }],
  params: [
    { name: 'operation', type: 'String', default: 'add' },
    { name: 'scale', type: 'Float', default: 1, min: 0, max: 10 },
    { name: 'clamp', type: 'Boolean' },
  ],
};

describe('resolveParamDefaults', () => {
  it('returns name → value for params that declare a default', () => {
    expect(resolveParamDefaults(vectorMath)).toEqual({
      operation: 'add',
      scale: 1,
    });
  });

  it('omits params without a default', () => {
    expect(resolveParamDefaults(vectorMath)).not.toHaveProperty('clamp');
  });

  it('returns an empty object when nothing has a default', () => {
    const def: NodeDefinition = {
      type: 'Passthrough',
      inputs: [{ name: 'in', type: 'Geometry' }],
      outputs: [{ name: 'out', type: 'Geometry' }],
      params: [],
    };
    expect(resolveParamDefaults(def)).toEqual({});
  });
});

describe('variadic inputs (issue #65)', () => {
  const merge: NodeDefinition = {
    type: 'MergeGeometry',
    inputs: [],
    variadicInput: { name: 'geometry', type: 'Geometry' },
    outputs: [{ name: 'geometry', type: 'Geometry' }],
    params: [],
  };

  it('parseVariadicIndex parses only `${prefix}<digits>`', () => {
    expect(parseVariadicIndex('geometry', 'geometry0')).toBe(0);
    expect(parseVariadicIndex('geometry', 'geometry12')).toBe(12);
    expect(parseVariadicIndex('geometry', 'geometry')).toBeNull();
    expect(parseVariadicIndex('geometry', 'geometryX')).toBeNull();
    expect(parseVariadicIndex('geometry', 'other0')).toBeNull();
  });

  it('variadicSocketIndex respects the definition (null when not variadic)', () => {
    expect(variadicSocketIndex(merge, 'geometry3')).toBe(3);
    expect(variadicSocketIndex(vectorMath, 'a')).toBeNull();
  });

  it('resolveInputSocket synthesizes a variadic socket of the variadic type', () => {
    expect(resolveInputSocket(merge, 'geometry2')).toEqual({ name: 'geometry2', type: 'Geometry' });
    expect(resolveInputSocket(merge, 'nope')).toBeUndefined();
    expect(resolveInputSocket(vectorMath, 'a')).toEqual({ name: 'a', type: 'Vector' });
  });

  it('orderedVariadicKeys sorts matching keys by numeric index', () => {
    expect(orderedVariadicKeys(['geometry2', 'geometry0', 'x', 'geometry10'], 'geometry')).toEqual([
      'geometry0',
      'geometry2',
      'geometry10',
    ]);
  });
});
