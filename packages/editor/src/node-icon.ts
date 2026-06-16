import { createGraph } from '@vector-nodes/core';
import type { Color, Geometry } from '@vector-nodes/runtime';

import type { FlowNodeData } from './flow';
import { evaluatePreview } from './preview';

/**
 * The geometry a geometry-producing node yields from its current (default)
 * params/inputs, for the 2D render shown as its icon (issue #142). Builds a
 * one-node graph and evaluates it. Returns `null` for nodes that emit no
 * geometry, when evaluation fails (e.g. an input with no default), or when the
 * result is empty — callers fall back to the value/label badge.
 */
export function nodeDefaultGeometry(data: FlowNodeData): Geometry | null {
  const geomOut = data.outputs.find((s) => s.type === 'Geometry' && !s.isArray);
  if (!geomOut) return null;
  const graph = createGraph({
    nodes: [
      { id: 'g', type: data.nodeType, params: data.params, inputDefaults: data.inputDefaults },
      { id: 'out', type: 'OutputGeometry' },
    ],
    links: [{ from: ['g', geomOut.name], to: ['out', 'geometry'] }],
  });
  const geo = evaluatePreview(graph).geometry;
  if (!geo || (geo.points.length === 0 && geo.curves.length === 0 && geo.meshes.length === 0)) {
    return null;
  }
  return geo;
}

/**
 * A compact icon shown in a square frame to the left of a node's title (issue
 * #142): either a color swatch or a short piece of text. Derived from the node's
 * default value where it has one (e.g. a constant), falling back to the initial
 * of its label so every node still gets a recognizable badge.
 */
export type NodeIcon = { kind: 'color'; rgba: Color } | { kind: 'text'; text: string };

/** Format a number compactly: integers as-is, others to 2 decimals without trailing zeros. */
function formatNumber(value: unknown): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0';
  if (Number.isInteger(n)) return String(n);
  return parseFloat(n.toFixed(2)).toString();
}

/** The icon for a node: its default value rendered small, or its label's initial. */
export function nodeIcon(data: FlowNodeData): NodeIcon {
  // Constant-style nodes carry their value in a `value` param; use its declared
  // type to render the most representative badge.
  const valueDef = data.paramDefs.find((p) => p.name === 'value');
  const value = data.params.value;
  if (valueDef && value !== undefined) {
    switch (valueDef.type) {
      case 'Color':
        if (Array.isArray(value)) return { kind: 'color', rgba: value as Color };
        break;
      case 'Float':
      case 'Integer':
        return { kind: 'text', text: formatNumber(value) };
      case 'Boolean':
        return { kind: 'text', text: value ? '✓' : '✗' };
      case 'String': {
        const text = String(value).trim();
        return { kind: 'text', text: text.slice(0, 2) || '“”' };
      }
    }
  }
  const label = (data.label ?? data.nodeType).trim();
  return { kind: 'text', text: (label.charAt(0) || '?').toUpperCase() };
}

/** A CSS `rgba(...)` string for a {@link Color} (components in `[0, 1]`). */
export function colorToCss([r, g, b, a]: Color): string {
  const to255 = (c: number) => Math.round(Math.min(Math.max(c, 0), 1) * 255);
  return `rgba(${to255(r)}, ${to255(g)}, ${to255(b)}, ${a})`;
}
