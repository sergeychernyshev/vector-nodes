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
import { useCallback, useMemo, useState } from 'react';

import { checkConnection, edgesWithoutInput, type ConnectionLike } from './connection';
import { VNODE_TYPE, type VNodeFlowNode } from './flow';
import { addToLibrary } from './meta-library';
import { flowToSubgraph, subgraphToFlow } from './meta';
import { NodeEditContext, type NodeEditApi } from './NodeEditContext';
import { setNodeParam } from './param';
import { VNode } from './VNode';

const nodeTypes = { [VNODE_TYPE]: VNode };

export interface SubgraphEditorProps {
  name: string;
  definition: MetaNodeDefinition;
  registry: NodeRegistry;
  onSave: (name: string, def: MetaNodeDefinition) => void;
  onClose: () => void;
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
}: SubgraphEditorProps) {
  const initial = useMemo(() => subgraphToFlow(definition, registry), [definition, registry]);
  const [nodes, setNodes, onNodesChange] = useNodesState<VNodeFlowNode>(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges);
  const [error, setError] = useState<string | null>(null);

  const editApi = useMemo<NodeEditApi>(
    () => ({
      setParam: (id, key, value) => setNodes((nds) => setNodeParam(nds, id, key, value)),
    }),
    [setNodes],
  );

  const isValidConnection = useCallback(
    (c: ConnectionLike) => checkConnection(c, nodes).ok,
    [nodes],
  );
  const onConnect = useCallback(
    (c: Connection) =>
      setEdges((eds) => addEdge(c, edgesWithoutInput(eds, c.target, c.targetHandle))),
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
          <strong>Edit “{name}”</strong>
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
