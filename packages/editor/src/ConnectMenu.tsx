import { useEffect, useMemo, useState } from 'react';

import { filterPalette } from './flow';
import type { SourceSuggestion } from './inject';

export interface ConnectMenuProps {
  /** Screen position to anchor the menu at (the drop point). */
  x: number;
  y: number;
  /** Nodes whose output can feed the dragged input. */
  suggestions: SourceSuggestion[];
  onPick: (suggestion: SourceSuggestion) => void;
  onClose: () => void;
}

/**
 * Floating node picker shown when a connection is dragged off an input into
 * empty space (issue #45). It lists only nodes whose output matches the dragged
 * input; choosing one creates that node and wires it to the input.
 */
export function ConnectMenu({ x, y, suggestions, onPick, onClose }: ConnectMenuProps) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(
    () => filterPalette(suggestions, query) as SourceSuggestion[],
    [suggestions, query],
  );

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
        aria-label="Add a source node"
      >
        <input
          className="connect-menu__search"
          type="search"
          placeholder="Add source node…"
          aria-label="Add source node"
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
