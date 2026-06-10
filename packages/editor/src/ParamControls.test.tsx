// @vitest-environment jsdom
import type { ParamDefinition } from '@vector-nodes/core';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { NodeEditContext, type NodeEditApi } from './NodeEditContext';
import type { FlowSocket } from './flow';
import { InputDefaultField, isEditableInput, ParamControls } from './ParamControls';

afterEach(cleanup);

function renderControls(paramDefs: ParamDefinition[], values: Record<string, unknown>) {
  const setParam = vi.fn();
  const api: NodeEditApi = { setParam, setInputDefault: vi.fn() };
  const utils = render(
    <NodeEditContext.Provider value={api}>
      <ParamControls nodeId="n1" paramDefs={paramDefs} values={values} />
    </NodeEditContext.Provider>,
  );
  return { setParam, ...utils };
}

function renderInputDefault(socket: FlowSocket, value: unknown, connected: boolean) {
  const setInputDefault = vi.fn();
  const api: NodeEditApi = { setParam: vi.fn(), setInputDefault };
  const utils = render(
    <NodeEditContext.Provider value={api}>
      <InputDefaultField nodeId="n1" socket={socket} value={value} connected={connected} />
    </NodeEditContext.Provider>,
  );
  return { setInputDefault, ...utils };
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

  it('scrubs and types the opacity (alpha) of a color param', () => {
    const { setParam, getByLabelText } = renderControls(
      [{ name: 'tint', type: 'Color', default: [1, 0, 0, 1] }],
      { tint: [1, 0, 0, 1] },
    );
    // Range scrubber maps 0..1 to the same alpha value.
    fireEvent.change(getByLabelText('opacity'), { target: { value: '0.5' } });
    expect(setParam).toHaveBeenCalledWith('n1', 'tint', [1, 0, 0, 0.5]);
    // Number field edits the same alpha.
    fireEvent.change(getByLabelText('opacity value'), {
      target: { value: '0.25' },
    });
    expect(setParam).toHaveBeenLastCalledWith('n1', 'tint', [1, 0, 0, 0.25]);
  });

  it('renders a dropdown for params with options', () => {
    const { setParam, container } = renderControls(
      [
        {
          name: 'operation',
          type: 'String',
          default: 'add',
          options: ['add', 'cross'],
        },
      ],
      { operation: 'add' },
    );
    const select = container.querySelector('select')!;
    expect(select).toBeTruthy();
    expect(select.querySelectorAll('option')).toHaveLength(2);
    fireEvent.change(select, { target: { value: 'cross' } });
    expect(setParam).toHaveBeenCalledWith('n1', 'operation', 'cross');
  });

  it('renders nothing when there are no params', () => {
    const { container } = renderControls([], {});
    expect(container.querySelector('.vnode__params')).toBeNull();
  });
});

describe('isEditableInput', () => {
  it('accepts scalar value types and rejects arrays and Geometry', () => {
    expect(isEditableInput({ name: 'offset', type: 'Vector', isArray: false })).toBe(true);
    expect(isEditableInput({ name: 'r', type: 'Float', isArray: false })).toBe(true);
    expect(isEditableInput({ name: 'geometry', type: 'Geometry', isArray: false })).toBe(false);
    expect(isEditableInput({ name: 'points', type: 'Vector', isArray: true })).toBe(false);
  });
});

describe('InputDefaultField', () => {
  const offset: FlowSocket = { name: 'offset', type: 'Vector', isArray: false };

  it('edits an unconnected input default', () => {
    const { setInputDefault, getByLabelText } = renderInputDefault(offset, [0, 0, 0], false);
    fireEvent.change(getByLabelText('y'), { target: { value: '5' } });
    expect(setInputDefault).toHaveBeenCalledWith('n1', 'offset', [0, 5, 0]);
  });

  it('disables the control when the input is connected', () => {
    const { container } = renderInputDefault(offset, [0, 0, 0], true);
    const inputs = container.querySelectorAll('input');
    expect(inputs.length).toBeGreaterThan(0);
    inputs.forEach((input) => expect((input as HTMLInputElement).disabled).toBe(true));
    expect(container.querySelector('.vnode__input-default--connected')).not.toBeNull();
  });
});
