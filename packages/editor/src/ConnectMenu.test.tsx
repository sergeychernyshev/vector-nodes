// @vitest-environment jsdom
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ConnectMenu } from './ConnectMenu';
import type { SourceSuggestion } from './inject';

afterEach(cleanup);

const suggestions: SourceSuggestion[] = [
  { type: 'PointCircle', label: 'Point Circle', category: 'Geometry', outputHandle: 'geometry' },
  { type: 'Box', label: 'Box', category: 'Mesh', outputHandle: 'geometry' },
];

describe('ConnectMenu', () => {
  it('lists the provided suggestions', () => {
    const { getByText } = render(
      <ConnectMenu x={10} y={20} suggestions={suggestions} onPick={vi.fn()} onClose={vi.fn()} />,
    );
    expect(getByText('Point Circle')).not.toBeNull();
    expect(getByText('Box')).not.toBeNull();
  });

  it('calls onPick with the chosen suggestion (carrying its output handle)', () => {
    const onPick = vi.fn();
    const { getByText } = render(
      <ConnectMenu x={0} y={0} suggestions={suggestions} onPick={onPick} onClose={vi.fn()} />,
    );
    fireEvent.click(getByText('Box'));
    expect(onPick).toHaveBeenCalledWith(suggestions[1]);
  });

  it('filters by the search query', () => {
    const { getByLabelText, queryByText } = render(
      <ConnectMenu x={0} y={0} suggestions={suggestions} onPick={vi.fn()} onClose={vi.fn()} />,
    );
    fireEvent.change(getByLabelText('Add source node'), { target: { value: 'box' } });
    expect(queryByText('Box')).not.toBeNull();
    expect(queryByText('Point Circle')).toBeNull();
  });

  it('shows an empty message and closes on backdrop click', () => {
    const onClose = vi.fn();
    const { container, getByText } = render(
      <ConnectMenu x={0} y={0} suggestions={[]} onPick={vi.fn()} onClose={onClose} />,
    );
    expect(getByText('No matching nodes')).not.toBeNull();
    fireEvent.pointerDown(container.querySelector('.connect-menu__backdrop')!);
    expect(onClose).toHaveBeenCalled();
  });
});
