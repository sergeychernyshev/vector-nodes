import { describe, expect, it } from 'vitest';

import { cyrb53, stableStringify } from './hash';

describe('stableStringify', () => {
  it('is independent of object key order', () => {
    expect(stableStringify({ a: 1, b: 2 })).toBe(stableStringify({ b: 2, a: 1 }));
  });

  it('distinguishes different values', () => {
    expect(stableStringify({ a: 1 })).not.toBe(stableStringify({ a: 2 }));
  });

  it('handles nested arrays and objects', () => {
    expect(stableStringify({ p: [1, [2, 3], { z: 9, y: 8 }] })).toBe(
      '{"p":[1,[2,3],{"y":8,"z":9}]}',
    );
  });

  it('handles primitives and null', () => {
    expect(stableStringify(null)).toBe('null');
    expect(stableStringify(42)).toBe('42');
    expect(stableStringify('x')).toBe('"x"');
  });
});

describe('cyrb53', () => {
  it('is deterministic', () => {
    expect(cyrb53('hello')).toBe(cyrb53('hello'));
  });

  it('differs for different inputs', () => {
    expect(cyrb53('hello')).not.toBe(cyrb53('world'));
  });

  it('returns a non-negative integer', () => {
    const h = cyrb53('anything');
    expect(Number.isInteger(h)).toBe(true);
    expect(h).toBeGreaterThanOrEqual(0);
  });
});
