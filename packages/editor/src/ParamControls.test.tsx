// @vitest-environment jsdom
import type { ParamDefinition } from '@vector-nodes/core';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { NodeEditContext, type NodeEditApi } from './NodeEditContext';
import { ParamControls } from './ParamControls';

afterEach(cleanup);

function renderControls(paramDefs: ParamDefinition[], values: Record<string, unknown>) {
  const setParam = vi.fn();
  const api: NodeEditApi = { setParam };
  const utils = render(
    <NodeEditContext.Provider value={api}>
      <ParamControls nodeId="n1" paramDefs={paramDefs} values={values} />
    </NodeEditContext.Provider>,
  );
  return { setParam, ...utils };
}

describe('ParamControls', () => {
  it('edits a number param', () => {
    const { setParam, container } = renderControls(
      [{ name: 'radius', type: 'Float', default: 1 }],
      { radius: 1 },
    );
    const input = container.querySelector('input[type="number"]')!;
    fireEvent.change(input, { target: { value: '2.5' } });
    expect(setParam).toHaveBeenCalledWith('n1', 'radius', 2.5);
  });

  it('rounds integer params', () => {
    const { setParam, container } = renderControls(
      [{ name: 'count', type: 'Integer', default: 4 }],
      { count: 4 },
    );
    fireEvent.change(container.querySelector('input[type="number"]')!, {
      target: { value: '7.8' },
    });
    expect(setParam).toHaveBeenCalledWith('n1', 'count', 8);
  });

  it('toggles a boolean param and shows its value', () => {
    const { setParam, container, getByText } = renderControls(
      [{ name: 'flag', type: 'Boolean', default: false }],
      { flag: false },
    );
    expect(getByText('false')).toBeTruthy();
    fireEvent.click(container.querySelector('input[type="checkbox"]')!);
    expect(setParam).toHaveBeenCalledWith('n1', 'flag', true);
  });

  it('shows "true" when a boolean param is on', () => {
    const { getByText } = renderControls([{ name: 'flag', type: 'Boolean', default: true }], {
      flag: true,
    });
    expect(getByText('true')).toBeTruthy();
  });

  it('edits a string param', () => {
    const { setParam, getByDisplayValue } = renderControls(
      [{ name: 'mode', type: 'String', default: 'grid' }],
      { mode: 'grid' },
    );
    fireEvent.change(getByDisplayValue('grid'), { target: { value: 'circle' } });
    expect(setParam).toHaveBeenCalledWith('n1', 'mode', 'circle');
  });

  it('edits one axis of a vector param', () => {
    const { setParam, getByLabelText } = renderControls(
      [{ name: 'offset', type: 'Vector', default: [0, 0, 0] }],
      { offset: [0, 0, 0] },
    );
    fireEvent.change(getByLabelText('y'), { target: { value: '5' } });
    expect(setParam).toHaveBeenCalledWith('n1', 'offset', [0, 5, 0]);
  });

  it('scrubs and types the alpha channel of a color param', () => {
    const { setParam, getByLabelText } = renderControls(
      [{ name: 'tint', type: 'Color', default: [1, 0, 0, 1] }],
      { tint: [1, 0, 0, 1] },
    );
    // Range scrubber maps 0..1 to the same alpha value.
    fireEvent.change(getByLabelText('alpha'), { target: { value: '0.5' } });
    expect(setParam).toHaveBeenCalledWith('n1', 'tint', [1, 0, 0, 0.5]);
    // Number field edits the same alpha.
    fireEvent.change(getByLabelText('alpha value'), { target: { value: '0.25' } });
    expect(setParam).toHaveBeenLastCalledWith('n1', 'tint', [1, 0, 0, 0.25]);
  });

  it('renders nothing when there are no params', () => {
    const { container } = renderControls([], {});
    expect(container.querySelector('.vnode__params')).toBeNull();
  });
});
