import type { Color } from './types.js';

/**
 * Color construction from channel components (issue #139).
 *
 * Every component is normalized to `[0, 1]` — including hue, which is expressed
 * in turns (`0` = 0°, `1` = 360°) so it shares the same scale as the other
 * channels and the runtime's other normalized values. The `Combine Color` node
 * picks the input color space with a `mode` parameter and always emits an RGBA
 * {@link Color}, so downstream consumers only ever see RGB.
 */

/** A supported input color space for {@link combineColor}. */
export type ColorMode = 'RGB' | 'HSL' | 'HSV';

/** Wrap `t` into `[0, 1)` so hue math is robust to out-of-range input. */
function wrap01(t: number): number {
  const w = t - Math.floor(t);
  return w < 0 ? w + 1 : w;
}

/**
 * Convert HSL (hue in turns, saturation and lightness in `[0, 1]`) to RGB, each
 * channel in `[0, 1]`. Matches the standard CSS/Blender HSL definition.
 */
export function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) return [l, l, l]; // achromatic
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [hueToChannel(p, q, h + 1 / 3), hueToChannel(p, q, h), hueToChannel(p, q, h - 1 / 3)];
}

function hueToChannel(p: number, q: number, t: number): number {
  t = wrap01(t);
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
}

/**
 * Convert HSV/HSB (hue in turns, saturation and value in `[0, 1]`) to RGB, each
 * channel in `[0, 1]`.
 */
export function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  const i = Math.floor(wrap01(h) * 6);
  const f = wrap01(h) * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  switch (i % 6) {
    case 0:
      return [v, t, p];
    case 1:
      return [q, v, p];
    case 2:
      return [p, v, t];
    case 3:
      return [p, q, v];
    case 4:
      return [t, p, v];
    default:
      return [v, p, q];
  }
}

/**
 * Build an RGBA {@link Color} from three channel components and an alpha,
 * interpreting the channels in the color space named by `mode`. Hue (for `HSL`
 * and `HSV`) is in turns; every other component is in `[0, 1]`. Unknown modes
 * fall back to `RGB`.
 */
export function combineColor(
  mode: ColorMode,
  c1: number,
  c2: number,
  c3: number,
  alpha = 1,
): Color {
  const [r, g, b] =
    mode === 'HSL' ? hslToRgb(c1, c2, c3) : mode === 'HSV' ? hsvToRgb(c1, c2, c3) : [c1, c2, c3];
  return [r, g, b, alpha];
}
