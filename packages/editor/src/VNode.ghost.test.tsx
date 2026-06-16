// @vitest-environment jsdom
import { createBasicRegistry } from '@vector-nodes/core';
import { cleanup, render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { createFlowNode } from './flow';
import { NodeEditContext } from './NodeEditContext';
import { previewNodeGeometry } from './preview';
import { GhostNode } from './VNode';

const registry = createBasicRegistry();
const dataFor = (type: string) => createFlowNode(registry.require(type), { x: 0, y: 0 }, 'n').data;

const editApi = { setParam: () => {}, setInputDefault: () => {} };
const renderGhost = (ui: ReactElement) =>
  render(<NodeEditContext.Provider value={editApi}>{ui}</NodeEditContext.Provider>);

afterEach(cleanup);

describe('GhostNode preview (issue #141)', () => {
  it('renders a live geometry preview when geometry is supplied', () => {
    const geometry = previewNodeGeometry('PointCircle', 'geometry', { radius: 1, count: 6 });
    const { container } = renderGhost(
      <GhostNode data={dataFor('PointCircle')} geometry={geometry} />,
    );
    // The preview box is shown with an SVG render, and no toggle button on the ghost.
    expect(container.querySelector('.vnode__preview')).not.toBeNull();
    expect(container.querySelector('svg')).not.toBeNull();
    expect(container.querySelector('.vnode__preview-toggle')).toBeNull();
  });

  it('shows no preview box when no geometry is supplied', () => {
    const { container } = renderGhost(<GhostNode data={dataFor('PointCircle')} />);
    expect(container.querySelector('.vnode__preview')).toBeNull();
  });
});
