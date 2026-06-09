import { Handle, Position, type NodeProps } from '@xyflow/react';

import { socketClassName, socketStyle, type FlowSocket, type VNodeFlowNode } from './flow';

function SocketRow({ socket, side }: { socket: FlowSocket; side: 'input' | 'output' }) {
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
      <span className="vnode__socket-label">{socket.name}</span>
    </div>
  );
}

/** Custom React Flow node: a labeled box with Blender-colored input/output sockets. */
export function VNode({ data }: NodeProps<VNodeFlowNode>) {
  return (
    <div className="vnode">
      <div className="vnode__header">{data.label}</div>
      <div className="vnode__body">
        <div className="vnode__col">
          {data.inputs.map((s) => (
            <SocketRow key={s.name} socket={s} side="input" />
          ))}
        </div>
        <div className="vnode__col vnode__col--outputs">
          {data.outputs.map((s) => (
            <SocketRow key={s.name} socket={s} side="output" />
          ))}
        </div>
      </div>
    </div>
  );
}
