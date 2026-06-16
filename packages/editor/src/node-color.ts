import { combineColor, type Color, type ColorMode } from '@vector-nodes/runtime';

import type { FlowNodeData } from './flow';

/** Channel inputs feeding each Combine color node, by space (issue #139). */
const COMBINE_NODES: Record<string, { mode: ColorMode; channels: [string, string, string] }> = {
  CombineColorRGB: { mode: 'RGB', channels: ['red', 'green', 'blue'] },
  CombineColorHSL: { mode: 'HSL', channels: ['hue', 'saturation', 'lightness'] },
  CombineColorHSV: { mode: 'HSV', channels: ['hue', 'saturation', 'value'] },
};

/** A node's input value for `name`: its inline default, else the socket default, else 0. */
function inputValue(data: FlowNodeData, name: string): number {
  const override = data.inputDefaults[name];
  if (override !== undefined) return Number(override);
  const socket = data.inputs.find((s) => s.name === name);
  return Number(socket?.default ?? 0);
}

/**
 * The RGBA color a node produces from its current inline settings (issue #139),
 * for the swatch shown on its card: the three Combine color nodes (computed from
 * their channel inputs) and the Color constant. Returns `null` for other nodes.
 * Reads the node's own input/param values, so a swatch reflects wired inputs only
 * once they're typed in — connections aren't evaluated here.
 */
export function nodeColor(data: FlowNodeData): Color | null {
  const spec = COMBINE_NODES[data.nodeType];
  if (spec) {
    const [a, b, c] = spec.channels;
    return combineColor(
      spec.mode,
      inputValue(data, a),
      inputValue(data, b),
      inputValue(data, c),
      inputValue(data, 'alpha'),
    );
  }
  if (data.nodeType === 'ConstColor' && Array.isArray(data.params.value)) {
    return data.params.value as Color;
  }
  return null;
}

/** A CSS `rgba(...)` string for a {@link Color} (components in `[0, 1]`). */
export function colorToCss([r, g, b, a]: Color): string {
  const to255 = (c: number) => Math.round(Math.min(Math.max(c, 0), 1) * 255);
  return `rgba(${to255(r)}, ${to255(g)}, ${to255(b)}, ${a})`;
}
