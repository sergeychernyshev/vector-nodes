import type { Geometry } from '@vector-nodes/runtime';
import { Handle, Position, useNodeConnections, useViewport, type NodeProps } from '@xyflow/react';
import { useMemo, type ReactNode } from 'react';

import {
  socketClassName,
  socketStyle,
  type FlowNodeData,
  type FlowSocket,
  type VNodeFlowNode,
} from './flow';
import { colorToCss, nodeDefaultGeometry, nodeIcon } from './node-icon';
import { isFormulaPreviewable, MathFormula } from './math-formula';
import { useClock } from './ClockContext';
import { useNodePreview } from './NodePreviewContext';
import {
  InputDefaultField,
  isEditableInput,
  ParamControlField,
  ParamControls,
} from './ParamControls';
import { SvgView } from './SvgView';

/**
 * Square icon shown to the left of a node's title (issue #142): for nodes that
 * produce geometry, a 2D render of their output with default values; otherwise a
 * value swatch/number or the label's initial.
 */
export function NodeIcon({ data }: { data: FlowNodeData }) {
  const geometry = useMemo(() => nodeDefaultGeometry(data), [data]);
  if (geometry) {
    return (
      <span className="vnode__icon vnode__icon--geo" aria-hidden="true">
        <SvgView geometry={geometry} tint="#fff" weight={8} padding={0.12} />
      </span>
    );
  }
  const icon = nodeIcon(data);
  return (
    <span className="vnode__icon" aria-hidden="true">
      {icon.kind === 'color' ? (
        <span className="vnode__icon-swatch" style={{ background: colorToCss(icon.rgba) }} />
      ) : (
        <span className="vnode__icon-text">{icon.text}</span>
      )}
    </span>
  );
}

/** A node is previewable (issue #79) when it emits a Geometry output. */
export function isPreviewable(data: FlowNodeData): boolean {
  return data.outputs.some((s) => s.type === 'Geometry' && !s.isArray);
}

function SocketRow({
  socket,
  side,
  control,
  ghost,
}: {
  socket: FlowSocket;
  side: 'input' | 'output';
  control?: ReactNode;
  /** Render a static dot instead of a connectable Handle (for ghost previews). */
  ghost?: boolean;
}) {
  const isInput = side === 'input';
  return (
    <div className={`vnode__port vnode__port--${side}`}>
      {ghost ? (
        <span
          className={`${socketClassName(socket)} vnode__handle--ghost vnode__handle--${side}`}
          style={socketStyle(socket)}
        />
      ) : (
        <Handle
          type={isInput ? 'target' : 'source'}
          position={isInput ? Position.Left : Position.Right}
          id={socket.name}
          className={socketClassName(socket)}
          style={socketStyle(socket)}
        />
      )}
      {control ?? <span className="vnode__socket-label">{socket.name}</span>}
    </div>
  );
}

interface NodeCardProps {
  id: string;
  data: FlowNodeData;
  selected?: boolean;
  /** When true, render as a non-interactive preview with static socket dots. */
  ghost?: boolean;
  /** Geometry to show in the ghost's preview box while dragging onto the canvas (issue #141). */
  ghostGeometry?: Geometry;
  /** Names of input sockets that currently have a link feeding them. */
  connectedInputs: Set<string | null | undefined>;
}

/**
 * The visual node card, shared by the live React Flow node ({@link VNode}) and
 * the placement ghost ({@link GhostNode}). The ghost variant draws static socket
 * dots instead of connectable handles.
 */
