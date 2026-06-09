export interface ToolbarProps {
  nodeCount: number;
}

/** Top app bar showing the product name and current node count. */
export function Toolbar({ nodeCount }: ToolbarProps) {
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
    </header>
  );
}
