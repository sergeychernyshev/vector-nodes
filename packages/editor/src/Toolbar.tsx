import { forwardRef, useImperativeHandle, useRef } from 'react';

export interface ToolbarProps {
  nodeCount: number;
  onSave?: () => void;
  onOpen?: (file: File) => void;
  onReset?: () => void;
  /** Collapse the current selection into a meta-node (omit to disable). */
  onGroup?: () => void;
  /** Expand the selected meta-node instance (omit to disable). */
  onUngroup?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  /** Swap the node-list and preview sidebars (issue #62). */
  onSwapSidebars?: () => void;
}

/** Imperative handle exposed by {@link Toolbar} for keyboard shortcuts. */
export interface ToolbarHandle {
  /** Open the native file picker, as if the Open button were clicked. */
  openFileDialog: () => void;
}

/** Top app bar: product name, node count, and Save/Open/Reset actions. */
export const Toolbar = forwardRef<ToolbarHandle, ToolbarProps>(function Toolbar(
  {
    nodeCount,
    onSave,
    onOpen,
    onReset,
    onGroup,
    onUngroup,
    onUndo,
    onRedo,
    canUndo,
    canRedo,
    onSwapSidebars,
  },
  ref,
) {
  const fileRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => ({ openFileDialog: () => fileRef.current?.click() }), []);

  return (
    <header
      style={{
        padding: '8px 12px',
        borderBottom: '1px solid #ddd',
        display: 'flex',
        gap: 12,
        alignItems: 'baseline',
      }}
    >
      <strong>Vector Nodes</strong>
      <span data-testid="node-count">{nodeCount} nodes</span>
      <span style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
        <button type="button" onClick={onUndo} disabled={!canUndo} title="Undo (Ctrl/Cmd+Z)">
          Undo
        </button>
        <button type="button" onClick={onRedo} disabled={!canRedo} title="Redo (Ctrl/Cmd+Shift+Z)">
          Redo
        </button>
        <button type="button" onClick={onGroup} disabled={!onGroup}>
          Group
        </button>
        <button type="button" onClick={onUngroup} disabled={!onUngroup}>
          Ungroup
        </button>
        {onSwapSidebars && (
          <button type="button" onClick={onSwapSidebars} title="Swap sidebars">
            Swap sides
          </button>
        )}
        <button type="button" onClick={onReset}>
          Reset
        </button>
        <button type="button" onClick={() => fileRef.current?.click()}>
          Open
        </button>
        <button type="button" onClick={onSave}>
          Save
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".vnodes,application/json"
          aria-label="Open file"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file && onOpen) onOpen(file);
            e.target.value = '';
          }}
        />
      </span>
    </header>
  );
});
