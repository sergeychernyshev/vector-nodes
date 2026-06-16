// @vitest-environment jsdom
import { createBasicRegistry } from '@vector-nodes/core';
import { cleanup, render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { createFlowNode } from './flow';
import { NodeEditContext } from './NodeEditContext';
import { GhostNode } from './VNode';

const registry = createBasicRegistry();
const dataFor = (type: string, inputDefaults?: Record<string, unknown>) => {
  const data = createFlowNode(registry.require(type), { x: 0, y: 0 }, 'n').data;
  if (inputDefaults) data.inputDefaults = { ...data.inputDefaults, ...inputDefaults };
  return data;
};

const editApi = { setParam: () => {}, setInputDefault: () => {} };
const renderNode = (ui: ReactElement) =>
  render(<NodeEditContext.Provider value={editApi}>{ui}</NodeEditContext.Provider>);

afterEach(cleanup);

describe('color dot on color nodes (issue #139)', () => {
  it('renders a filled circle with the node’s color', () => {
    const { container } = renderNode(
      <GhostNode data={dataFor('CombineColorRGB', { red: 1, green: 0, blue: 0, alpha: 0.5 })} />,
    );
    const dot = container.querySelector('.vnode__color-dot') as HTMLElement | null;
    expect(dot).not.toBeNull();
    expect(dot!.style.background).toBe('rgba(255, 0, 0, 0.5)');
  });

  it('shows no dot on a non-color node', () => {
    const { container } = renderNode(<GhostNode data={dataFor('PointCircle')} />);
    expect(container.querySelector('.vnode__color-dot')).toBeNull();
  });
});
