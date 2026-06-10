// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

// Capture the props React Flow receives on each render. Stubbing <ReactFlow>
// avoids mounting the canvas (panzoom/ResizeObserver) while still exercising
// App's real render and hooks.
const captured = vi.hoisted(() => ({ props: [] as Record<string, unknown>[] }));

vi.mock('./ThreeView', () => ({ ThreeView: () => null }));
vi.mock('@xyflow/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@xyflow/react')>();
  return {
    ...actual,
    ReactFlow: (props: Record<string, unknown>) => {
      captured.props.push(props);
      return null;
    },
  };
});

import { ReactFlowProvider } from '@xyflow/react';

import { App } from './App';

afterEach(() => {
  cleanup();
  captured.props.length = 0;
});

describe('App ↔ React Flow prop stability (regression for React #185 update loop)', () => {
  it('passes referentially stable drag-start handlers across re-renders', () => {
    // React Flow tracks onNodeDragStart/onSelectionDragStart and writes any
    // changed prop reference into its store; an inline handler recreated each
    // render drives an infinite update loop ("Maximum update depth exceeded").
    render(
      <ReactFlowProvider>
        <App />
      </ReactFlowProvider>,
    );
    const first = captured.props.at(-1)!;
    expect(typeof first.onNodeDragStart).toBe('function');

    // Trigger an internal state change (snapshot → history push) → App re-renders.
    // A non-alt drag just snapshots, so a bare mouse event with a node suffices.
    act(() => {
      (first.onNodeDragStart as (e: unknown, n: unknown) => void)({ altKey: false }, { id: 'pa' });
    });
    const second = captured.props.at(-1)!;

    expect(second).not.toBe(first); // a re-render actually happened
    expect(second.onNodeDragStart).toBe(first.onNodeDragStart);
    expect(second.onSelectionDragStart).toBe(first.onSelectionDragStart);
  });
});
