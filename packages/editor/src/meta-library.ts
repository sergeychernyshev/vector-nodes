import type { MetaNodeDefinition } from '@vector-nodes/core';

import type { KeyValueStore } from './storage';

/** localStorage key for the reusable meta-node library. */
export const LIBRARY_KEY = 'vector-nodes:meta-library';

/** A library of meta-node definitions, keyed by name, reusable across networks. */
export type MetaLibrary = Record<string, MetaNodeDefinition>;

function defaultStore(): KeyValueStore | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

/** Load the saved meta-node library, or `{}` if none/unavailable/invalid. */
export function loadLibrary(store: KeyValueStore | null = defaultStore()): MetaLibrary {
  if (!store) return {};
  try {
    const text = store.getItem(LIBRARY_KEY);
    if (!text) return {};
    const parsed: unknown = JSON.parse(text);
    return parsed && typeof parsed === 'object' ? (parsed as MetaLibrary) : {};
  } catch {
    return {};
  }
}

/** Persist the whole library. Silently no-ops if storage is unavailable. */
export function saveLibrary(
  library: MetaLibrary,
  store: KeyValueStore | null = defaultStore(),
): void {
  if (!store) return;
  try {
    store.setItem(LIBRARY_KEY, JSON.stringify(library));
  } catch {
    // Ignore quota / serialization errors.
  }
}

/** Add (or replace) one meta-node in the library and persist; returns the new library. */
export function addToLibrary(
  name: string,
  def: MetaNodeDefinition,
  store: KeyValueStore | null = defaultStore(),
): MetaLibrary {
  const library = { ...loadLibrary(store), [name]: def };
  saveLibrary(library, store);
  return library;
}

/** Remove a meta-node from the library and persist; returns the new library. */
export function removeFromLibrary(
  name: string,
  store: KeyValueStore | null = defaultStore(),
): MetaLibrary {
  const library = { ...loadLibrary(store) };
  delete library[name];
  saveLibrary(library, store);
  return library;
}
