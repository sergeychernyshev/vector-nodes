import { createGraph } from '@vector-nodes/core';
import { describe, expect, it } from 'vitest';

import {
  clearGraph,
  loadFlag,
  loadGraph,
  loadString,
  saveFlag,
  saveGraph,
  saveString,
  STORAGE_KEY,
  type KeyValueStore,
} from './storage';

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
    { id: 'pa', type: 'PointCircle', position: [10, 20] },
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

  it('persists and reads boolean flags', () => {
    const store = fakeStore();
    expect(loadFlag('vn:flag', false, store)).toBe(false);
    expect(loadFlag('vn:flag', true, store)).toBe(true); // missing → fallback
    saveFlag('vn:flag', true, store);
    expect(loadFlag('vn:flag', false, store)).toBe(true);
    saveFlag('vn:flag', false, store);
    expect(loadFlag('vn:flag', true, store)).toBe(false);
    expect(loadFlag('vn:flag', true, null)).toBe(true); // no store → fallback
    expect(() => saveFlag('vn:flag', true, null)).not.toThrow();
  });

  it('persists and reads string settings', () => {
    const store = fakeStore();
    expect(loadString('vn:lang', 'typescript', store)).toBe('typescript'); // missing → fallback
    saveString('vn:lang', 'javascript', store);
    expect(loadString('vn:lang', 'typescript', store)).toBe('javascript');
    expect(loadString('vn:lang', 'typescript', null)).toBe('typescript'); // no store → fallback
    expect(() => saveString('vn:lang', 'x', null)).not.toThrow();
  });
});
