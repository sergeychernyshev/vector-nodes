import {
  createBasicRegistry,
  createGraph,
  isMetaNodeType,
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
  useReactFlow,
  type Connection,
  type Edge,
} from '@xyflow/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { checkConnection, edgesWithoutInput, type ConnectionLike } from './connection';
import { downloadText, maxAutoId } from './graph-io';
import { planInjection, spliceEdge } from './inject';
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
  resolveAddableDef,
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
  // A node type armed for placement (issue #44): a ghost follows the cursor and
  // the node is dropped on the next canvas click. `ghost` is its screen position.
  const [pending, setPending] = useState<string | null>(null);
  const [ghost, setGhost] = useState<{ x: number; y: number } | null>(null);
  const idCounter = useRef(maxAutoId(initialNodes));
  const toolbarRef = useRef<ToolbarHandle>(null);
  const { screenToFlowPosition } = useReactFlow();

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
      const result = checkConnection(connection, nodes);
      const reason = result.ok ? null : (result.reason ?? 'Invalid connection.');
      if (lastReason.current !== reason) {
        lastReason.current = reason;
        setErrorMessage(reason);
      }
      return result.ok;
    },
    [nodes],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      // Replace any existing link into this input (issue #41), then add the new one.
      setEdges((eds) =>
        addEdge(connection, edgesWithoutInput(eds, connection.target, connection.targetHandle)),
      );
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

  // Selecting a palette node arms it for placement rather than dropping it
  // immediately (issue #44). Selecting another replaces the armed type.
  const armNode = useCallback(
    (type: string) => {
      const { def } = resolveAddableDef(type, registry, library);
      if (!def) return;
      const check = canAddNode(type, nodes);
      if (!check.ok) {
        setErrorMessage(check.reason ?? 'Cannot add this node.');
        return;
      }
      setPending(type);
      clearError();
    },
    [registry, library, nodes, clearError],
  );

  // Create a node of `type` at a screen point, registering its library
  // definition if needed. Returns the new node id, or null if it can't be added.
  const createNodeAt = useCallback(
    (type: string, screenX: number, screenY: number): string | null => {
      const { def, metaToAdd } = resolveAddableDef(type, registry, library);
      if (!def) return null;
      const check = canAddNode(type, nodes);
      if (!check.ok) {
        setErrorMessage(check.reason ?? 'Cannot add this node.');
        return null;
      }
      if (metaToAdd) setMetaNodes((m) => ({ ...m, [metaToAdd[0]]: metaToAdd[1] }));
      const position = screenToFlowPosition({ x: screenX, y: screenY });
      const id = `n${(idCounter.current += 1)}`;
      setNodes((nds) => [...nds, createFlowNode(def, position, id)]);
      return id;
    },
    [registry, library, nodes, screenToFlowPosition, setNodes],
  );

  // Drop the armed node at a screen point (the click location).
  const placeNode = useCallback(
    (screenX: number, screenY: number) => {
      if (!pending) return;
      const placed = createNodeAt(pending, screenX, screenY);
      setPending(null);
      setGhost(null);
      if (placed) clearError();
    },
    [pending, createNodeAt, clearError],
  );

  // Clicking a connection while a node is armed injects it onto that connection
  // if the node has a matching input/output (issue #43); otherwise it just drops
  // the node where clicked.
  const onEdgeClick = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      if (!pending) return;
      const { def } = resolveAddableDef(pending, registry, library);
      const sourceNode = nodes.find((n) => n.id === edge.source);
      const targetNode = nodes.find((n) => n.id === edge.target);
      const source = sourceNode?.data.outputs.find((s) => s.name === edge.sourceHandle);
      const dest = targetNode?.data.inputs.find((s) => s.name === edge.targetHandle);
      const plan = def && source && dest ? planInjection(def, source, dest) : null;
      if (!plan) {
        placeNode(event.clientX, event.clientY);
        return;
      }
      const id = createNodeAt(pending, event.clientX, event.clientY);
      setPending(null);
      setGhost(null);
      if (!id) return;
      setEdges((eds) => spliceEdge(eds, edge, id, plan));
      clearError();
    },
    [pending, registry, library, nodes, placeNode, createNodeAt, setEdges, clearError],
  );

  // Esc cancels an armed placement.
  useEffect(() => {
    if (!pending) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPending(null);
        setGhost(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pending]);

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
          <Palette
            items={items}
            onAdd={armNode}
            disabledTypes={disabledTypes}
            armedType={pending}
          />
          <div
            style={{ flex: 1, minHeight: 0, cursor: pending ? 'copy' : undefined }}
            onPointerMove={pending ? (e) => setGhost({ x: e.clientX, y: e.clientY }) : undefined}
            onPointerLeave={pending ? () => setGhost(null) : undefined}
          >
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onPaneClick={(e) => placeNode(e.clientX, e.clientY)}
              onEdgeClick={onEdgeClick}
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
        {pending && ghost && (
          <div className="node-ghost" style={{ left: ghost.x, top: ghost.y }} aria-hidden="true">
            {items.find((i) => i.type === pending)?.label ?? pending}
          </div>
        )}
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
