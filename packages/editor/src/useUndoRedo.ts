import { useCallback, useRef, useState } from 'react';

/** Undo/redo controls over snapshots of type `S`. */
export interface UndoRedo {
  /**
   * Record the current state as an undo point — call this *before* a mutating
   * action. An optional `key` coalesces a run of edits to the same target (e.g.
   * dragging a number field): consecutive calls with the same key snapshot only
   * once. Any keyless call, undo, or redo resets the coalescing.
   */
  takeSnapshot: (key?: string) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

/**
 * A generic undo/redo history. `getSnapshot` captures the current state and
 * `applySnapshot` restores one; both are read through refs so the returned
 * callbacks stay stable across renders. History is capped at `max` entries.
 */
export function useUndoRedo<S>(
  getSnapshot: () => S,
  applySnapshot: (snapshot: S) => void,
  max = 100,
): UndoRedo {
  const [past, setPast] = useState<S[]>([]);
  const [future, setFuture] = useState<S[]>([]);
  const getRef = useRef(getSnapshot);
  getRef.current = getSnapshot;
  const applyRef = useRef(applySnapshot);
  applyRef.current = applySnapshot;
  const lastKey = useRef<string | null>(null);

  const takeSnapshot = useCallback(
    (key?: string) => {
      // Coalesce consecutive edits to the same target into one undo point.
      if (key !== undefined && lastKey.current === key) return;
      lastKey.current = key ?? null;
      setPast((p) => {
        const next = [...p, getRef.current()];
        return next.length > max ? next.slice(next.length - max) : next;
      });
      setFuture([]);
    },
    [max],
  );

  // Side effects (applySnapshot) run in the handler, not inside a state updater,
  // so they fire exactly once even under StrictMode's double-invoked updaters.
  const undo = useCallback(() => {
    if (past.length === 0) return;
    const previous = past[past.length - 1]!;
    // Capture before applying — applySnapshot mutates state synchronously, so a
    // lazy read inside the updater would see the already-restored value.
    const current = getRef.current();
    setPast(past.slice(0, -1));
    setFuture((f) => [current, ...f]);
    applyRef.current(previous);
    lastKey.current = null;
  }, [past]);

  const redo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0]!;
    const current = getRef.current();
    setFuture(future.slice(1));
    setPast((p) => [...p, current]);
    applyRef.current(next);
    lastKey.current = null;
  }, [future]);

  return { takeSnapshot, undo, redo, canUndo: past.length > 0, canRedo: future.length > 0 };
}
