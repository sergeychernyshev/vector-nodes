import { describe, expect, it } from 'vitest';

import { resolveParamDefaults, type NodeDefinition } from './node-definition';

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
