import { describe, expect, it } from 'vitest';

import { BASIC_NODE_DEFINITIONS } from './nodes.js';
import {
  isMathOpType,
  MATH_OPS,
  MATH_OP_BY_TYPE,
  MATH_TRIG_CATEGORY,
  PI_NODE_TYPE,
} from './math-ops.js';

describe('MATH_OPS spec (issue #163)', () => {
  it('evaluates each operation from its named inputs', () => {
    const evalOp = (type: string, args: number[]) => MATH_OP_BY_TYPE.get(type)!.evaluate(args);
    expect(evalOp('MathAdd', [2, 3])).toBe(5);
    expect(evalOp('MathSubtract', [2, 3])).toBe(-1);
    expect(evalOp('MathMultiply', [2, 3])).toBe(6);
    expect(evalOp('MathDivide', [6, 3])).toBe(2);
    expect(evalOp('MathPower', [2, 10])).toBe(1024);
    expect(evalOp('MathSine', [Math.PI / 2])).toBeCloseTo(1, 12);
    expect(evalOp('MathSqrt', [9])).toBe(3);
    expect(evalOp('MathSign', [-9])).toBe(-1);
  });

  it('uses named inputs matching each operation arity', () => {
    expect(MATH_OP_BY_TYPE.get('MathSine')!.inputs.map((i) => i.name)).toEqual(['angle']);
    expect(MATH_OP_BY_TYPE.get('MathPower')!.inputs.map((i) => i.name)).toEqual([
      'base',
      'exponent',
    ]);
    expect(MATH_OP_BY_TYPE.get('MathAtan2')!.inputs.map((i) => i.name)).toEqual(['y', 'x']);
  });

  it('isMathOpType recognizes split ops but not Pi or other nodes', () => {
    expect(isMathOpType('MathSine')).toBe(true);
    expect(isMathOpType(PI_NODE_TYPE)).toBe(false);
    expect(isMathOpType('PointCircle')).toBe(false);
  });
});

describe('Math & Trig node definitions', () => {
  it('registers one Float node per op plus Pi under the Math & Trig category', () => {
    const defs = new Map(BASIC_NODE_DEFINITIONS.map((d) => [d.type, d]));
    for (const op of MATH_OPS) {
      const def = defs.get(op.type);
      expect(def, op.type).toBeDefined();
      expect(def!.category).toBe(MATH_TRIG_CATEGORY);
      expect(def!.inputs.map((i) => i.name)).toEqual(op.inputs.map((i) => i.name));
      expect(def!.inputs.every((i) => i.type === 'Float')).toBe(true);
      expect(def!.outputs).toEqual([{ name: 'value', type: 'Float' }]);
    }
    const pi = defs.get(PI_NODE_TYPE)!;
    expect(pi.category).toBe(MATH_TRIG_CATEGORY);
    expect(pi.inputs).toEqual([]);
    expect(pi.outputs).toEqual([{ name: 'value', type: 'Float' }]);
  });

  it('no longer defines the monolithic MathFloat node', () => {
    expect(BASIC_NODE_DEFINITIONS.some((d) => d.type === 'MathFloat')).toBe(false);
  });
});
