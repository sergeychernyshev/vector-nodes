import {
  createBasicRegistry,
  createGraph,
  isMetaNodeType,
  metaNodeDefinitionToNodeDef,
  metaNodeName,
  metaNodeType,
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
import { downloadText, maxAutoId } from './graph-io';
import { augmentedRegistry, collapse, currentGraph, expand, type MetaNodes } from './meta';
import { loadLibrary } from './meta-library';
import { SubgraphEditor } from './SubgraphEditor';
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
import { PreviewPane } from './PreviewPane';
import { Toolbar, type ToolbarHandle } from './Toolbar';
import { usePreview } from './usePreview';
import { VNode } from './VNode';

const baseRegistry = createBasicRegistry();

// A small seed network so the canvas opens with draggable nodes.
const seed = createGraph({
  nodes: [
    { id: 'pa', type: 'PointCircle', position: [80, 120], params: { radius: 1, count: 8 } },
    { id: 'out', type: 'OutputGeometry', position: [440, 160] },
  ],
  links: [{ from: ['pa', 'geometry'], to: ['out', 'geometry'] }],
});

const nodeTypes = { [VNODE_TYPE]: VNode };

// Restore the autosaved network on load, falling back to the seed.
const initialGraph = loadGraph() ?? seed;
const initialMetaNodes: MetaNodes = initialGraph.metaNodes ?? {};
const initialNodes = graphToFlowNodes(
  initialGraph,
  augmentedRegistry(baseRegistry, initialMetaNodes),
);
const initialEdges = graphToFlowEdges(initialGraph);

/** Editor application shell: palette + a pannable/zoomable node canvas. */
export function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState<VNodeFlowNode>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [metaNodes, setMetaNodes] = useState<MetaNodes>(initialMetaNodes);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingMeta, setEditingMeta] = useState<string | null>(null);
  const [library] = useState(() => loadLibrary());
  const idCounter = useRef(maxAutoId(initialNodes));
  const toolbarRef = useRef<ToolbarHandle>(null);

  // Registry = base node definitions + a definition per meta-node, so instances
  // render with their interface sockets and links type-check.
  const registry = useMemo(() => augmentedRegistry(baseRegistry, metaNodes), [metaNodes]);

  // The current network as a core graph (meta-nodes included), recomputed on change.
  const graph = useMemo(() => currentGraph(nodes, edges, metaNodes), [nodes, edges, metaNodes]);

  // Autosave to localStorage on every change.
  useEffect(() => {
    saveGraph(graph);
  }, [graph]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const lastReason = useRef<string | null>(null);

  // Evaluate the graph for the preview off the main thread (Web Worker).
  const preview = usePreview(graph);

  const items = useMemo(() => {
    const base = paletteItems(registry);
    // Library meta-nodes not already present in this graph, for insertion.
    const libraryItems = Object.keys(library)
      .filter((name) => !registry.has(metaNodeType(name)))
      .map((name) => ({ type: metaNodeType(name), label: name, category: 'Library' }));
    return [...base, ...libraryItems].sort(
      (a, b) => a.category.localeCompare(b.category) || a.label.localeCompare(b.label),
    );
  }, [registry, library]);
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
    downloadText('network.vnodes', serializeVnodes(graph));
  }, [graph]);

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
    setNodes(graphToFlowNodes(seed, baseRegistry));
    setEdges(graphToFlowEdges(seed));
    setMetaNodes({});
    setSelectedIds([]);
    idCounter.current = 0;
    clearError();
  }, [setNodes, setEdges, clearError]);

  const onOpen = useCallback(
    async (file: File) => {
      try {
        const opened = parseVnodes(await file.text());
        const openedMeta = opened.metaNodes ?? {};
        const loaded = graphToFlowNodes(opened, augmentedRegistry(baseRegistry, openedMeta));
        setNodes(loaded);
        setEdges(graphToFlowEdges(opened));
        setMetaNodes(openedMeta);
        setSelectedIds([]);
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
      // A library meta-node not yet in this graph: bring its definition in first.
      const libName = metaNodeName(type);
      let def = registry.get(type);
      if (!def && libName && library[libName]) {
        def = metaNodeDefinitionToNodeDef(libName, library[libName]);
        setMetaNodes((m) => ({ ...m, [libName]: library[libName]! }));
      }
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
    [registry, library, nodes, setNodes, clearError],
  );

  // Group: a selection may collapse if it has no Output Geometry node.
  const canGroup =
    selectedIds.length >= 1 &&
    selectedIds.every((id) => nodes.find((n) => n.id === id)?.data.nodeType !== OUTPUT_NODE_TYPE);
  // Ungroup: exactly one selected meta-node instance.
  const ungroupId =
    selectedIds.length === 1 &&
    isMetaNodeType(nodes.find((n) => n.id === selectedIds[0])?.data.nodeType ?? '')
      ? selectedIds[0]
      : null;

  const onGroup = useCallback(() => {
    if (!canGroup) return;
    const next = collapse({ nodes, edges, metaNodes }, selectedIds, baseRegistry);
    setNodes(next.nodes);
    setEdges(next.edges);
    setMetaNodes(next.metaNodes);
    setSelectedIds([next.instanceId]);
    clearError();
  }, [canGroup, nodes, edges, metaNodes, selectedIds, setNodes, setEdges, clearError]);

  const onUngroup = useCallback(() => {
    if (!ungroupId) return;
    const next = expand({ nodes, edges, metaNodes }, ungroupId, baseRegistry);
    setNodes(next.nodes);
    setEdges(next.edges);
    setMetaNodes(next.metaNodes);
    setSelectedIds([]);
    clearError();
  }, [ungroupId, nodes, edges, metaNodes, setNodes, setEdges, clearError]);

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
          onGroup={canGroup ? onGroup : undefined}
          onUngroup={ungroupId ? onUngroup : undefined}
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
              onSelectionChange={({ nodes: sel }) => setSelectedIds(sel.map((n) => n.id))}
              onNodeDoubleClick={(_, node) => {
                const name = metaNodeName(node.data.nodeType);
                if (name && metaNodes[name]) setEditingMeta(name);
              }}
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
        {editingMeta && metaNodes[editingMeta] && (
          <SubgraphEditor
            name={editingMeta}
            definition={metaNodes[editingMeta]}
            registry={registry}
            onSave={(name, def) => setMetaNodes((m) => ({ ...m, [name]: def }))}
            onClose={() => setEditingMeta(null)}
          />
        )}
      </div>
    </NodeEditContext.Provider>
  );
}
