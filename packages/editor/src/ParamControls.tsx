import type { ParamDefinition } from '@vector-nodes/core';

import { useNodeEdit } from './NodeEditContext';
import type { FlowSocket } from './flow';
import { asNumber, asRgba, asVec3, asVec3Array, hexToRgb, rgbToHex, type Vec3 } from './param';

interface ControlProps {
  param: ParamDefinition;
  value: unknown;
  onChange: (value: unknown) => void;
  /** When true, the control is shown read-only (e.g. an input is connected). */
  disabled?: boolean;
}

function NumberControl({ param, value, onChange, disabled }: ControlProps) {
  const isInt = param.type === 'Integer';
  return (
    <input
      className="nodrag vnode__input"
      type="number"
      step={isInt ? 1 : 'any'}
      min={param.min}
      max={param.max}
      disabled={disabled}
      value={asNumber(value)}
      onChange={(e) => {
        const n = Number(e.target.value);
        onChange(isInt ? Math.round(n) : n);
      }}
    />
  );
}

function BooleanControl({ value, onChange, disabled }: ControlProps) {
  const checked = Boolean(value);
  // Label on the left, checkbox on the right; the label wraps the checkbox so
  // clicking the text toggles it (issue #97).
  return (
    <label className="vnode__bool nodrag">
      <span className="vnode__bool-label">{checked ? 'true' : 'false'}</span>
      <input
        className="nodrag"
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}

function StringControl({ value, onChange, disabled }: ControlProps) {
  return (
    <input
      className="nodrag vnode__input"
      type="text"
      disabled={disabled}
      value={typeof value === 'string' ? value : ''}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function SelectControl({ param, value, onChange, disabled }: ControlProps) {
  return (
    <select
      className="nodrag vnode__input"
      disabled={disabled}
      value={typeof value === 'string' ? value : ''}
      onChange={(e) => onChange(e.target.value)}
    >
      {param.options?.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

function VectorControl({ value, onChange, disabled }: ControlProps) {
  const v = asVec3(value);
  const setAxis = (axis: number, n: number) => {
    const next = [...v] as Vec3;
    next[axis] = n;
    onChange(next);
  };
  return (
    <span className="vnode__vector">
      {([0, 1, 2] as const).map((axis) => (
        <input
          key={axis}
          className="nodrag vnode__input vnode__input--axis"
          type="number"
          step="any"
          aria-label={['x', 'y', 'z'][axis]}
          disabled={disabled}
          value={v[axis]}
          onChange={(e) => setAxis(axis, Number(e.target.value))}
        />
      ))}
    </span>
  );
}

function ColorControl({ value, onChange, disabled }: ControlProps) {
  const [r, g, b, a] = asRgba(value);
  const setAlpha = (n: number) => onChange([r, g, b, Math.max(0, Math.min(1, n))]);
  return (
    <span className="vnode__color">
      <input
        className="nodrag"
        type="color"
        aria-label="color"
        disabled={disabled}
        value={rgbToHex([r, g, b])}
        onChange={(e) => {
          const [nr, ng, nb] = hexToRgb(e.target.value);
          onChange([nr, ng, nb, a]);
        }}
      />
      <span className="vnode__opacity">
        <span className="vnode__param-label">opacity</span>
        <input
          className="nodrag vnode__alpha"
          type="range"
          min={0}
          max={1}
          step={0.01}
          aria-label="opacity"
          disabled={disabled}
          value={a}
          onChange={(e) => setAlpha(Number(e.target.value))}
        />
        <input
          className="nodrag vnode__input vnode__input--axis"
          type="number"
          step="any"
          min={0}
          max={1}
          aria-label="opacity value"
          disabled={disabled}
          value={a}
          onChange={(e) => setAlpha(Number(e.target.value))}
        />
      </span>
    </span>
  );
}

/**
 * Inline editor for a list of vectors (e.g. `VectorArray.values`, issue #83):
 * one xyz row per entry with a remove button, plus an add button. The array is a
 * constant source that can't be wired, so this is the only way to set it.
 */
function VectorArrayControl({ value, onChange, disabled }: ControlProps) {
  const items = asVec3Array(value);
  const setAxis = (index: number, axis: number, n: number) => {
    onChange(
      items.map((v, i) => {
        if (i !== index) return v;
        const next = [...v] as Vec3;
        next[axis] = n;
        return next;
      }),
    );
  };
  const addItem = () => onChange([...items, [0, 0, 0]]);
  const removeItem = (index: number) => onChange(items.filter((_, i) => i !== index));
  return (
    <div className="vnode__vec-array nodrag nowheel">
      {items.map((v, index) => (
        <div className="vnode__vec-array-row" key={index}>
          {([0, 1, 2] as const).map((axis) => (
            <input
              key={axis}
              className="nodrag vnode__input vnode__input--axis"
              type="number"
              step="any"
              aria-label={`${['x', 'y', 'z'][axis]} ${index}`}
              disabled={disabled}
              value={v[axis]}
              onChange={(e) => setAxis(index, axis, Number(e.target.value))}
            />
          ))}
          <button
            type="button"
            className="vnode__vec-array-remove"
            aria-label={`Remove vector ${index}`}
            title="Remove"
            disabled={disabled}
            onClick={() => removeItem(index)}
          >
            ×
          </button>
        </div>
      ))}
      <button type="button" className="vnode__vec-array-add" disabled={disabled} onClick={addItem}>
        + Add vector
      </button>
    </div>
  );
}

function ParamControl(props: ControlProps) {
  if (props.param.isArray) {
    if (props.param.type === 'Vector') {
      return <VectorArrayControl {...props} />;
    }
    return <span className="vnode__param-note">(array)</span>;
  }
  if (props.param.options && props.param.options.length > 0) {
    return <SelectControl {...props} />;
  }
  switch (props.param.type) {
    case 'Float':
    case 'Integer':
      return <NumberControl {...props} />;
    case 'Boolean':
      return <BooleanControl {...props} />;
    case 'String':
      return <StringControl {...props} />;
    case 'Vector':
      return <VectorControl {...props} />;
    case 'Color':
      return <ColorControl {...props} />;
    default:
      return <span className="vnode__param-note">(unsupported)</span>;
  }
}

/** Input socket types that get an inline default editor (issue #23). */
const EDITABLE_INPUT_TYPES = new Set(['Float', 'Integer', 'Boolean', 'String', 'Vector', 'Color']);

/** Whether an input socket should show an inline default editor. */
export function isEditableInput(socket: FlowSocket): boolean {
  return !socket.isArray && EDITABLE_INPUT_TYPES.has(socket.type);
}

export interface ParamControlsProps {
  nodeId: string;
  paramDefs: readonly ParamDefinition[];
  values: Record<string, unknown>;
}

/** A single param control bound to the node-edit context (no name label). */
export function ParamControlField({
  nodeId,
  param,
  value,
}: {
  nodeId: string;
  param: ParamDefinition;
  value: unknown;
}) {
  const { setParam } = useNodeEdit();
  return (
    <ParamControl param={param} value={value} onChange={(v) => setParam(nodeId, param.name, v)} />
  );
}

/**
 * Inline editor for an input socket's default value (issue #23). Shows the
 * socket name and a type-appropriate control; when `connected` the control is
 * disabled because the link supplies the value instead.
 */
export function InputDefaultField({
  nodeId,
  socket,
  value,
  connected,
}: {
  nodeId: string;
  socket: FlowSocket;
  value: unknown;
  connected: boolean;
}) {
  const { setInputDefault } = useNodeEdit();
  const param: ParamDefinition = {
    name: socket.name,
    type: socket.type,
    isArray: socket.isArray,
    ...(socket.min !== undefined ? { min: socket.min } : {}),
    ...(socket.max !== undefined ? { max: socket.max } : {}),
  };
  return (
    <label className={`vnode__input-default${connected ? ' vnode__input-default--connected' : ''}`}>
      <span className="vnode__socket-label">{socket.name}</span>
      <ParamControl
        param={param}
        value={value}
        disabled={connected}
        onChange={(v) => setInputDefault(nodeId, socket.name, v)}
      />
    </label>
  );
}

/** Inline editors for a node's params, dispatched by socket type. */
export function ParamControls({ nodeId, paramDefs, values }: ParamControlsProps) {
  const { setParam } = useNodeEdit();
  if (paramDefs.length === 0) return null;
  return (
    <div className="vnode__params nodrag nowheel">
      {paramDefs.map((param) => (
        <label
          className={`vnode__param${param.isArray ? ' vnode__param--block' : ''}`}
          key={param.name}
        >
          <span className="vnode__param-label">{param.name}</span>
          <ParamControl
            param={param}
            value={values[param.name]}
            onChange={(v) => setParam(nodeId, param.name, v)}
          />
        </label>
      ))}
    </div>
  );
}
