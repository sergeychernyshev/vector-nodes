import { describe, expect, it } from 'vitest';

import { isSocketType, SOCKET_TYPES, socketTypeDescriptor } from './socket-types';

describe('SOCKET_TYPES', () => {
  it('contains the eight documented types', () => {
    expect(SOCKET_TYPES).toEqual([
      'Float',
      'Integer',
      'Boolean',
      'Vector',
      'Color',
      'String',
      'Geometry',
      'Matrix',
    ]);
  });
});

describe('isSocketType', () => {
  it('accepts valid types and rejects others', () => {
    expect(isSocketType('Vector')).toBe(true);
    expect(isSocketType('Point')).toBe(false);
    expect(isSocketType('')).toBe(false);
  });
});

describe('socketTypeDescriptor', () => {
  it('defaults to a single (non-array) value', () => {
    expect(socketTypeDescriptor('Float')).toEqual({
      type: 'Float',
      isArray: false,
    });
  });

  it('marks fields when isArray is set', () => {
    expect(socketTypeDescriptor('Vector', true)).toEqual({
      type: 'Vector',
      isArray: true,
    });
  });
});
