// @vitest-environment jsdom
import { createBasicRegistry } from '@vector-nodes/core';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Palette } from './Palette';
import { createFlowNode, type FlowNodeData, type PaletteItem } from './flow';

afterEach(cleanup);

const items: PaletteItem[] = [
  { type: 'PointCircle', label: 'Point Circle', category: 'Geometry' },
  { type: 'Translate', label: 'Translate', category: 'Geometry' },
  { type: 'VectorMath', label: 'Vector Math', category: 'Vector' },
];

describe('Palette', () => {
  it('adds a node when an item is clicked', () => {
    const onAdd = vi.fn();
    const { getByText } = render(<Palette items={items} onAdd={onAdd} />);
    fireEvent.click(getByText('Translate'));
    expect(onAdd).toHaveBeenCalledWith('Translate');
  });

  it('filters items by the search query', () => {
    const onAdd = vi.fn();
    const { getByLabelText, queryByText } = render(<Palette items={items} onAdd={onAdd} />);
    fireEvent.change(getByLabelText('Search nodes'), {
      target: { value: 'vector' },
    });
    expect(queryByText('Vector Math')).not.toBeNull();
    expect(queryByText('Point Circle')).toBeNull();
  });

  it('disables items in disabledTypes and does not add them on click', () => {
    const onAdd = vi.fn();
    const { getByText } = render(
      <Palette items={items} onAdd={onAdd} disabledTypes={new Set(['Translate'])} />,
    );
    const button = getByText('Translate').closest('button')!;
    expect(button.disabled).toBe(true);
    fireEvent.click(button);
    expect(onAdd).not.toHaveBeenCalled();
  });

  it('shows a no-matches message when nothing matches', () => {
    const { getByLabelText, queryByText } = render(<Palette items={items} onAdd={vi.fn()} />);
    fireEvent.change(getByLabelText('Search nodes'), {
      target: { value: 'zzz' },
    });
    expect(queryByText('No matches')).not.toBeNull();
  });

  it('collapses to a rail with only an expand button (issue #60)', () => {
    const onToggle = vi.fn();
    const { getByLabelText, queryByLabelText } = render(
      <Palette items={items} onAdd={vi.fn()} collapsed onToggleCollapse={onToggle} />,
    );
    expect(queryByLabelText('Search nodes')).toBeNull();
    fireEvent.click(getByLabelText('Show node list'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('shows a collapse button when expanded', () => {
    const onToggle = vi.fn();
    const { getByLabelText } = render(
      <Palette items={items} onAdd={vi.fn()} onToggleCollapse={onToggle} />,
    );
    fireEvent.click(getByLabelText('Hide node list'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('renders a node icon per item when node data is supplied (issue #142)', () => {
    const registry = createBasicRegistry();
    const nodeData = new Map<string, FlowNodeData>([
      ['PointCircle', createFlowNode(registry.require('PointCircle'), { x: 0, y: 0 }, 'p').data],
      ['VectorMath', createFlowNode(registry.require('VectorMath'), { x: 0, y: 0 }, 'v').data],
    ]);
    const { getByText } = render(<Palette items={items} onAdd={vi.fn()} nodeData={nodeData} />);
    // The geometry node shows a 2D render icon; the non-geometry node a badge.
    expect(
      getByText('Point Circle').closest('button')!.querySelector('.vnode__icon--geo'),
    ).not.toBeNull();
    expect(
      getByText('Vector Math').closest('button')!.querySelector('.vnode__icon'),
    ).not.toBeNull();
  });
});
