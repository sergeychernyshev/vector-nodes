import { Handle, Position, useNodeConnections, useViewport, type NodeProps } from '@xyflow/react';
import type { ReactNode } from 'react';

import {
  socketClassName,
  socketStyle,
  type FlowNodeData,
  type FlowSocket,
  type VNodeFlowNode,
} from './flow';
import { useNodePreview } from './NodePreviewContext';
import {
  InputDefaultField,
  isEditableInput,
  ParamControlField,
  ParamControls,
} from './ParamControls';
import { SvgView } from './SvgView';

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
  /** Names of input sockets that currently have a link feeding them. */
  connectedInputs: Set<string | null | undefined>;
}

/**
 * The visual node card, shared by the live React Flow node ({@link VNode}) and
 * the placement ghost ({@link GhostNode}). The ghost variant draws static socket
 * dots instead of connectable handles.
 */
function NodeCard({ id, data, selected, ghost, connectedInputs }: NodeCardProps) {
  // Params that share a name with an output socket are edited inline on that
  // socket's row (e.g. constant nodes); the rest render in the block below.
  const outputNames = new Set(data.outputs.map((s) => s.name));
  const inlineParams = new Map(
    data.paramDefs.filter((p) => outputNames.has(p.name)).map((p) => [p.name, p]),
  );
  const blockParams = data.paramDefs.filter((p) => !inlineParams.has(p.name));

  // Per-node preview state (issue #79). The ghost copy never previews.
  const preview = useNodePreview();
  const previewable = !ghost && isPreviewable(data);
  const previewOpen = previewable && preview.open.has(id);
  const previewGeometry = preview.geometries[id];

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
          {previewGeometry ? (
            <SvgView geometry={previewGeometry} />
          ) : (
            <span className="vnode__preview-empty">No preview</span>
          )}
        </div>
      )}
      <div className={classes.join(' ')}>
        <div className="vnode__header">
          <span className="vnode__title">{data.label}</span>
          {previewable && (
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
export function GhostNode({ data }: { data: FlowNodeData }) {
  return <NodeCard id="ghost" data={data} ghost connectedInputs={new Set()} />;
}

/**
 * The placement ghost positioned at the cursor and scaled by the canvas zoom, so
 * it's the same size it will be once dropped onto the canvas. Reads the live
 * viewport, so only this overlay re-renders on pan/zoom (and only while a node is
 * armed for placement).
 */
export function PlacementGhost({ data, x, y }: { data: FlowNodeData; x: number; y: number }) {
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
      <GhostNode data={data} />
    </div>
  );
}
