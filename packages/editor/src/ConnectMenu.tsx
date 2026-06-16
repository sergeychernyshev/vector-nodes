import { useEffect, useMemo, useState } from 'react';

import { filterPalette, type PaletteItem } from './flow';

export interface ConnectMenuProps<T extends PaletteItem> {
  /** Screen position to anchor the menu at (the drop point). */
  x: number;
  y: number;
  /** Nodes compatible with the dragged handle. */
  suggestions: T[];
  onPick: (suggestion: T) => void;
  onClose: () => void;
  /**
   * Which side was dragged: `source` adds a node that *feeds* the dragged input
   * (issue #45); `target` adds a node that *consumes* the dragged output (issue
   * #148). Tunes the menu's labels.
   */
  variant?: 'source' | 'target';
}

/**
 * Floating node picker shown when a connection is dragged into empty space. From
 * an input it lists nodes whose output matches (issue #45); from an output it
 * lists nodes whose input matches (issue #148). Choosing one creates that node
 * and wires it to the dragged handle.
 */
export function ConnectMenu<T extends PaletteItem>({
  x,
  y,
  suggestions,
  onPick,
  onClose,
  variant = 'source',
}: ConnectMenuProps<T>) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => filterPalette(suggestions, query) as T[], [suggestions, query]);
  const label = variant === 'target' ? 'Add target node' : 'Add source node';

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <>
      <div className="connect-menu__backdrop" onPointerDown={onClose} />
      <div
        className="connect-menu"
        style={{ left: x, top: y }}
        role="menu"
        aria-label={`Add a ${variant} node`}
      >
        <input
          className="connect-menu__search"
          type="search"
          placeholder={`${label}…`}
          aria-label={label}
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <ul className="connect-menu__list">
          {filtered.map((s) => (
            <li key={s.type}>
              <button
                type="button"
                className="connect-menu__item"
                role="menuitem"
                onClick={() => onPick(s)}
              >
                <span className="connect-menu__item-label">{s.label}</span>
                <span className="connect-menu__item-category">{s.category}</span>
              </button>
            </li>
          ))}
          {filtered.length === 0 && <li className="connect-menu__empty">No matching nodes</li>}
        </ul>
      </div>
    </>
  );
}
