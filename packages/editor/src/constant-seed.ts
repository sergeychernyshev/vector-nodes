import type { NodeDefinition } from '@vector-nodes/core';

import type { FlowSocket } from './flow';

/**
 * The value to seed a newly-created source node's `value` param with when it's
 * picked from the connect menu (issue #45), so that converting an input's inline
 * value into a constant node preserves that value. Returns the input's prior
 * value only when `def` is a constant — it has a `value` param — whose chosen
 * output type matches the input type *exactly* (no implicit conversion would
 * reshape the value). Otherwise `undefined`, leaving the node's own default.
 */
export function constantSeedValue(
  def: NodeDefinition | undefined,
  outputHandle: string,
  inputSocket: FlowSocket | undefined,
  priorValue: unknown,
): unknown {
  if (!def || !inputSocket || priorValue === undefined) return undefined;
  const hasValueParam = def.params.some((p) => p.name === 'value');
  const outType = def.outputs.find((o) => o.name === outputHandle)?.type;
  return hasValueParam && outType === inputSocket.type ? priorValue : undefined;
}
