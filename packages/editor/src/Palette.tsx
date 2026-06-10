import { useMemo, useState } from 'react';

import { filterPalette, type PaletteItem } from './flow';

export interface PaletteProps {
  items: PaletteItem[];
  onAdd: (type: string) => void;
  /** Node types that cannot currently be added (rendered disabled). */
  disabledTypes?: ReadonlySet<string>;
  /** Node type currently armed for placement (rendered highlighted). */
  armedType?: string | null;
  /** Whether the palette is collapsed to a thin rail (issue #60). */
  collapsed?: boolean;
  /** Toggle the collapsed state (omit to hide the toggle). */
  onToggleCollapse?: () => void;
}

/** Searchable node palette; clicking an entry arms that node for placement. */
export function Palette({
  items,
  onAdd,
  disabledTypes,
  armedType,
  collapsed,
  onToggleCollapse,
}: PaletteProps) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => filterPalette(items, query), [items, query]);

  if (collapsed) {
    return (
      <aside className="palette palette--collapsed">
        <button
          type="button"
          className="palette__collapse"
          onClick={onToggleCollapse}
          aria-label="Show node list"
          aria-expanded={false}
          title="Show nodes"
        >
          »
        </button>
      </aside>
    );
  }

  return (
    <aside className="palette">
      <div className="palette__header">
        <span className="palette__title">Nodes</span>
        {onToggleCollapse && (
          <button
            type="button"
            className="palette__collapse"
            onClick={onToggleCollapse}
            aria-label="Hide node list"
            aria-expanded
            title="Hide nodes"
          >
            «
          </button>
        )}
      </div>
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
          const armed = item.type === armedType;
          return (
            <li key={item.type}>
              <button
                type="button"
                className={armed ? 'palette__item palette__item--armed' : 'palette__item'}
                aria-pressed={armed}
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
