import { useRef } from 'react';

export interface ToolbarProps {
  nodeCount: number;
  onSave?: () => void;
  onOpen?: (file: File) => void;
}

/** Top app bar: product name, node count, and Save/Open actions. */
export function Toolbar({ nodeCount, onSave, onOpen }: ToolbarProps) {
  const fileRef = useRef<HTMLInputElement>(null);

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
        <button type="button" onClick={onSave}>
          Save
        </button>
        <button type="button" onClick={() => fileRef.current?.click()}>
          Open
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
}
