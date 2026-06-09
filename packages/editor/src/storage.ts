import { parseVnodes, serializeVnodes, type Graph } from '@vector-nodes/core';

/** localStorage key under which the editor autosaves the current network. */
export const STORAGE_KEY = 'vector-nodes:autosave';

/** The subset of the Web Storage API this module needs (injectable for tests). */
export type KeyValueStore = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function defaultStore(): KeyValueStore | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    // Access can throw (e.g. disabled cookies / sandboxed iframe).
    return null;
  }
}

/** Persist a graph. Silently no-ops if storage is unavailable. */
export function saveGraph(graph: Graph, store: KeyValueStore | null = defaultStore()): void {
  if (!store) return;
  try {
    store.setItem(STORAGE_KEY, serializeVnodes(graph));
  } catch {
    // Ignore quota / serialization errors.
  }
}

/**
 * Load the autosaved graph, or `null` if there is none, storage is unavailable,
 * or the stored content is missing/invalid.
 */
export function loadGraph(store: KeyValueStore | null = defaultStore()): Graph | null {
  if (!store) return null;
  try {
    const text = store.getItem(STORAGE_KEY);
    return text ? parseVnodes(text) : null;
  } catch {
    return null;
  }
}

/** Remove the autosaved graph. */
export function clearGraph(store: KeyValueStore | null = defaultStore()): void {
  if (!store) return;
  try {
    store.removeItem(STORAGE_KEY);
  } catch {
    // Ignore.
  }
}
