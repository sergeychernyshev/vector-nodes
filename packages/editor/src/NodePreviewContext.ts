import type { Geometry } from '@vector-nodes/runtime';
import { createContext, useContext } from 'react';

/**
 * Per-node preview state shared with every {@link import('./VNode').VNode}
 * (issue #79): which nodes have their preview box open, the geometry each open
 * node produced, and a toggle. Read from context so opening a preview doesn't
 * rebuild node data.
 */
export interface NodePreviewApi {
  /** Geometry for open nodes, keyed by node id (absent until evaluated). */
  geometries: Record<string, Geometry>;
  /** Node ids whose preview box is currently shown. */
  open: ReadonlySet<string>;
  /** Show/hide a node's preview box. */
  toggle: (id: string) => void;
}

const EMPTY: NodePreviewApi = {
  geometries: {},
  open: new Set(),
  toggle: () => {},
};

export const NodePreviewContext = createContext<NodePreviewApi>(EMPTY);

/** Access the per-node preview state (no-op default outside a provider). */
export function useNodePreview(): NodePreviewApi {
  return useContext(NodePreviewContext);
}
