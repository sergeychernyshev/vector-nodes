// @vitest-environment jsdom
import { createBasicRegistry } from '@vector-nodes/core';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { createFlowNode } from './flow';
import { isFormulaPreviewable, MathFormula } from './math-formula';
import { nodeIcon } from './node-icon';

const registry = createBasicRegistry();
const dataFor = (type: string, inputDefaults?: Record<string, unknown>) => {
  const data = createFlowNode(registry.require(type), { x: 0, y: 0 }, 'n').data;
  if (inputDefaults) data.inputDefaults = { ...data.inputDefaults, ...inputDefaults };
  return data;
};

afterEach(cleanup);

describe('isFormulaPreviewable (issue #163)', () => {
  it('is true for math ops and Pi, false for geometry/const nodes', () => {
    expect(isFormulaPreviewable(dataFor('MathSine'))).toBe(true);
    expect(isFormulaPreviewable(dataFor('Pi'))).toBe(true);
    expect(isFormulaPreviewable(dataFor('PointCircle'))).toBe(false);
    expect(isFormulaPreviewable(dataFor('ConstFloat'))).toBe(false);
  });
});

describe('MathFormula (issue #163)', () => {
  it('renders the function, its input, and the computed result', () => {
    const { container } = render(
      <MathFormula data={dataFor('MathSine', { angle: 2.5 })} connectedInputs={undefined} />,
    );
    const text = container.textContent ?? '';
    expect(text).toContain('sine');
    expect(text).toContain('2.5');
    // sin(2.5) ≈ 0.5985 → rounded to 4 decimals.
    expect(text).toContain('0.5985');
    expect(container.querySelector('math')).not.toBeNull();
  });

  it('prefers the value flowing into a connected input over the inline default', () => {
    const { container } = render(
      <MathFormula
        data={dataFor('MathSine', { angle: 0 })}
        connectedInputs={{ angle: Math.PI / 2 }}
      />,
    );
    expect(container.textContent).toContain('1');
  });

  it('renders Pi as π = 3.1416', () => {
    const { container } = render(<MathFormula data={dataFor('Pi')} connectedInputs={undefined} />);
    const text = container.textContent ?? '';
    expect(text).toContain('π');
    expect(text).toContain('3.1416');
  });

  it('renders a binary op with its operator symbol', () => {
    const { container } = render(
      <MathFormula data={dataFor('MathAdd', { a: 2, b: 3 })} connectedInputs={undefined} />,
    );
    const text = container.textContent ?? '';
    expect(text).toContain('+');
    expect(text).toContain('5');
  });
});

describe('math node icons (issue #163)', () => {
  it('shows the operator symbol or function name, and π for Pi', () => {
    expect(nodeIcon(dataFor('MathAdd'))).toEqual({ kind: 'text', text: '+' });
    expect(nodeIcon(dataFor('MathSine'))).toEqual({ kind: 'text', text: 'sine' });
    expect(nodeIcon(dataFor('Pi'))).toEqual({ kind: 'text', text: 'π' });
  });
});
