// @vitest-environment jsdom
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('./ThreeView', () => ({ ThreeView: () => null }));
vi.mock('@xyflow/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@xyflow/react')>();
  return { ...actual, ReactFlow: () => null };
});

// Stub persistence; default the dock to 'side' (no saved value).
vi.mock('./storage', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./storage')>();
  return {
    ...actual,
    loadGraph: () => null,
    saveGraph: () => {},
    clearGraph: () => {},
    loadFlag: () => false,
    saveFlag: () => {},
    loadString: (_k: string, fallback = '') => fallback,
    saveString: () => {},
  };
});

afterEach(cleanup);

describe('preview dock toggle (issue #154)', () => {
  it('toggles the app-main layout class between side and top', async () => {
    const { App } = await import('./App');
    const { ReactFlowProvider } = await import('@xyflow/react');
    const { container, getByText } = render(
      <ReactFlowProvider>
        <App />
      </ReactFlowProvider>,
    );
    const appMain = () => container.querySelector('.app-main')!;
    // Defaults to side docking (landscape).
    expect(appMain().classList.contains('app-main--preview-top')).toBe(false);

    // Click "Dock top" → strip layout on top.
    fireEvent.click(getByText('Dock top'));
    expect(appMain().classList.contains('app-main--preview-top')).toBe(true);

    // The button now offers to dock back on the side.
    fireEvent.click(getByText('Dock side'));
    expect(appMain().classList.contains('app-main--preview-top')).toBe(false);
  });
});
