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

// Two compatible nodes placed adjacently (PointCircle just left of Translate),
// with no link between them yet.
vi.mock('./storage', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./storage')>();
  const { createGraph } = await import('@vector-nodes/core');
  const graph = createGraph({
    nodes: [
      { id: 'pc', type: 'PointCircle', position: [0, 0] },
      { id: 't', type: 'Translate', position: [200, 0] },
      { id: 'out', type: 'OutputGeometry', position: [500, 0] },
    ],
    links: [],
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

describe('auto-connect on drag (issue #137)', () => {
  it('previews while dragging an adjacent compatible node and commits on drop', async () => {
    const { App } = await import('./App');
    const { ReactFlowProvider } = await import('@xyflow/react');
    render(
      <ReactFlowProvider>
        <App />
      </ReactFlowProvider>,
    );
    const last = () => captured.props.at(-1)!;
    const pcNode = (last().nodes as { id: string }[]).find((n) => n.id === 'pc')!;
    const onNodeDrag = last().onNodeDrag as (e: unknown, n: unknown) => void;
    const onNodeDragStop = last().onNodeDragStop as () => void;
    const autoEdges = (props: Record<string, unknown>) =>
      (props.edges as { id: string }[]).filter((e) => e.id === '__auto-connect');
    const realLink = (props: Record<string, unknown>) =>
      (props.edges as { source: string; target: string }[]).filter(
        (e) => e.source === 'pc' && e.target === 't',
      );

    // No link to start.
    expect(realLink(last())).toHaveLength(0);

    // Dragging PointCircle (adjacent to Translate) shows the preview overlay edge.
    act(() => onNodeDrag({}, pcNode));
    expect(autoEdges(last())).toHaveLength(1);

    // Dropping commits the connection and clears the preview.
    act(() => onNodeDragStop());
    expect(autoEdges(last())).toHaveLength(0);
    const committed = realLink(last());
    expect(committed).toHaveLength(1);
    expect(committed[0]).toMatchObject({ sourceHandle: 'geometry', targetHandle: 'geometry' });
  });
});
