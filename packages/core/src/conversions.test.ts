import { describe, expect, it } from 'vitest';

import { canConvertImplicitly, implicitConversionTargets } from './conversions';
import { SOCKET_TYPES } from './socket-types';

describe('canConvertImplicitly', () => {
  it('always allows the identity conversion', () => {
    for (const type of SOCKET_TYPES) {
      expect(canConvertImplicitly(type, type)).toBe(true);
    }
  });

  it('allows numeric widening Boolean → Integer → Float', () => {
    expect(canConvertImplicitly('Boolean', 'Integer')).toBe(true);
    expect(canConvertImplicitly('Boolean', 'Float')).toBe(true);
    expect(canConvertImplicitly('Integer', 'Float')).toBe(true);
  });

  it('allows scalar → Vector and scalar → Color broadcasts', () => {
    for (const scalar of ['Float', 'Integer', 'Boolean'] as const) {
      expect(canConvertImplicitly(scalar, 'Vector')).toBe(true);
      expect(canConvertImplicitly(scalar, 'Color')).toBe(true);
    }
  });

  it('rejects narrowing conversions (ambiguous / lossy)', () => {
    expect(canConvertImplicitly('Float', 'Integer')).toBe(false);
    expect(canConvertImplicitly('Float', 'Boolean')).toBe(false);
    expect(canConvertImplicitly('Integer', 'Boolean')).toBe(false);
  });

  it('rejects Vector/Color cross-conversions and Vector → scalar', () => {
    expect(canConvertImplicitly('Vector', 'Float')).toBe(false);
    expect(canConvertImplicitly('Vector', 'Color')).toBe(false);
    expect(canConvertImplicitly('Color', 'Vector')).toBe(false);
  });

  it('rejects any implicit conversion to/from String, Geometry, Matrix', () => {
    for (const opaque of ['String', 'Geometry', 'Matrix'] as const) {
      for (const other of SOCKET_TYPES) {
        if (other === opaque) continue;
        expect(canConvertImplicitly(opaque, other)).toBe(false);
        expect(canConvertImplicitly(other, opaque)).toBe(false);
      }
    }
  });
});

describe('implicitConversionTargets', () => {
  it('lists targets excluding the identity', () => {
    expect(implicitConversionTargets('Float')).toEqual(['Vector', 'Color']);
    expect(implicitConversionTargets('Geometry')).toEqual([]);
  });

  it('returns a fresh array that cannot mutate the table', () => {
    const targets = implicitConversionTargets('Float');
    targets.push('Matrix');
    expect(implicitConversionTargets('Float')).toEqual(['Vector', 'Color']);
  });
});
