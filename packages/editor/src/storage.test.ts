import { createGraph } from '@vector-nodes/core';
import { describe, expect, it } from 'vitest';

import { clearGraph, loadGraph, saveGraph, STORAGE_KEY, type KeyValueStore } from './storage';

function fakeStore(): KeyValueStore & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  };
}

const graph = createGraph({
  nodes: [
    { id: 'pa', type: 'PointArray', position: [10, 20] },
    { id: 'out', type: 'OutputGeometry', position: [200, 30] },
  ],
  links: [{ from: ['pa', 'geometry'], to: ['out', 'geometry'] }],
});

describe('storage', () => {
  it('round-trips a graph through the store', () => {
    const store = fakeStore();
    saveGraph(graph, store);
    expect(loadGraph(store)).toEqual(graph);
  });

  it('returns null when nothing is stored', () => {
    expect(loadGraph(fakeStore())).toBeNull();
  });

  it('returns null for invalid stored content', () => {
    const store = fakeStore();
    store.setItem(STORAGE_KEY, 'not json');
    expect(loadGraph(store)).toBeNull();
  });

  it('returns null for a schema-invalid document', () => {
    const store = fakeStore();
    store.setItem(STORAGE_KEY, JSON.stringify({ format: 'nope' }));
    expect(loadGraph(store)).toBeNull();
  });

  it('returns null / no-ops when no store is available', () => {
    expect(loadGraph(null)).toBeNull();
    expect(() => saveGraph(graph, null)).not.toThrow();
    expect(() => clearGraph(null)).not.toThrow();
  });

  it('clearGraph removes the autosave', () => {
    const store = fakeStore();
    saveGraph(graph, store);
    clearGraph(store);
    expect(loadGraph(store)).toBeNull();
  });
});
