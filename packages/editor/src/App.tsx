import { createBasicRegistry, createGraph } from '@vector-nodes/core';
import {
  addEdge,
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Connection,
} from '@xyflow/react';
import { useCallback, useMemo, useRef, useState } from 'react';

import { checkConnection, type ConnectionLike } from './connection';
import {
  createFlowNode,
  graphToFlowEdges,
  graphToFlowNodes,
  paletteItems,
  VNODE_TYPE,
  type VNodeFlowNode,
} from './flow';
import { Palette } from './Palette';
import { Toolbar } from './Toolbar';
import { VNode } from './VNode';

const registry = createBasicRegistry();

// A small seed network so the canvas opens with draggable nodes.
const seed = createGraph({
  nodes: [
    {
      id: 'pa',
      type: 'PointArray',
      position: [80, 120],
      params: { mode: 'circle', radius: 1, count: 8 },
    },
    { id: 'out', type: 'OutputGeometry', position: [440, 160] },
  ],
  links: [{ from: ['pa', 'geometry'], to: ['out', 'geometry'] }],
});

const nodeTypes = { [VNODE_TYPE]: VNode };

/** Editor application shell: palette + a pannable/zoomable node canvas. */
export function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState<VNodeFlowNode>(
    graphToFlowNodes(seed, registry),
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(graphToFlowEdges(seed));
  const idCounter = useRef(0);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const lastReason = useRef<string | null>(null);

  const items = useMemo(() => paletteItems(registry), []);

  const isValidConnection = useCallback(
    (connection: ConnectionLike) => {
      const result = checkConnection(connection, nodes, edges);
      const reason = result.ok ? null : (result.reason ?? 'Invalid connection.');
      if (lastReason.current !== reason) {
        lastReason.current = reason;
        setConnectionError(reason);
      }
      return result.ok;
    },
    [nodes, edges],
  );

  const clearConnectionError = useCallback(() => {
    lastReason.current = null;
    setConnectionError(null);
  }, []);

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge(connection, eds));
      clearConnectionError();
    },
    [setEdges, clearConnectionError],
  );

  const addNode = useCallback(
    (type: string) => {
      const def = registry.get(type);
      if (!def) return;
      const id = `n${(idCounter.current += 1)}`;
      const position = {
        x: 120 + (idCounter.current % 5) * 24,
        y: 80 + (idCounter.current % 5) * 24,
      };
      setNodes((nds) => [...nds, createFlowNode(def, position, id)]);
    },
    [setNodes],
  );

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Toolbar nodeCount={nodes.length} />
      {connectionError && (
        <div role="alert" className="connection-error">
          {connectionError}
        </div>
      )}
      <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
        <Palette items={items} onAdd={addNode} />
        <div style={{ flex: 1, minHeight: 0 }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            isValidConnection={isValidConnection}
            onConnectEnd={clearConnectionError}
            fitView
          >
            <Background />
            <MiniMap />
            <Controls />
          </ReactFlow>
        </div>
      </div>
    </div>
  );
}
