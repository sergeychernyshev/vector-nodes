// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useUndoRedo } from './useUndoRedo';

/**
 * Drive the hook against a plain mutable `state` value. `getSnapshot` reads it
 * and `applySnapshot` writes it, mirroring how App reads/sets graph state.
 */
function setup(initial: string) {
  const box = { state: initial };
  const { result, rerender } = renderHook(() =>
    useUndoRedo(
      () => box.state,
      (s) => {
        box.state = s;
      },
    ),
  );
  // Mutate state the way an action would: snapshot the old value, then change.
  const change = (next: string, key?: string) => {
    act(() => result.current.takeSnapshot(key));
    box.state = next;
    rerender();
  };
  return { box, result, change, rerender };
}

describe('useUndoRedo', () => {
  it('undoes and redoes a sequence of changes', () => {
    const { box, result, change } = setup('a');
    change('b');
    change('c');
    expect(box.state).toBe('c');
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);

    act(() => result.current.undo());
    expect(box.state).toBe('b');
    act(() => result.current.undo());
    expect(box.state).toBe('a');
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(true);

    act(() => result.current.redo());
    expect(box.state).toBe('b');
    act(() => result.current.redo());
    expect(box.state).toBe('c');
  });

  it('clears the redo stack when a new change is made after undo', () => {
    const { box, result, change } = setup('a');
    change('b');
    act(() => result.current.undo());
    expect(box.state).toBe('a');
    change('c');
    expect(result.current.canRedo).toBe(false);
    act(() => result.current.undo());
    expect(box.state).toBe('a');
  });

  it('coalesces consecutive snapshots with the same key into one undo step', () => {
    const { box, result, change } = setup('a');
    // Three "keystrokes" on the same field: only the first records a-> snapshot.
    change('a1', 'field:x');
    change('a12', 'field:x');
    change('a123', 'field:x');
    expect(box.state).toBe('a123');
    act(() => result.current.undo());
    // One undo returns to the pre-edit value, not an intermediate one.
    expect(box.state).toBe('a');
  });

  it('starts a fresh undo step when the coalescing key changes', () => {
    const { box, result, change } = setup('a');
    change('x', 'field:x');
    change('y', 'field:y');
    act(() => result.current.undo());
    expect(box.state).toBe('x');
    act(() => result.current.undo());
    expect(box.state).toBe('a');
  });

  it('does nothing when there is no history', () => {
    const { box, result } = setup('a');
    expect(result.current.canUndo).toBe(false);
    act(() => result.current.undo());
    act(() => result.current.redo());
    expect(box.state).toBe('a');
  });
});
