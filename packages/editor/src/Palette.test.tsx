// @vitest-environment jsdom
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Palette } from './Palette';
import type { PaletteItem } from './flow';

afterEach(cleanup);

const items: PaletteItem[] = [
  { type: 'PointArray', label: 'Point Array', category: 'Geometry' },
  { type: 'Translate', label: 'Translate', category: 'Geometry' },
  { type: 'VectorMath', label: 'Vector Math', category: 'Vector' },
];

describe('Palette', () => {
  it('adds a node when an item is clicked', () => {
    const onAdd = vi.fn();
    const { getByText } = render(<Palette items={items} onAdd={onAdd} />);
    fireEvent.click(getByText('Translate'));
    expect(onAdd).toHaveBeenCalledWith('Translate');
  });

  it('filters items by the search query', () => {
    const onAdd = vi.fn();
    const { getByLabelText, queryByText } = render(<Palette items={items} onAdd={onAdd} />);
    fireEvent.change(getByLabelText('Search nodes'), {
      target: { value: 'vector' },
    });
    expect(queryByText('Vector Math')).not.toBeNull();
    expect(queryByText('Point Array')).toBeNull();
  });

  it('disables items in disabledTypes and does not add them on click', () => {
    const onAdd = vi.fn();
    const { getByText } = render(
      <Palette items={items} onAdd={onAdd} disabledTypes={new Set(['Translate'])} />,
    );
    const button = getByText('Translate').closest('button')!;
    expect(button.disabled).toBe(true);
    fireEvent.click(button);
    expect(onAdd).not.toHaveBeenCalled();
  });

  it('shows a no-matches message when nothing matches', () => {
    const { getByLabelText, queryByText } = render(<Palette items={items} onAdd={vi.fn()} />);
    fireEvent.change(getByLabelText('Search nodes'), {
      target: { value: 'zzz' },
    });
    expect(queryByText('No matches')).not.toBeNull();
  });
});
