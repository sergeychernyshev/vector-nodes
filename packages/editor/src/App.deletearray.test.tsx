// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

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

// p1 → vm → Polyline.points (array), with a second point p2 also feeding it.
// Deleting vm should bridge p1 → points while keeping p2's connection.
vi.mock('./storage', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./storage')>();
  const { createGraph } = await import('@vector-nodes/core');
  const graph = createGraph({
    nodes: [
      { id: 'p1', type: 'Point', position: [0, 0], inputDefaults: { x: 1 } },
      { id: 'vm', type: 'VectorMath', position: [150, 0], params: { operation: 'normalize' } },
      { id: 'p2', type: 'Point', position: [0, 120], inputDefaults: { x: 2 } },
      { id: 'pl', type: 'Polyline', position: [320, 0] },
      { id: 'out', type: 'OutputGeometry', position: [520, 0] },
    ],
    links: [
      { from: ['p1', 'point'], to: ['vm', 'a'] },
      { from: ['vm', 'vector'], to: ['pl', 'points'] },
      { from: ['p2', 'point'], to: ['pl', 'points'] },
      { from: ['pl', 'geometry'], to: ['out', 'geometry'] },
    ],
  });
  return {
    ...actual,
    loadGraph: () => graph,
    saveGraph: () => {},
    clearGraph: () => {},
    loadFlag: () => false,
    saveFlag: () => {},
    loadString: (_k: string, fallback = '') => fallback,
    saveString: () => {},
  };
});

afterEach(() => {
  cleanup();
  captured.props.length = 0;
});

describe('deleting a bridged node into an array input (issue #146)', () => {
  it('heals the gap without wiping the array input’s other connections', async () => {
    const { App } = await import('./App');
    const { ReactFlowProvider } = await import('@xyflow/react');
    render(
      <ReactFlowProvider>
        <App />
      </ReactFlowProvider>,
    );
    const last = () => captured.props.at(-1)!;
    const onNodesDelete = last().onNodesDelete as (nodes: { id: string }[]) => void;
    const pointsLinks = (props: Record<string, unknown>) =>
      (props.edges as { target: string; targetHandle: string; source: string }[]).filter(
        (e) => e.target === 'pl' && e.targetHandle === 'points',
      );

    // Two connections into points to start (vm and p2).
    expect(
      pointsLinks(last())
        .map((e) => e.source)
        .sort(),
    ).toEqual(['p2', 'vm']);

    // Delete the middle node: bridge p1 → points, keep p2.
    act(() => onNodesDelete([{ id: 'vm' }]));

    const sources = pointsLinks(last())
      .map((e) => e.source)
      .sort();
    expect(sources).toEqual(['p1', 'p2']); // bridged source + the survivor — not wiped
  });
});
