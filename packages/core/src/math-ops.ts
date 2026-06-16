/**
 * Single-operation math & trig nodes (issue #163).
 *
 * The monolithic `MathFloat` node was split into one node per operation, each
 * with named, correctly-arity'd inputs (trig takes a single `angle`, `Power`
 * takes `base`/`exponent`, and so on). This module is the single source of truth
 * for those operations: their input names/defaults, how they read as a formula
 * (for the per-node MathML preview), how the engine evaluates them, and how
 * codegen emits them. The engine and codegen layers iterate {@link MATH_OPS}
 * rather than maintaining parallel switch statements.
 */

/** How a math op reads as a formula in the per-node preview. */
export type MathNotation =
  /** `name(arg0, arg1, …)`, e.g. `sine(2.5)`. */
  | { readonly kind: 'fn'; readonly name: string }
  /** `arg0 symbol arg1`, e.g. `a + b`. */
  | { readonly kind: 'infix'; readonly symbol: string }
  /** `base` raised to `exponent`, rendered as a superscript. */
  | { readonly kind: 'power' };

/** One input socket of a math op: a `Float` with an optional default. */
export interface MathOpInput {
  readonly name: string;
  /** Inline default when the socket is unconnected (0 when omitted). */
  readonly default?: number;
}

/** A single-operation math/trig node definition. */
export interface MathOp {
  /** Node type, e.g. `MathSine`. */
  readonly type: string;
  /** Display label, e.g. `Sine`. */
  readonly label: string;
  /** Input sockets, in evaluation/display order. */
  readonly inputs: readonly MathOpInput[];
  /** How the op reads as a formula. */
  readonly notation: MathNotation;
  /** Numeric evaluation, given the input values in `inputs` order. */
  readonly evaluate: (args: readonly number[]) => number;
  /** Codegen: a JS expression for the `value` output, given input expressions. */
  readonly expr: (args: readonly string[]) => string;
}

/** Category every split math/trig node (and `Pi`) lives under in the palette. */
export const MATH_TRIG_CATEGORY = 'Math & Trig';

