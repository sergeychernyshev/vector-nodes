// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

// Capture the props React Flow receives (notably `edges`) on each render.
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

// Seed the editor with two individual Points → one Polyline.points (array input)
// → Output, the first point already wired. Persistence is stubbed to no-ops so
// the jsdom env's read-only localStorage isn't touched.
vi.mock('./storage', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./storage')>();
  const { createGraph } = await import('@vector-nodes/core');
  const graph = createGraph({
    nodes: [
      { id: 'p1', type: 'Point', position: [0, 0], inputDefaults: { x: 1 } },
      { id: 'p2', type: 'Point', position: [0, 80], inputDefaults: { x: 2 } },
      { id: 'pl', type: 'Polyline', position: [200, 0] },
      { id: 'out', type: 'OutputGeometry', position: [400, 0] },
    ],
    links: [
      { from: ['p1', 'point'], to: ['pl', 'points'] },
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

describe('array input keeps multiple individual-value connections (issue #146)', () => {
  it('a second scalar source into Polyline.points does not replace the first', async () => {
    const { App } = await import('./App');
    const { ReactFlowProvider } = await import('@xyflow/react');
    render(
      <ReactFlowProvider>
        <App />
      </ReactFlowProvider>,
    );
    const onConnect = captured.props.at(-1)!.onConnect as (c: unknown) => void;
    const edgesInto = (props: Record<string, unknown>) =>
      (props.edges as { target: string; targetHandle: string }[]).filter(
        (e) => e.target === 'pl' && e.targetHandle === 'points',
      );

    expect(edgesInto(captured.props.at(-1)!)).toHaveLength(1);

    act(() =>
      onConnect({ source: 'p2', sourceHandle: 'point', target: 'pl', targetHandle: 'points' }),
    );

    // Both connections must survive — the array input collects, not replaces.
    expect(edgesInto(captured.props.at(-1)!)).toHaveLength(2);
  });
});
