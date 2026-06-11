import { type MetaNodeDefinition, type NodeRegistry } from '@vector-nodes/core';
import {
  addEdge,
  Background,
  Controls,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Connection,
} from '@xyflow/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { checkConnection, edgesWithoutInput, type ConnectionLike } from './connection';
import { VNODE_TYPE, type VNodeFlowNode } from './flow';
import { addToLibrary } from './meta-library';
import { flowToSubgraph, subgraphToFlow } from './meta';
import { NodeEditContext, type NodeEditApi } from './NodeEditContext';
import { setNodeInputDefault, setNodeParam } from './param';
import { VNode } from './VNode';

const nodeTypes = { [VNODE_TYPE]: VNode };

export interface SubgraphEditorProps {
  name: string;
  definition: MetaNodeDefinition;
  registry: NodeRegistry;
  onSave: (name: string, def: MetaNodeDefinition) => void;
  onClose: () => void;
  /** Rename the meta-node (issue #66); return an error message, or null if ok. */
  onRename?: (oldName: string, newName: string) => string | null;
}

/**
 * Edit a meta-node's subgraph in place (the "dive in" editor): the shared
 * definition is edited as its own graph, and saving propagates to every
 * instance. The interface is shown as `$in`/`$out` boundary nodes and is
 * preserved across edits.
 */
export function SubgraphEditor({
  name,
  definition,
  registry,
  onSave,
  onClose,
  onRename,
}: SubgraphEditorProps) {
  const initial = useMemo(() => subgraphToFlow(definition, registry), [definition, registry]);
  const [nodes, setNodes, onNodesChange] = useNodesState<VNodeFlowNode>(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges);
  const [error, setError] = useState<string | null>(null);
  const [draftName, setDraftName] = useState(name);

  // Follow external renames (the `name` prop changes when a rename commits).
  useEffect(() => setDraftName(name), [name]);

  const commitRename = useCallback(() => {
    const next = draftName.trim();
    if (!onRename || next === name) {
      setDraftName(name);
      return;
    }
    const message = onRename(name, next);
    if (message) {
      setError(message);
      setDraftName(name);
    } else {
      setError(null);
    }
  }, [draftName, name, onRename]);

  const editApi = useMemo<NodeEditApi>(
    () => ({
      setParam: (id, key, value) => setNodes((nds) => setNodeParam(nds, id, key, value)),
      setInputDefault: (id, key, value) =>
        setNodes((nds) => setNodeInputDefault(nds, id, key, value)),
    }),
    [setNodes],
  );

  const isValidConnection = useCallback(
    (c: ConnectionLike) => checkConnection(c, nodes).ok,
    [nodes],
  );
  // Latest nodes for the stable onConnect handler (issue #99): array inputs keep
  // every connection; scalar inputs replace their existing link.
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;
  const onConnect = useCallback(
    (c: Connection) => {
      const targetSocket = nodesRef.current
        .find((n) => n.id === c.target)
        ?.data.inputs.find((s) => s.name === c.targetHandle);
      setEdges((eds) =>
        addEdge(c, targetSocket?.isArray ? eds : edgesWithoutInput(eds, c.target, c.targetHandle)),
      );
    },
    [setEdges],
  );

  const currentDef = useCallback(
    () => flowToSubgraph(definition, nodes, edges),
    [definition, nodes, edges],
  );

  return (
    <div className="subgraph" role="dialog" aria-label={`Edit meta-node ${name}`}>
      <div className="subgraph__panel">
        <div className="subgraph__header">
          <label className="subgraph__name">
            <span>Name</span>
            <input
              type="text"
              aria-label="Meta-node name"
              value={draftName}
              disabled={!onRename}
              onChange={(e) => setDraftName(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
              }}
            />
          </label>
          <span className="subgraph__actions">
            <button
              type="button"
              onClick={() => {
                addToLibrary(name, currentDef());
                setError('Saved to library.');
              }}
            >
              Save to library
            </button>
            <button
              type="button"
              onClick={() => {
                onSave(name, currentDef());
                onClose();
              }}
            >
              Done
            </button>
            <button type="button" onClick={onClose}>
              Cancel
            </button>
          </span>
        </div>
        <div className="subgraph__canvas">
          <NodeEditContext.Provider value={editApi}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              isValidConnection={isValidConnection}
              colorMode="system"
              fitView
            >
              <Background />
              <Controls />
            </ReactFlow>
          </NodeEditContext.Provider>
        </div>
        {error && <div className="subgraph__note">{error}</div>}
      </div>
    </div>
  );
}
