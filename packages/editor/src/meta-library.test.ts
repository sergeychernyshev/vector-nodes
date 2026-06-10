import type { MetaNodeDefinition } from '@vector-nodes/core';
import { describe, expect, it } from 'vitest';

import { addToLibrary, loadLibrary, removeFromLibrary, type MetaLibrary } from './meta-library';
import type { KeyValueStore } from './storage';

function fakeStore(): KeyValueStore {
  const map = new Map<string, string>();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  };
}

const def: MetaNodeDefinition = {
  interface: {
    inputs: [{ name: 'offset', type: 'Vector' }],
    outputs: [{ name: 'geometry', type: 'Geometry' }],
  },
  nodes: [{ id: 't', type: 'Translate' }],
  links: [],
};

describe('meta library', () => {
  it('returns {} when nothing is stored', () => {
    expect(loadLibrary(fakeStore())).toEqual({});
  });

  it('adds, persists, and removes entries', () => {
    const store = fakeStore();
    const added: MetaLibrary = addToLibrary('Shift', def, store);
    expect(added.Shift).toEqual(def);
    expect(loadLibrary(store)).toEqual({ Shift: def });

    const removed = removeFromLibrary('Shift', store);
    expect(removed).toEqual({});
    expect(loadLibrary(store)).toEqual({});
  });

  it('ignores malformed stored JSON', () => {
    const store = fakeStore();
    store.setItem('vector-nodes:meta-library', '{not json');
    expect(loadLibrary(store)).toEqual({});
  });
});
