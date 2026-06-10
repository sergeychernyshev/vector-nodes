// @vitest-environment jsdom
import { cleanup, fireEvent, render } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Toolbar, type ToolbarHandle } from './Toolbar';

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

  it('calls onReset when Reset is clicked', () => {
    const onReset = vi.fn();
    const { getByText } = render(<Toolbar nodeCount={0} onReset={onReset} />);
    fireEvent.click(getByText('Reset'));
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it('calls onGroup / onUngroup and disables them when no handler is given', () => {
    const onGroup = vi.fn();
    const { getByText, rerender } = render(<Toolbar nodeCount={0} onGroup={onGroup} />);
    fireEvent.click(getByText('Group'));
    expect(onGroup).toHaveBeenCalledTimes(1);
    expect((getByText('Ungroup').closest('button') as HTMLButtonElement).disabled).toBe(true);
    rerender(<Toolbar nodeCount={0} />);
    expect((getByText('Group').closest('button') as HTMLButtonElement).disabled).toBe(true);
  });

  it('calls onUndo / onRedo and disables them per canUndo / canRedo', () => {
    const onUndo = vi.fn();
    const onRedo = vi.fn();
    const { getByText } = render(
      <Toolbar nodeCount={0} onUndo={onUndo} onRedo={onRedo} canUndo canRedo={false} />,
    );
    fireEvent.click(getByText('Undo'));
    expect(onUndo).toHaveBeenCalledTimes(1);
    expect((getByText('Redo').closest('button') as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(getByText('Redo'));
    expect(onRedo).not.toHaveBeenCalled();
  });

  it('openFileDialog handle clicks the hidden file input', () => {
    const ref = createRef<ToolbarHandle>();
    const { getByLabelText } = render(<Toolbar ref={ref} nodeCount={0} />);
    const input = getByLabelText('Open file') as HTMLInputElement;
    const click = vi.spyOn(input, 'click');
    ref.current?.openFileDialog();
    expect(click).toHaveBeenCalledTimes(1);
  });
});
