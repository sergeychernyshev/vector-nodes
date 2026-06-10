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
  type OnConnectStartParams,
} from '@xyflow/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { checkConnection, edgesWithoutInput, type ConnectionLike } from './connection';
import { ConnectMenu } from './ConnectMenu';
import { downloadText, maxAutoId } from './graph-io';
import {
  planInjection,
  planReconnects,
  spliceEdge,
  suggestSourceNodes,
  type SourceSuggestion,
} from './inject';
import {
  augmentedRegistry,
  collapse,
  currentGraph,
  expand,
  renameMetaNode,
  type MetaNodes,
} from './meta';
import { loadLibrary } from './meta-library';
import { SubgraphEditor } from './SubgraphEditor';
import { NodeEditContext, type NodeEditApi } from './NodeEditContext';
import { setNodeInputDefault, setNodeParam } from './param';
import { generate } from '@vector-nodes/codegen';

import {
  clearGraph,
  loadFlag,
  loadGraph,
  loadString,
  saveFlag,
  saveGraph,
  saveString,
} from './storage';
import {
  canAddNode,
  createFlowNode,
  graphToFlowEdges,
  graphToFlowNodes,
  hasOutputNode,
  isTap,
  paletteItems,
  reconcileVariadicInputs,
  resolveAddableDef,
  VNODE_TYPE,
  type VNodeFlowNode,
} from './flow';
import { Palette } from './Palette';
import { PreviewPane } from './PreviewPane';
import { Toolbar, type ToolbarHandle } from './Toolbar';
import { useUndoRedo } from './useUndoRedo';
import { usePreview } from './usePreview';
import { PlacementGhost, VNode } from './VNode';

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
  // Node-list sidebar collapse, persisted (issue #60).
  const [paletteCollapsed, setPaletteCollapsed] = useState(() => loadFlag('vn:palette-collapsed'));
  // Preview sidebar collapse, persisted (issue #64).
  const [previewCollapsed, setPreviewCollapsed] = useState(() => loadFlag('vn:preview-collapsed'));
  // Swap the two sidebars (palette ↔ preview), persisted (issue #62).
  const [sidebarsSwapped, setSidebarsSwapped] = useState(() => loadFlag('vn:sidebars-swapped'));
  // Target language for code generation, persisted (issue #67).
  const [codeLanguage, setCodeLanguage] = useState(() =>
    loadString('vn:codegen-language', 'typescript'),
  );
  // A node type armed for placement (issue #44): a ghost follows the cursor and
  // the node is dropped on the next canvas click. `ghost` is its screen position.
  const [pending, setPending] = useState<string | null>(null);
  const [ghost, setGhost] = useState<{ x: number; y: number } | null>(null);
  // A connection dragged off an input and dropped on empty space (issue #45):
  // open a node menu filtered to compatible sources, then wire the chosen node.
  const [connectMenu, setConnectMenu] = useState<{
    x: number;
    y: number;
    nodeId: string;
    handleId: string;
    suggestions: SourceSuggestion[];
  } | null>(null);
  const connecting = useRef<OnConnectStartParams | null>(null);
  // Pointer-down state for tap-to-place: where it started and whether it began on
  // the empty pane (issue #59 — works for mouse, touch, and pen alike).
  const placeDown = useRef<{ x: number; y: number; onPane: boolean } | null>(null);
  const idCounter = useRef(maxAutoId(initialNodes));
  const toolbarRef = useRef<ToolbarHandle>(null);
  const { screenToFlowPosition } = useReactFlow();

  // Registry = base node definitions + a definition per meta-node, so instances
  // render with their interface sockets and links type-check.
  const registry = useMemo(() => augmentedRegistry(baseRegistry, metaNodes), [metaNodes]);

  // The current network as a core graph (meta-nodes included), recomputed on change.
  const graph = useMemo(() => currentGraph(nodes, edges, metaNodes), [nodes, edges, metaNodes]);

  // Undo/redo over snapshots of the editor state. Handlers call takeSnapshot()
  // before a mutating action; undo/redo restore a snapshot wholesale.
  const history = useUndoRedo(
    () => ({ nodes, edges, metaNodes }),
    (snapshot) => {
      setNodes(snapshot.nodes);
      setEdges(snapshot.edges);
      setMetaNodes(snapshot.metaNodes);
      setSelectedIds([]);
    },
  );
  const { takeSnapshot } = history;

  // Autosave to localStorage on every change.
  useEffect(() => {
    saveGraph(graph);
  }, [graph]);

  // Grow/shrink variadic nodes' input handles as their connections change
  // (issue #65). reconcile returns the same array when nothing changed.
  useEffect(() => {
    setNodes((nds) => reconcileVariadicInputs(nds, edges, registry));
  }, [edges, registry, setNodes]);
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

  // The armed node's data, used to render a full preview under the cursor.
  const ghostData = useMemo(() => {
    if (!pending) return null;
    const { def } = resolveAddableDef(pending, registry, library);
    return def ? createFlowNode(def, { x: 0, y: 0 }, 'ghost').data : null;
  }, [pending, registry, library]);

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
      takeSnapshot();
      // Replace any existing link into this input (issue #41), then add the new one.
      setEdges((eds) =>
        addEdge(connection, edgesWithoutInput(eds, connection.target, connection.targetHandle)),
      );
      clearError();
    },
    [setEdges, clearError, takeSnapshot],
  );

  const editApi = useMemo<NodeEditApi>(
    () => ({
      setParam: (nodeId, name, value) => {
        takeSnapshot(`param:${nodeId}:${name}`);
        setNodes((nds) => setNodeParam(nds, nodeId, name, value));
      },
      setInputDefault: (nodeId, name, value) => {
        takeSnapshot(`input:${nodeId}:${name}`);
        setNodes((nds) => setNodeInputDefault(nds, nodeId, name, value));
      },
    }),
    [setNodes, takeSnapshot],
  );

  const onSave = useCallback(() => {
    downloadText('network.vnodes', serializeVnodes(graph));
  }, [graph]);

  // Generate code for the current network and download it in the chosen language
  // (issue #67). Invalid graphs surface their reason in the error toast.
  const onGenerate = useCallback(() => {
    try {
      const mod = generate(graph, registry);
      const ts = codeLanguage === 'typescript';
      downloadText(`${mod.name}.${ts ? 'ts' : 'js'}`, ts ? mod.ts : mod.js);
      clearError();
    } catch (err) {
      setErrorMessage(`Cannot generate code: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [graph, registry, codeLanguage, clearError]);

  // Cmd/Ctrl+S saves, +O opens, +Z undoes, +Shift+Z / Ctrl+Y redoes —
  // overriding the browser defaults.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.altKey) return;
      const key = event.key.toLowerCase();
      // Let the browser handle undo/redo while typing in a field.
      const target = event.target as HTMLElement | null;
      const editing =
        target?.isContentEditable ||
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName ?? '');
      if (key === 's') {
        event.preventDefault();
        onSave();
      } else if (key === 'o') {
        event.preventDefault();
        toolbarRef.current?.openFileDialog();
      } else if (key === 'z' && !editing) {
        event.preventDefault();
        if (event.shiftKey) history.redo();
        else history.undo();
      } else if (key === 'y' && !editing) {
        event.preventDefault();
        history.redo();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onSave, history]);

  const onReset = useCallback(() => {
    takeSnapshot();
    clearGraph();
    setNodes(graphToFlowNodes(seed, baseRegistry));
    setEdges(graphToFlowEdges(seed));
    setMetaNodes({});
    setSelectedIds([]);
    idCounter.current = 0;
    clearError();
  }, [setNodes, setEdges, clearError, takeSnapshot]);

  const onOpen = useCallback(
    async (file: File) => {
      try {
        const opened = parseVnodes(await file.text());
        const openedMeta = opened.metaNodes ?? {};
        const loaded = graphToFlowNodes(opened, augmentedRegistry(baseRegistry, openedMeta));
        takeSnapshot();
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
    [setNodes, setEdges, clearError, takeSnapshot],
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
      takeSnapshot();
      if (metaToAdd) setMetaNodes((m) => ({ ...m, [metaToAdd[0]]: metaToAdd[1] }));
      const position = screenToFlowPosition({ x: screenX, y: screenY });
      const id = `n${(idCounter.current += 1)}`;
      setNodes((nds) => [...nds, createFlowNode(def, position, id)]);
      return id;
    },
    [registry, library, nodes, screenToFlowPosition, setNodes, takeSnapshot],
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

  const onConnectStart = useCallback((_: unknown, params: OnConnectStartParams) => {
    connecting.current = params;
  }, []);

  // Snapshot before a drag begins. Must be a stable reference: React Flow tracks
  // onNodeDragStart/onSelectionDragStart and writes any changed prop into its
  // store, so a new inline function each render would loop (max update depth).
  const onDragStart = useCallback(() => takeSnapshot(), [takeSnapshot]);

  // Dropping a connection dragged off an input into empty space opens a node
  // menu filtered to sources whose output matches that input (issue #45).
  const onConnectEnd = useCallback(
    (event: MouseEvent | TouchEvent) => {
      const info = connecting.current;
      connecting.current = null;
      clearError();
      if (!info || info.handleType !== 'target' || !info.nodeId || !info.handleId) return;
      const targetEl = event.target as Element | null;
      if (!targetEl?.classList?.contains('react-flow__pane')) return;
      const node = nodes.find((n) => n.id === info.nodeId);
      const input = node?.data.inputs.find((s) => s.name === info.handleId);
      if (!input) return;
      const point = 'changedTouches' in event ? event.changedTouches[0] : (event as MouseEvent);
      if (!point) return;
      setConnectMenu({
        x: point.clientX,
        y: point.clientY,
        nodeId: info.nodeId,
        handleId: info.handleId,
        suggestions: suggestSourceNodes(registry, input),
      });
    },
    [nodes, registry, clearError],
  );

  // Choosing a source from the connect menu creates it and wires its output to
  // the dragged input.
  const onPickSource = useCallback(
    (suggestion: SourceSuggestion) => {
      if (!connectMenu) return;
      const { x, y, nodeId, handleId } = connectMenu;
      setConnectMenu(null);
      const id = createNodeAt(suggestion.type, x, y);
      if (!id) return;
      setEdges((eds) =>
        addEdge(
          {
            source: id,
            sourceHandle: suggestion.outputHandle,
            target: nodeId,
            targetHandle: handleId,
          },
          edgesWithoutInput(eds, nodeId, handleId),
        ),
      );
      clearError();
    },
    [connectMenu, createNodeAt, setEdges, clearError],
  );

  // Deleting a node that bridged two compatible sockets heals the gap with a
  // direct connection (the inverse of injecting a node — issue #43).
  const onNodesDelete = useCallback(
    (deleted: VNodeFlowNode[]) => {
      takeSnapshot();
      const deletedIds = new Set(deleted.map((n) => n.id));
      const bridges = planReconnects(edges, nodes, deletedIds);
      if (bridges.length === 0) return;
      setEdges((eds) => {
        // Drop edges touching the removed nodes, then add the bridges (each
        // replacing any existing link into its destination input).
        let next = eds.filter((e) => !deletedIds.has(e.source) && !deletedIds.has(e.target));
        for (const b of bridges) {
          next = addEdge(b, edgesWithoutInput(next, b.target, b.targetHandle));
        }
        return next;
      });
    },
    [edges, nodes, setEdges, takeSnapshot],
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
    takeSnapshot();
    const next = collapse({ nodes, edges, metaNodes }, selectedIds, baseRegistry);
    setNodes(next.nodes);
    setEdges(next.edges);
    setMetaNodes(next.metaNodes);
    setSelectedIds([next.instanceId]);
    clearError();
  }, [
    canGroup,
    nodes,
    edges,
    metaNodes,
    selectedIds,
    setNodes,
    setEdges,
    clearError,
    takeSnapshot,
  ]);

  const onUngroup = useCallback(() => {
    if (!ungroupId) return;
    takeSnapshot();
    const next = expand({ nodes, edges, metaNodes }, ungroupId, baseRegistry);
    setNodes(next.nodes);
    setEdges(next.edges);
    setMetaNodes(next.metaNodes);
    setSelectedIds([]);
    clearError();
  }, [ungroupId, nodes, edges, metaNodes, setNodes, setEdges, clearError, takeSnapshot]);

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
          onUndo={history.undo}
          onRedo={history.redo}
          canUndo={history.canUndo}
          canRedo={history.canRedo}
          onSwapSidebars={() =>
            setSidebarsSwapped((s) => {
              saveFlag('vn:sidebars-swapped', !s);
              return !s;
            })
          }
          onGenerate={onGenerate}
          codeLanguage={codeLanguage}
          onCodeLanguageChange={(lang) => {
            saveString('vn:codegen-language', lang);
            setCodeLanguage(lang);
          }}
        />
        <div className={sidebarsSwapped ? 'app-main app-main--swapped' : 'app-main'}>
          <Palette
            items={items}
            onAdd={armNode}
            disabledTypes={disabledTypes}
            armedType={pending}
            collapsed={paletteCollapsed}
            onToggleCollapse={() =>
              setPaletteCollapsed((c) => {
                saveFlag('vn:palette-collapsed', !c);
                return !c;
              })
            }
          />
          <div
            className="canvas-wrap"
            style={{ cursor: pending ? 'copy' : undefined }}
            onPointerMove={pending ? (e) => setGhost({ x: e.clientX, y: e.clientY }) : undefined}
            onPointerDown={
              pending
                ? (e) => {
                    placeDown.current = {
                      x: e.clientX,
                      y: e.clientY,
                      onPane:
                        (e.target as Element).classList?.contains('react-flow__pane') ?? false,
                    };
                  }
                : undefined
            }
            onPointerUp={
              pending
                ? (e) => {
                    const down = placeDown.current;
                    placeDown.current = null;
                    // Place only on a tap that began on the empty pane — not after
                    // a pan, and not on a node/edge (edges are handled separately).
                    if (down?.onPane && isTap(down.x, down.y, e.clientX, e.clientY)) {
                      placeNode(e.clientX, e.clientY);
                    }
                  }
                : undefined
            }
            onPointerLeave={
              pending
                ? () => {
                    setGhost(null);
                    placeDown.current = null;
                  }
                : undefined
            }
          >
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodesDelete={onNodesDelete}
              onNodeDragStart={onDragStart}
              onSelectionDragStart={onDragStart}
              onConnect={onConnect}
              onConnectStart={onConnectStart}
              onEdgeClick={onEdgeClick}
              onSelectionChange={({ nodes: sel }) => setSelectedIds(sel.map((n) => n.id))}
              onNodeDoubleClick={(_, node) => {
                const name = metaNodeName(node.data.nodeType);
                if (name && metaNodes[name]) setEditingMeta(name);
              }}
              isValidConnection={isValidConnection}
              onConnectEnd={onConnectEnd}
              fitView
            >
              <Background />
              <MiniMap />
              <Controls />
            </ReactFlow>
          </div>
          <PreviewPane
            result={preview}
            side={sidebarsSwapped ? 'left' : 'right'}
            collapsed={previewCollapsed}
            onToggleCollapse={() =>
              setPreviewCollapsed((c) => {
                saveFlag('vn:preview-collapsed', !c);
                return !c;
              })
            }
          />
        </div>
        {pending && ghost && ghostData && (
          <PlacementGhost data={ghostData} x={ghost.x} y={ghost.y} />
        )}
        {connectMenu && (
          <ConnectMenu
            x={connectMenu.x}
            y={connectMenu.y}
            suggestions={connectMenu.suggestions}
            onPick={onPickSource}
            onClose={() => setConnectMenu(null)}
          />
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
            onRename={(oldName, newName) => {
              const trimmed = newName.trim();
              if (!trimmed) return 'Name cannot be empty.';
              if (trimmed !== oldName && metaNodes[trimmed]) {
                return `A group named “${trimmed}” already exists.`;
              }
              takeSnapshot();
              const next = renameMetaNode({ nodes, edges, metaNodes }, oldName, trimmed);
              setNodes(next.nodes);
              setMetaNodes(next.metaNodes);
              setEditingMeta(trimmed);
              return null;
            }}
          />
        )}
      </div>
    </NodeEditContext.Provider>
  );
}
