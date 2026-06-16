import { MATH_OP_BY_TYPE, PI_NODE_TYPE, type MathOp } from '@vector-nodes/core';
import { Fragment, type ReactNode } from 'react';

import type { FlowNodeData } from './flow';

/**
 * The per-node preview for Math & Trig nodes (issue #163): a MathML formula of
 * the operation applied to its current inputs, with the resulting value — e.g.
 * `sine(2.5) = 0.599`. The result is computed here from the shared MATH_OPS
 * `evaluate` (the same function the engine runs), using the live values flowing
 * into connected inputs and the inline defaults for the rest, so no extra round
 * trip through the preview worker is needed.
 */

/** Whether a node renders a formula preview rather than a geometry preview. */
export function isFormulaPreviewable(data: FlowNodeData): boolean {
  return data.nodeType === PI_NODE_TYPE || MATH_OP_BY_TYPE.has(data.nodeType);
}

/** Round to at most 4 significant decimals, dropping trailing zeros. */
function formatValue(n: number): string {
  if (!Number.isFinite(n)) return n > 0 ? '∞' : Number.isNaN(n) ? 'NaN' : '−∞';
  if (Number.isInteger(n)) return String(n);
  return parseFloat(n.toFixed(4)).toString();
}

/**
 * The effective value of a math input socket: the value its connection supplies
 * (surfaced via the per-node preview), else the node's inline default, else the
 * socket's definition default, else 0.
 */
function inputValue(
  data: FlowNodeData,
  name: string,
  connected: Record<string, unknown> | undefined,
): number {
  const live = connected?.[name];
  if (typeof live === 'number') return live;
  const inline = data.inputDefaults[name];
  if (typeof inline === 'number') return inline;
  const socket = data.inputs.find((s) => s.name === name);
  if (typeof socket?.default === 'number') return socket.default;
  return 0;
}

/** A negative-aware `<mn>` (MathML wants the minus sign inside the number). */
function num(value: number): ReactNode {
  return <mn>{formatValue(value)}</mn>;
}

/** The left-hand side of the equation (everything before `=`) for an op. */
function lhs(op: MathOp, args: readonly number[]): ReactNode {
  if (op.notation.kind === 'infix') {
    return (
      <>
        {num(args[0] ?? 0)}
        <mo>{op.notation.symbol}</mo>
        {num(args[1] ?? 0)}
      </>
    );
  }
  if (op.notation.kind === 'power') {
    return (
      <msup>
        {num(args[0] ?? 0)}
        {num(args[1] ?? 0)}
      </msup>
    );
  }
  // Function notation: name(arg0, arg1, …).
  return (
    <>
      <mi>{op.notation.name}</mi>
      <mo>(</mo>
      {args.map((arg, i) => (
        <Fragment key={i}>
          {i > 0 && <mo>,</mo>}
          {num(arg)}
        </Fragment>
      ))}
      <mo>)</mo>
    </>
  );
}

/**
 * The MathML formula box shown in a Math & Trig node's preview. Returns `null`
 * for non-math nodes so callers can fall through to other preview kinds.
 */
export function MathFormula({
  data,
  connectedInputs,
}: {
  data: FlowNodeData;
  /** Values flowing into this node's connected inputs (preview `inputs[id]`). */
  connectedInputs: Record<string, unknown> | undefined;
}): ReactNode {
  if (data.nodeType === PI_NODE_TYPE) {
    return (
      <math className="vnode__formula">
        <mrow>
          <mi>π</mi>
          <mo>=</mo>
          {num(Math.PI)}
        </mrow>
      </math>
    );
  }
  const op = MATH_OP_BY_TYPE.get(data.nodeType);
  if (!op) return null;
  const args = op.inputs.map((input) => inputValue(data, input.name, connectedInputs));
  const result = op.evaluate(args);
  return (
    <math className="vnode__formula">
      <mrow>
        {lhs(op, args)}
        <mo>=</mo>
        {num(result)}
      </mrow>
    </math>
  );
}
