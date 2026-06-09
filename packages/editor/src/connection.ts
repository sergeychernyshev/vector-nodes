import { canConvertImplicitly } from '@vector-nodes/core';
import type { Edge } from '@xyflow/react';

import type { FlowSocket, VNodeFlowNode } from './flow';

/** A proposed or existing connection (React Flow `Connection` or `Edge`). */
export interface ConnectionLike {
  source: string | null;
  target: string | null;
  sourceHandle?: string | null;
  targetHandle?: string | null;
}

/** Result of validating a connection. */
export interface ConnectionCheck {
  ok: boolean;
  /** Human-readable reason, present when `ok` is false. */
  reason?: string;
}

function reject(reason: string): ConnectionCheck {
  return { ok: false, reason };
}

function findSocket(sockets: FlowSocket[], name: string): FlowSocket | undefined {
  return sockets.find((s) => s.name === name);
}

/**
 * Validate a proposed connection against the editor's node sockets, mirroring
 * core's static link rules: an input takes a single link, types must match or be
 * implicitly convertible, and field/single must agree. Returns a rejection
 * reason for display when invalid.
 */
export function checkConnection(
  connection: ConnectionLike,
  nodes: VNodeFlowNode[],
  edges: Edge[],
): ConnectionCheck {
  const { source, target, sourceHandle, targetHandle } = connection;
  if (!source || !target || !sourceHandle || !targetHandle) {
    return reject('Incomplete connection.');
  }
  if (source === target) {
    return reject('A node cannot connect to itself.');
  }

  const sourceNode = nodes.find((n) => n.id === source);
  const targetNode = nodes.find((n) => n.id === target);
  if (!sourceNode || !targetNode) {
    return reject('Connection references a missing node.');
  }

  const outSocket = findSocket(sourceNode.data.outputs, sourceHandle);
  const inSocket = findSocket(targetNode.data.inputs, targetHandle);
  if (!outSocket) return reject(`No output socket "${sourceHandle}".`);
  if (!inSocket) return reject(`No input socket "${targetHandle}".`);

  const occupied = edges.some((e) => e.target === target && e.targetHandle === targetHandle);
  if (occupied) {
    return reject(`Input "${targetHandle}" is already connected.`);
  }

  if (outSocket.isArray !== inSocket.isArray) {
    return reject(
      `Cannot connect a ${outSocket.isArray ? 'field' : 'single value'} to a ${
        inSocket.isArray ? 'field' : 'single value'
      }.`,
    );
  }

  if (!canConvertImplicitly(outSocket.type, inSocket.type)) {
    return reject(`Cannot connect ${outSocket.type} to ${inSocket.type} (no implicit conversion).`);
  }

  return { ok: true };
}
