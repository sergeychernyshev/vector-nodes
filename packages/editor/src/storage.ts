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

/** Load a persisted boolean UI flag, falling back to `fallback`. */
export function loadFlag(
  key: string,
  fallback = false,
  store: KeyValueStore | null = defaultStore(),
): boolean {
  if (!store) return fallback;
  try {
    const value = store.getItem(key);
    return value === null ? fallback : value === 'true';
  } catch {
    return fallback;
  }
}

/** Persist a boolean UI flag. Silently no-ops if storage is unavailable. */
export function saveFlag(
  key: string,
  value: boolean,
  store: KeyValueStore | null = defaultStore(),
): void {
  if (!store) return;
  try {
    store.setItem(key, String(value));
  } catch {
    // Ignore.
  }
}

/** Load a persisted string setting, falling back to `fallback`. */
export function loadString(
  key: string,
  fallback: string,
  store: KeyValueStore | null = defaultStore(),
): string {
  if (!store) return fallback;
  try {
    return store.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

/** Persist a string setting. Silently no-ops if storage is unavailable. */
export function saveString(
  key: string,
  value: string,
  store: KeyValueStore | null = defaultStore(),
): void {
  if (!store) return;
  try {
    store.setItem(key, value);
  } catch {
    // Ignore.
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
