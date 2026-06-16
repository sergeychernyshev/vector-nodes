// @vitest-environment jsdom
import { emptyGeometry } from '@vector-nodes/runtime';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PreviewPane } from './PreviewPane';

afterEach(cleanup);

const sampleGeometry = () => ({
  ...emptyGeometry(),
  points: [
    [0, 0, 0],
    [1, 0, 0],
  ] as [number, number, number][],
});

describe('PreviewPane', () => {
  it('shows the geometry summary counts', () => {
    const geometry = {
      ...emptyGeometry(),
      points: [
        [0, 0, 0],
        [1, 0, 0],
      ] as [number, number, number][],
    };
    const { getByTestId } = render(<PreviewPane result={{ geometry }} />);
    expect(getByTestId('preview-points').textContent).toBe('2');
    expect(getByTestId('preview-curves').textContent).toBe('0');
    expect(getByTestId('preview-meshes').textContent).toBe('0');
  });

  it('shows an error message when evaluation failed', () => {
    const { getByRole } = render(<PreviewPane result={{ error: 'boom' }} />);
    expect(getByRole('alert').textContent).toBe('boom');
  });

  it('defaults to the 3D view', () => {
    const { getByTestId, queryByTestId, getByRole } = render(
      <PreviewPane result={{ geometry: sampleGeometry() }} />,
    );
    expect(getByTestId('preview-canvas')).toBeTruthy();
    expect(queryByTestId('preview-svg')).toBeNull();
    expect(getByRole('button', { name: '3D' }).getAttribute('aria-pressed')).toBe('true');
  });

  it('swaps to the 2D SVG view when 2D is clicked, and back', () => {
    const { getByRole, getByTestId, queryByTestId } = render(
      <PreviewPane result={{ geometry: sampleGeometry() }} />,
    );
    fireEvent.click(getByRole('button', { name: '2D' }));
    expect(getByTestId('preview-svg')).toBeTruthy();
    expect(queryByTestId('preview-canvas')).toBeNull();

    fireEvent.click(getByRole('button', { name: '3D' }));
    expect(getByTestId('preview-canvas')).toBeTruthy();
    expect(queryByTestId('preview-svg')).toBeNull();
  });

  it('collapses to a rail with only an expand button (issue #64)', () => {
    const onToggle = vi.fn();
    const { getByLabelText, queryByTestId } = render(
      <PreviewPane result={{ geometry: sampleGeometry() }} collapsed onToggleCollapse={onToggle} />,
    );
    expect(queryByTestId('preview-canvas')).toBeNull();
    fireEvent.click(getByLabelText('Show preview'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('shows a collapse button when expanded', () => {
    const onToggle = vi.fn();
    const { getByLabelText } = render(
      <PreviewPane result={{ geometry: sampleGeometry() }} onToggleCollapse={onToggle} />,
    );
    fireEvent.click(getByLabelText('Hide preview'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('reports bottom-border drags and persists the height on release', () => {
    // The environment's localStorage is a non-functional stub; replace it to
    // observe the write.
    const setItem = vi.fn();
    vi.stubGlobal('localStorage', { getItem: () => null, setItem });
    try {
      const onResizeHeight = vi.fn();
      const { getByLabelText } = render(
        <PreviewPane result={{ geometry: sampleGeometry() }} onResizeHeight={onResizeHeight} />,
      );
      fireEvent.pointerDown(getByLabelText('Resize preview height'));
      // jsdom reports the pane's top at 0, so the height is just clientY.
      fireEvent.pointerMove(window, { clientY: 300 });
      expect(onResizeHeight).toHaveBeenLastCalledWith(300);
      fireEvent.pointerUp(window);
      expect(setItem).toHaveBeenCalledWith('vn:preview-height', '300');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('toggles the dock from the preview header and labels it per state (issue #154)', () => {
    const onToggleDock = vi.fn();
    const { getByLabelText, queryByLabelText, rerender } = render(
      <PreviewPane
        result={{ geometry: sampleGeometry() }}
        dock="side"
        onToggleDock={onToggleDock}
      />,
    );
    // Docked on the side → offers to dock on top.
    fireEvent.click(getByLabelText('Dock preview on top'));
    expect(onToggleDock).toHaveBeenCalledTimes(1);

    // Docked on top → offers to dock on the side.
    rerender(
      <PreviewPane
        result={{ geometry: sampleGeometry() }}
        dock="top"
        onToggleDock={onToggleDock}
      />,
    );
    expect(getByLabelText('Dock preview on the side')).toBeTruthy();

    // Hidden without a handler.
    rerender(<PreviewPane result={{ geometry: sampleGeometry() }} dock="side" />);
    expect(queryByLabelText('Dock preview on top')).toBeNull();
  });

  it('omits the bottom resize handle without an onResizeHeight handler', () => {
    const { queryByLabelText } = render(<PreviewPane result={{ geometry: sampleGeometry() }} />);
    expect(queryByLabelText('Resize preview height')).toBeNull();
  });
});
