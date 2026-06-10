import type { VNodeFlowNode } from './flow';

/** A 3-component vector value, as stored in params. */
export type Vec3 = [number, number, number];
/** An RGBA color value, as stored in params. */
export type Rgba = [number, number, number, number];

/** Return a new nodes array with `nodeId`'s `name` param set to `value`. */
export function setNodeParam(
  nodes: VNodeFlowNode[],
  nodeId: string,
  name: string,
  value: unknown,
): VNodeFlowNode[] {
  return nodes.map((node) =>
    node.id === nodeId
      ? {
          ...node,
          data: { ...node.data, params: { ...node.data.params, [name]: value } },
        }
      : node,
  );
}

/** Return a new nodes array with `nodeId`'s unconnected-input `name` set to `value`. */
export function setNodeInputDefault(
  nodes: VNodeFlowNode[],
  nodeId: string,
  name: string,
  value: unknown,
): VNodeFlowNode[] {
  return nodes.map((node) =>
    node.id === nodeId
      ? {
          ...node,
          data: {
            ...node.data,
            inputDefaults: { ...node.data.inputDefaults, [name]: value },
          },
        }
      : node,
  );
}

/** Coerce a param value to a number, falling back to 0. */
export function asNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

/** Coerce a param value to a 3-vector, falling back to the origin. */
export function asVec3(value: unknown): Vec3 {
  if (Array.isArray(value) && value.length >= 3) {
    return [asNumber(value[0]), asNumber(value[1]), asNumber(value[2])];
  }
  return [0, 0, 0];
}

/** Coerce a param value to RGBA, falling back to opaque black. */
export function asRgba(value: unknown): Rgba {
  if (Array.isArray(value) && value.length >= 4) {
    return [asNumber(value[0]), asNumber(value[1]), asNumber(value[2]), asNumber(value[3])];
  }
  return [0, 0, 0, 1];
}

function channelToHex(f: number): string {
  const v = Math.max(0, Math.min(255, Math.round(f * 255)));
  return v.toString(16).padStart(2, '0');
}

/** Convert RGB floats (0..1) to a `#rrggbb` hex string for `<input type="color">`. */
export function rgbToHex(rgb: readonly number[]): string {
  return `#${channelToHex(rgb[0] ?? 0)}${channelToHex(rgb[1] ?? 0)}${channelToHex(rgb[2] ?? 0)}`;
}

/** Convert a `#rrggbb` hex string to RGB floats (0..1). */
export function hexToRgb(hex: string): Vec3 {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex.trim());
  if (!m) return [0, 0, 0];
  return [parseInt(m[1]!, 16) / 255, parseInt(m[2]!, 16) / 255, parseInt(m[3]!, 16) / 255];
}
