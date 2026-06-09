import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { ReactNode } from 'react';

import { socketClassName, socketStyle, type FlowSocket, type VNodeFlowNode } from './flow';
import { ParamControlField, ParamControls } from './ParamControls';

function SocketRow({
  socket,
  side,
  control,
}: {
  socket: FlowSocket;
  side: 'input' | 'output';
  control?: ReactNode;
}) {
  const isInput = side === 'input';
  return (
    <div className={`vnode__port vnode__port--${side}`}>
      <Handle
        type={isInput ? 'target' : 'source'}
        position={isInput ? Position.Left : Position.Right}
        id={socket.name}
        className={socketClassName(socket)}
        style={socketStyle(socket)}
      />
      {control ?? <span className="vnode__socket-label">{socket.name}</span>}
    </div>
  );
}

/** Custom React Flow node: a labeled box with Blender-colored input/output sockets. */
export function VNode({ id, data, selected }: NodeProps<VNodeFlowNode>) {
  // Params that share a name with an output socket are edited inline on that
  // socket's row (e.g. constant nodes); the rest render in the block below.
  const outputNames = new Set(data.outputs.map((s) => s.name));
  const inlineParams = new Map(
    data.paramDefs.filter((p) => outputNames.has(p.name)).map((p) => [p.name, p]),
  );
  const blockParams = data.paramDefs.filter((p) => !inlineParams.has(p.name));

  return (
    <div className={selected ? 'vnode vnode--selected' : 'vnode'}>
      <div className="vnode__header">{data.label}</div>
      <div className="vnode__body">
        <div className="vnode__col">
          {data.inputs.map((s) => (
            <SocketRow key={s.name} socket={s} side="input" />
          ))}
        </div>
        <div className="vnode__col vnode__col--outputs">
          {data.outputs.map((s) => {
            const param = inlineParams.get(s.name);
            return (
              <SocketRow
                key={s.name}
                socket={s}
                side="output"
                control={
                  param ? (
                    <ParamControlField nodeId={id} param={param} value={data.params[param.name]} />
                  ) : undefined
                }
              />
            );
          })}
        </div>
      </div>
      <ParamControls nodeId={id} paramDefs={blockParams} values={data.params} />
    </div>
  );
}
