import {
  createBasicRegistry,
  createGraph,
  OUTPUT_NODE_TYPE,
  parseVnodes,
  serializeVnodes,
} from '@vector-nodes/core';
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
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { checkConnection, type ConnectionLike } from './connection';
import { downloadText, flowToGraph, maxAutoId } from './graph-io';
import { NodeEditContext, type NodeEditApi } from './NodeEditContext';
import { setNodeParam } from './param';
import { clearGraph, loadGraph, saveGraph } from './storage';
import {
  canAddNode,
  createFlowNode,
  graphToFlowEdges,
  graphToFlowNodes,
  hasOutputNode,
  paletteItems,
  VNODE_TYPE,
  type VNodeFlowNode,
} from './flow';
import { Palette } from './Palette';
import { evaluatePreview } from './preview';
import { PreviewPane } from './PreviewPane';
import { Toolbar, type ToolbarHandle } from './Toolbar';
import { VNode } from './VNode';

const registry = createBasicRegistry();

// A small seed network so the canvas opens with draggable nodes.
const seed = createGraph({
  nodes: [
    {
      id: 'pa',
      type: 'PointCircle',
      position: [80, 120],
      params: { radius: 1, count: 8 },
    },
    { id: 'out', type: 'OutputGeometry', position: [440, 160] },
  ],
  links: [{ from: ['pa', 'geometry'], to: ['out', 'geometry'] }],
});

const nodeTypes = { [VNODE_TYPE]: VNode };

// Restore the autosaved network on load, falling back to the seed.
const initialGraph = loadGraph() ?? seed;
const initialNodes = graphToFlowNodes(initialGraph, registry);
const initialEdges = graphToFlowEdges(initialGraph);

/** Editor application shell: palette + a pannable/zoomable node canvas. */
export function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState<VNodeFlowNode>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const idCounter = useRef(maxAutoId(initialNodes));
  const toolbarRef = useRef<ToolbarHandle>(null);

  // Autosave the current network to localStorage on every change.
  useEffect(() => {
    saveGraph(flowToGraph(nodes, edges));
  }, [nodes, edges]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const lastReason = useRef<string | null>(null);

  // Re-evaluate the graph for the preview whenever nodes or edges change.
  const preview = useMemo(() => evaluatePreview(flowToGraph(nodes, edges)), [nodes, edges]);

  const items = useMemo(() => paletteItems(registry), []);
  const disabledTypes = useMemo(
    () => (hasOutputNode(nodes) ? new Set([OUTPUT_NODE_TYPE]) : new Set<string>()),
    [nodes],
  );

  const clearError = useCallback(() => {
    lastReason.current = null;
    setErrorMessage(null);
  }, []);

  const isValidConnection = useCallback(
    (connection: ConnectionLike) => {
      const result = checkConnection(connection, nodes, edges);
      const reason = result.ok ? null : (result.reason ?? 'Invalid connection.');
      if (lastReason.current !== reason) {
        lastReason.current = reason;
        setErrorMessage(reason);
      }
      return result.ok;
    },
    [nodes, edges],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge(connection, eds));
      clearError();
    },
    [setEdges, clearError],
  );

  const editApi = useMemo<NodeEditApi>(
    () => ({
      setParam: (nodeId, name, value) => setNodes((nds) => setNodeParam(nds, nodeId, name, value)),
    }),
    [setNodes],
  );

  const onSave = useCallback(() => {
    downloadText('network.vnodes', serializeVnodes(flowToGraph(nodes, edges)));
  }, [nodes, edges]);

  // Cmd/Ctrl+S saves, Cmd/Ctrl+O opens — overriding the browser defaults.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.altKey) return;
      const key = event.key.toLowerCase();
      if (key === 's') {
        event.preventDefault();
        onSave();
      } else if (key === 'o') {
        event.preventDefault();
        toolbarRef.current?.openFileDialog();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onSave]);

  const onReset = useCallback(() => {
    clearGraph();
    setNodes(graphToFlowNodes(seed, registry));
    setEdges(graphToFlowEdges(seed));
    idCounter.current = 0;
    clearError();
  }, [setNodes, setEdges, clearError]);

  const onOpen = useCallback(
    async (file: File) => {
      try {
        const graph = parseVnodes(await file.text());
        const loaded = graphToFlowNodes(graph, registry);
        setNodes(loaded);
        setEdges(graphToFlowEdges(graph));
        idCounter.current = maxAutoId(loaded);
        clearError();
      } catch (err) {
        setErrorMessage(`Failed to open file: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
    [setNodes, setEdges, clearError],
  );

  const addNode = useCallback(
    (type: string) => {
      const def = registry.get(type);
      if (!def) return;
      const check = canAddNode(type, nodes);
      if (!check.ok) {
        setErrorMessage(check.reason ?? 'Cannot add this node.');
        return;
      }
      const id = `n${(idCounter.current += 1)}`;
      const position = {
        x: 120 + (idCounter.current % 5) * 24,
        y: 80 + (idCounter.current % 5) * 24,
      };
      setNodes((nds) => [...nds, createFlowNode(def, position, id)]);
      clearError();
    },
    [nodes, setNodes, clearError],
  );

  return (
    <NodeEditContext.Provider value={editApi}>
      <div
        style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
        }}
      >
        <Toolbar
          ref={toolbarRef}
          nodeCount={nodes.length}
          onSave={onSave}
          onOpen={onOpen}
          onReset={onReset}
        />
        <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
          <Palette items={items} onAdd={addNode} disabledTypes={disabledTypes} />
          <div style={{ flex: 1, minHeight: 0 }}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              isValidConnection={isValidConnection}
              onConnectEnd={clearError}
              fitView
            >
              <Background />
              <MiniMap />
              <Controls />
            </ReactFlow>
          </div>
          <PreviewPane result={preview} />
        </div>
        {errorMessage && (
          <div role="alert" className="connection-toast">
            {errorMessage}
          </div>
        )}
      </div>
    </NodeEditContext.Provider>
  );
}
