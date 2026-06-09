import { useMemo, useState } from 'react';

import { filterPalette, type PaletteItem } from './flow';

export interface PaletteProps {
  items: PaletteItem[];
  onAdd: (type: string) => void;
  /** Node types that cannot currently be added (rendered disabled). */
  disabledTypes?: ReadonlySet<string>;
}

/** Searchable node palette; clicking an entry adds that node to the canvas. */
export function Palette({ items, onAdd, disabledTypes }: PaletteProps) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => filterPalette(items, query), [items, query]);

  return (
    <aside className="palette">
      <input
        className="palette__search"
        type="search"
        placeholder="Search nodes…"
        aria-label="Search nodes"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <ul className="palette__list">
        {filtered.map((item) => {
          const disabled = disabledTypes?.has(item.type) ?? false;
          return (
            <li key={item.type}>
              <button
                type="button"
                className="palette__item"
                onClick={() => onAdd(item.type)}
                disabled={disabled}
              >
                <span className="palette__item-label">{item.label}</span>
                <span className="palette__item-category">{item.category}</span>
              </button>
            </li>
          );
        })}
        {filtered.length === 0 && <li className="palette__empty">No matches</li>}
      </ul>
    </aside>
  );
}
