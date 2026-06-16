import { createBasicRegistry } from '@vector-nodes/core';
import { describe, expect, it } from 'vitest';

import { constantSeedValue } from './constant-seed';
import { socketsOf, type FlowSocket } from './flow';

const registry = createBasicRegistry();
const floatInput: FlowSocket = { name: 'radius', type: 'Float', isArray: false, default: 1 };
const vectorInput: FlowSocket = {
  name: 'offset',
  type: 'Vector',
  isArray: false,
  default: [0, 0, 0],
};

describe('constantSeedValue (issue #45)', () => {
  it('seeds a matching constant with the input’s prior value', () => {
    const def = registry.require('ConstFloat');
    expect(constantSeedValue(def, 'value', floatInput, 5)).toBe(5);
  });

  it('falls back to the input default when no inline value was set', () => {
    const def = registry.require('ConstFloat');
    // priorValue resolved by the caller; here it's the socket default of 1.
    expect(constantSeedValue(def, 'value', floatInput, floatInput.default)).toBe(1);
  });

  it('does not seed when the constant type differs from the input (implicit conversion)', () => {
    // A Float constant can feed a Vector input by broadcast, but its value is a
    // number, not a vector — so it must not be seeded with the vector value.
    const def = registry.require('ConstFloat');
    expect(constantSeedValue(def, 'value', vectorInput, [1, 2, 3])).toBeUndefined();
  });

  it('seeds a Vector constant into a Vector input', () => {
    const def = registry.require('ConstVector');
    expect(constantSeedValue(def, 'value', vectorInput, [1, 2, 3])).toEqual([1, 2, 3]);
  });

  it('does not seed a non-constant source (no value param)', () => {
    // PointCircle has a geometry output but no `value` param.
    const def = registry.require('PointCircle');
    const geomOut = socketsOf(def).outputs.find((o) => o.type === 'Geometry')!;
    const geomInput: FlowSocket = { name: 'geometry', type: 'Geometry', isArray: false };
    expect(constantSeedValue(def, geomOut.name, geomInput, undefined)).toBeUndefined();
  });

  it('returns undefined when there is no prior value', () => {
    const def = registry.require('ConstFloat');
    expect(constantSeedValue(def, 'value', floatInput, undefined)).toBeUndefined();
  });
});
