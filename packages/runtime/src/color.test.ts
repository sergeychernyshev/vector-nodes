import { describe, expect, it } from 'vitest';

import { combineColor, hslToRgb, hsvToRgb } from './color';

/** Compare RGB triples within floating-point tolerance. */
function expectClose(actual: number[], expected: number[]): void {
  expect(actual).toHaveLength(expected.length);
  for (let i = 0; i < expected.length; i++) expect(actual[i]).toBeCloseTo(expected[i]!, 6);
}

describe('hslToRgb (issue #139)', () => {
  it('maps the primary hues at full saturation', () => {
    expectClose(hslToRgb(0, 1, 0.5), [1, 0, 0]); // red
    expectClose(hslToRgb(1 / 3, 1, 0.5), [0, 1, 0]); // green
    expectClose(hslToRgb(2 / 3, 1, 0.5), [0, 0, 1]); // blue
  });

  it('is achromatic when saturation is zero', () => {
    expectClose(hslToRgb(0.42, 0, 0.25), [0.25, 0.25, 0.25]);
  });

  it('reaches black and white at the lightness extremes', () => {
    expectClose(hslToRgb(0.5, 1, 0), [0, 0, 0]);
    expectClose(hslToRgb(0.5, 1, 1), [1, 1, 1]);
  });

  it('wraps hue values outside [0, 1)', () => {
    expectClose(hslToRgb(1, 1, 0.5), hslToRgb(0, 1, 0.5));
  });
});

describe('hsvToRgb (issue #139)', () => {
  it('maps the primary hues at full saturation and value', () => {
    expectClose(hsvToRgb(0, 1, 1), [1, 0, 0]);
    expectClose(hsvToRgb(1 / 3, 1, 1), [0, 1, 0]);
    expectClose(hsvToRgb(2 / 3, 1, 1), [0, 0, 1]);
  });

  it('value scales overall brightness; zero is black', () => {
    expectClose(hsvToRgb(0, 1, 0), [0, 0, 0]);
    expectClose(hsvToRgb(0, 0, 0.6), [0.6, 0.6, 0.6]); // unsaturated → gray
  });
});

describe('combineColor (issue #139)', () => {
  it('passes RGB channels through and appends alpha', () => {
    expect(combineColor('RGB', 0.1, 0.2, 0.3, 0.4)).toEqual([0.1, 0.2, 0.3, 0.4]);
  });

  it('defaults alpha to opaque', () => {
    expect(combineColor('RGB', 1, 1, 1)).toEqual([1, 1, 1, 1]);
  });

  it('converts HSL and HSV into RGBA', () => {
    const hsl = combineColor('HSL', 1 / 3, 1, 0.5, 0.5);
    expectClose(hsl, [0, 1, 0, 0.5]);
    const hsv = combineColor('HSV', 2 / 3, 1, 1, 0.25);
    expectClose(hsv, [0, 0, 1, 0.25]);
  });

  it('falls back to RGB for an unknown mode', () => {
    expect(combineColor('???' as 'RGB', 0.2, 0.4, 0.6)).toEqual([0.2, 0.4, 0.6, 1]);
  });
});
