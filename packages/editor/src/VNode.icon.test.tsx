// @vitest-environment jsdom
import { createBasicRegistry } from '@vector-nodes/core';
import { cleanup, render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { createFlowNode } from './flow';
import { NodeEditContext } from './NodeEditContext';
import { GhostNode } from './VNode';

const registry = createBasicRegistry();
const dataFor = (type: string) => createFlowNode(registry.require(type), { x: 0, y: 0 }, 'n').data;

const editApi = { setParam: () => {}, setInputDefault: () => {} };
const renderNode = (ui: ReactElement) =>
  render(<NodeEditContext.Provider value={editApi}>{ui}</NodeEditContext.Provider>);

afterEach(cleanup);

describe('NodeIcon (issue #142)', () => {
  it('renders a 2D geometry render for a geometry node', () => {
    const { container } = renderNode(<GhostNode data={dataFor('PointCircle')} />);
    const icon = container.querySelector('.vnode__icon--geo');
    expect(icon).not.toBeNull();
    expect(icon!.querySelector('svg')).not.toBeNull();
  });

  it('renders a value/label badge for a non-geometry node', () => {
    const { container } = renderNode(<GhostNode data={dataFor('ConstFloat')} />);
    expect(container.querySelector('.vnode__icon--geo')).toBeNull();
    expect(container.querySelector('.vnode__icon-text')).not.toBeNull();
  });
});
