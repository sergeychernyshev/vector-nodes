import { createContext, useContext } from 'react';

/** Imperative API for editing node state from within custom node components. */
export interface NodeEditApi {
  setParam: (nodeId: string, name: string, value: unknown) => void;
  /** Set the value of an unconnected input socket (issue #23). */
  setInputDefault: (nodeId: string, name: string, value: unknown) => void;
}

export const NodeEditContext = createContext<NodeEditApi | null>(null);

/** Access the node-edit API; throws if used outside a provider. */
export function useNodeEdit(): NodeEditApi {
  const ctx = useContext(NodeEditContext);
  if (!ctx) {
    throw new Error('useNodeEdit must be used within a NodeEditContext.Provider');
  }
  return ctx;
}