export const MATH_OPS: readonly MathOp[] = [
  // Binary arithmetic.
  {
    type: 'MathAdd',
    label: 'Add',
    inputs: [{ name: 'a' }, { name: 'b' }],
    notation: { kind: 'infix', symbol: '+' },
    evaluate: ([a = 0, b = 0]) => a + b,
    expr: ([a, b]) => `${a} + ${b}`,
  },
  {
    type: 'MathSubtract',
    label: 'Subtract',
    inputs: [{ name: 'a' }, { name: 'b' }],
    notation: { kind: 'infix', symbol: '−' },
    evaluate: ([a = 0, b = 0]) => a - b,
    expr: ([a, b]) => `${a} - ${b}`,
  },
  {
    type: 'MathMultiply',
    label: 'Multiply',
    inputs: [
      { name: 'a', default: 1 },
      { name: 'b', default: 1 },
    ],
    notation: { kind: 'infix', symbol: '×' },
    evaluate: ([a = 0, b = 0]) => a * b,
    expr: ([a, b]) => `${a} * ${b}`,
  },
  {
    type: 'MathDivide',
    label: 'Divide',
    inputs: [{ name: 'a' }, { name: 'b', default: 1 }],
    notation: { kind: 'infix', symbol: '÷' },
    evaluate: ([a = 0, b = 0]) => a / b,
    expr: ([a, b]) => `${a} / ${b}`,
  },
  {
    type: 'MathModulo',
    label: 'Modulo',
    inputs: [{ name: 'a' }, { name: 'b', default: 1 }],
    notation: { kind: 'infix', symbol: 'mod' },
    evaluate: ([a = 0, b = 0]) => a % b,
    expr: ([a, b]) => `${a} % ${b}`,
  },
  // Binary functions.
  {
    type: 'MathMin',
    label: 'Minimum',
    inputs: [{ name: 'a' }, { name: 'b' }],
    notation: { kind: 'fn', name: 'min' },
    evaluate: ([a = 0, b = 0]) => Math.min(a, b),
    expr: ([a, b]) => `Math.min(${a}, ${b})`,
  },
  {
    type: 'MathMax',
    label: 'Maximum',
    inputs: [{ name: 'a' }, { name: 'b' }],
    notation: { kind: 'fn', name: 'max' },
    evaluate: ([a = 0, b = 0]) => Math.max(a, b),
    expr: ([a, b]) => `Math.max(${a}, ${b})`,
  },
  {
    type: 'MathPower',
    label: 'Power',
    inputs: [
      { name: 'base', default: 2 },
      { name: 'exponent', default: 2 },
    ],
    notation: { kind: 'power' },
    evaluate: ([base = 0, exponent = 0]) => Math.pow(base, exponent),
    expr: ([base, exponent]) => `Math.pow(${base}, ${exponent})`,
  },
  {
    type: 'MathAtan2',
    label: 'Arctangent2',
    inputs: [{ name: 'y' }, { name: 'x', default: 1 }],
    notation: { kind: 'fn', name: 'atan2' },
    evaluate: ([y = 0, x = 0]) => Math.atan2(y, x),
    expr: ([y, x]) => `Math.atan2(${y}, ${x})`,
  },
  // Trigonometry (single `angle` in radians).
  {
    type: 'MathSine',
    label: 'Sine',
    inputs: [{ name: 'angle' }],
    notation: { kind: 'fn', name: 'sine' },
    evaluate: ([angle = 0]) => Math.sin(angle),
    expr: ([angle]) => `Math.sin(${angle})`,
  },
  {
    type: 'MathCosine',
    label: 'Cosine',
    inputs: [{ name: 'angle' }],
    notation: { kind: 'fn', name: 'cosine' },
    evaluate: ([angle = 0]) => Math.cos(angle),
    expr: ([angle]) => `Math.cos(${angle})`,
  },
  {
    type: 'MathTangent',
    label: 'Tangent',
    inputs: [{ name: 'angle' }],
    notation: { kind: 'fn', name: 'tangent' },
    evaluate: ([angle = 0]) => Math.tan(angle),
    expr: ([angle]) => `Math.tan(${angle})`,
  },
  // Unary functions.
  {
    type: 'MathSqrt',
    label: 'Square Root',
    inputs: [{ name: 'value', default: 1 }],
    notation: { kind: 'fn', name: 'sqrt' },
    evaluate: ([value = 0]) => Math.sqrt(value),
    expr: ([value]) => `Math.sqrt(${value})`,
  },
  {
    type: 'MathAbsolute',
    label: 'Absolute',
    inputs: [{ name: 'value' }],
    notation: { kind: 'fn', name: 'abs' },
    evaluate: ([value = 0]) => Math.abs(value),
    expr: ([value]) => `Math.abs(${value})`,
  },
  {
    type: 'MathFloor',
    label: 'Floor',
    inputs: [{ name: 'value' }],
    notation: { kind: 'fn', name: 'floor' },
    evaluate: ([value = 0]) => Math.floor(value),
    expr: ([value]) => `Math.floor(${value})`,
  },
  {
    type: 'MathCeil',
    label: 'Ceiling',
    inputs: [{ name: 'value' }],
    notation: { kind: 'fn', name: 'ceil' },
    evaluate: ([value = 0]) => Math.ceil(value),
    expr: ([value]) => `Math.ceil(${value})`,
  },
  {
    type: 'MathRound',
    label: 'Round',
    inputs: [{ name: 'value' }],
    notation: { kind: 'fn', name: 'round' },
    evaluate: ([value = 0]) => Math.round(value),
    expr: ([value]) => `Math.round(${value})`,
  },
  {
    type: 'MathLog',
    label: 'Natural Log',
    inputs: [{ name: 'value', default: 1 }],
    notation: { kind: 'fn', name: 'ln' },
    evaluate: ([value = 0]) => Math.log(value),
    expr: ([value]) => `Math.log(${value})`,
  },
  {
    type: 'MathExp',
    label: 'Exponential',
    inputs: [{ name: 'value' }],
    notation: { kind: 'fn', name: 'exp' },
    evaluate: ([value = 0]) => Math.exp(value),
    expr: ([value]) => `Math.exp(${value})`,
  },
  {
    type: 'MathSign',
    label: 'Sign',
    inputs: [{ name: 'value' }],
    notation: { kind: 'fn', name: 'sign' },
    evaluate: ([value = 0]) => Math.sign(value),
    expr: ([value]) => `Math.sign(${value})`,
  },
];

/** Lookup from node type to its {@link MathOp} (e.g. for the formula preview). */
export const MATH_OP_BY_TYPE: ReadonlyMap<string, MathOp> = new Map(
  MATH_OPS.map((op) => [op.type, op]),
);

/** Whether `type` is one of the split math/trig operation nodes. */
export function isMathOpType(type: string): boolean {
  return MATH_OP_BY_TYPE.has(type);
}

/** The `Pi` constant node's type (the π constant, issue #163). */
export const PI_NODE_TYPE = 'Pi';