function NodeCard({ id, data, selected, ghost, ghostGeometry, connectedInputs }: NodeCardProps) {
  // Params that share a name with an output socket are edited inline on that
  // socket's row (e.g. constant nodes); the rest render in the block below.
  const outputNames = new Set(data.outputs.map((s) => s.name));
  const inlineParams = new Map(
    data.paramDefs.filter((p) => outputNames.has(p.name)).map((p) => [p.name, p]),
  );
  const blockParams = data.paramDefs.filter((p) => !inlineParams.has(p.name));

  // Per-node preview state (issue #79). The live node reads the shared preview
  // state; the ghost shows the geometry passed in while it's dragged (issue #141).
  const preview = useNodePreview();
  // A node previews either its geometry output (issue #79) or, for Math & Trig
  // nodes, a MathML formula of its operation and result (issue #163).
  const formulaPreviewable = !ghost && isFormulaPreviewable(data);
  const previewable = isPreviewable(data) || formulaPreviewable;
  const previewOpen = ghost ? ghostGeometry !== undefined : previewable && preview.open.has(id);
  const previewGeometry = ghost ? ghostGeometry : preview.geometries[id];

  // A Time node carries the shared animation transport on its card (issue #138):
  // its play/pause button toggles the same clock as the global control.
  const clock = useClock();
  const isTime = !ghost && data.nodeType === 'Time';

  const classes = ['vnode'];
  if (selected) classes.push('vnode--selected');
  if (data.nodeType.startsWith('Meta:')) classes.push('vnode--meta');

  return (
    <div className="vnode-wrap">
      {/* The preview floats above the body (absolute), so toggling it never
          shifts the node body or its handles — it collapses down into the
          header (issue #79). */}
      {previewOpen && (
        <div className="vnode__preview nodrag nowheel">
          {formulaPreviewable ? (
            <MathFormula data={data} connectedInputs={preview.inputs[id]} />
          ) : previewGeometry ? (
            <SvgView geometry={previewGeometry} />
          ) : (
            <span className="vnode__preview-empty">No preview</span>
          )}
        </div>
      )}
      <div className={classes.join(' ')}>
        <div className="vnode__header">
          <NodeIcon data={data} />
          <span className="vnode__title">{data.label}</span>
          {isTime && (
            <span
              className="vnode__transport nodrag"
              style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 8 }}
            >
              <button
                type="button"
                className="vnode__preview-toggle nodrag"
                aria-label={clock.playing ? 'Pause animation' : 'Play animation'}
                aria-pressed={clock.playing}
                title={clock.playing ? 'Pause animation' : 'Play animation'}
                onClick={() => clock.toggle()}
              >
                {clock.playing ? '⏸' : '▶'}
              </button>
              <span className="vnode__time" title="Current time (seconds)">
                {clock.time.toFixed(2)}s
              </span>
            </span>
          )}
          {!ghost && previewable && (
            <button
              type="button"
              className="vnode__preview-toggle nodrag"
              aria-label={previewOpen ? 'Hide preview' : 'Show preview'}
              aria-pressed={previewOpen}
              title={previewOpen ? 'Hide preview' : 'Show preview'}
              onClick={() => preview.toggle(id)}
            >
              {previewOpen ? '▾' : '▸'}
            </button>
          )}
        </div>
        <div className="vnode__body">
          <div className="vnode__col">
            {data.inputs.map((s) => {
              const connected = connectedInputs.has(s.name);
              // A connected input's editor is disabled but previews the value its
              // link delivers (the upstream output's value), falling back to the
              // inline default until the preview resolves.
              const liveValue = connected ? preview.inputs[id]?.[s.name] : undefined;
              const value =
                liveValue !== undefined ? liveValue : (data.inputDefaults[s.name] ?? s.default);
              return (
                <SocketRow
                  key={s.name}
                  socket={s}
                  side="input"
                  ghost={ghost}
                  control={
                    isEditableInput(s) ? (
                      <InputDefaultField
                        nodeId={id}
                        socket={s}
                        value={value}
                        connected={connected}
                      />
                    ) : undefined
                  }
                />
              );
            })}
          </div>
          <div className="vnode__col vnode__col--outputs">
            {data.outputs.map((s) => {
              const param = inlineParams.get(s.name);
              return (
                <SocketRow
                  key={s.name}
                  socket={s}
                  side="output"
                  ghost={ghost}
                  control={
                    param ? (
                      <ParamControlField
                        nodeId={id}
                        param={param}
                        value={data.params[param.name]}
                      />
                    ) : undefined
                  }
                />
              );
            })}
          </div>
        </div>
        <ParamControls nodeId={id} paramDefs={blockParams} values={data.params} />
      </div>
    </div>
  );
}

/** Custom React Flow node: a labeled box with Blender-colored input/output sockets. */
export function VNode({ id, data, selected }: NodeProps<VNodeFlowNode>) {
  // Inputs that currently have a link feeding them — their inline default editor
  // is disabled, since the connection supplies the value (issue #23).
  const connections = useNodeConnections({ handleType: 'target' });
  const connectedInputs = new Set(connections.map((c) => c.targetHandle));
  return <NodeCard id={id} data={data} selected={selected} connectedInputs={connectedInputs} />;
}

/**
 * A non-interactive copy of a node, rendered semi-transparent under the cursor
 * while a palette node is armed for placement (issue #44).
 */
export function GhostNode({ data, geometry }: { data: FlowNodeData; geometry?: Geometry }) {
  return (
    <NodeCard id="ghost" data={data} ghost ghostGeometry={geometry} connectedInputs={new Set()} />
  );
}

/**
 * The placement ghost positioned at the cursor and scaled by the canvas zoom, so
 * it's the same size it will be once dropped onto the canvas. Reads the live
 * viewport, so only this overlay re-renders on pan/zoom (and only while a node is
 * armed for placement). `geometry` shows a live preview of the armed node (issue #141).
 */
export function PlacementGhost({
  data,
  geometry,
  x,
  y,
}: {
  data: FlowNodeData;
  geometry?: Geometry;
  x: number;
  y: number;
}) {
  const { zoom } = useViewport();
  return (
    <div
      className="node-ghost"
      style={{
        left: x + 12,
        top: y + 12,
        transform: `scale(${zoom})`,
        transformOrigin: 'top left',
      }}
      aria-hidden="true"
    >
      <GhostNode data={data} geometry={geometry} />
    </div>
  );
}
