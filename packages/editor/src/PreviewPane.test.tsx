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

  it('persists the mode to localStorage when 2D is clicked', () => {
    const setItem = vi.fn();
    vi.stubGlobal('localStorage', { getItem: () => null, setItem });
    try {
      const { getByRole } = render(<PreviewPane result={{ geometry: sampleGeometry() }} />);
      fireEvent.click(getByRole('button', { name: '2D' }));
      expect(setItem).toHaveBeenCalledWith('vn:preview-mode', '2d');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('persists the mode to localStorage when 3D is clicked', () => {
    const setItem = vi.fn();
    vi.stubGlobal('localStorage', { getItem: () => '2d', setItem });
    try {
      const { getByRole } = render(<PreviewPane result={{ geometry: sampleGeometry() }} />);
      fireEvent.click(getByRole('button', { name: '3D' }));
      expect(setItem).toHaveBeenCalledWith('vn:preview-mode', '3d');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('restores a previously saved 2D mode from localStorage', () => {
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => (key === 'vn:preview-mode' ? '2d' : null),
      setItem: vi.fn(),
    });
    try {
      const { queryByTestId, getByRole } = render(
        <PreviewPane result={{ geometry: sampleGeometry() }} />,
      );
      expect(queryByTestId('preview-svg')).toBeTruthy();
      expect(queryByTestId('preview-canvas')).toBeNull();
      expect(getByRole('button', { name: '2D' }).getAttribute('aria-pressed')).toBe('true');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('reports bottom-border drags and persists the height on release', () => {
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

  it('omits the bottom resize handle without an onResizeHeight handler', () => {
    const { queryByLabelText } = render(<PreviewPane result={{ geometry: sampleGeometry() }} />);
    expect(queryByLabelText('Resize preview height')).toBeNull();
  });
});
