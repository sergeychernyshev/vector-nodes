// @vitest-environment jsdom
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Toolbar } from './Toolbar';

afterEach(cleanup);

describe('Toolbar', () => {
  it('renders the product name and node count', () => {
    const { container } = render(<Toolbar nodeCount={3} />);
    expect(container.textContent).toContain('Vector Nodes');
    expect(container.querySelector('[data-testid="node-count"]')?.textContent).toBe('3 nodes');
  });

  it('calls onSave when Save is clicked', () => {
    const onSave = vi.fn();
    const { getByText } = render(<Toolbar nodeCount={0} onSave={onSave} />);
    fireEvent.click(getByText('Save'));
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('calls onOpen with the chosen file', () => {
    const onOpen = vi.fn();
    const { getByLabelText } = render(<Toolbar nodeCount={0} onOpen={onOpen} />);
    const file = new File(['{}'], 'graph.vnodes', { type: 'application/json' });
    fireEvent.change(getByLabelText('Open file'), { target: { files: [file] } });
    expect(onOpen).toHaveBeenCalledWith(file);
  });
});
