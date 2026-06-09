import type { ParamDefinition } from '@vector-nodes/core';

import { useNodeEdit } from './NodeEditContext';
import { asNumber, asRgba, asVec3, hexToRgb, rgbToHex, type Vec3 } from './param';

interface ControlProps {
  param: ParamDefinition;
  value: unknown;
  onChange: (value: unknown) => void;
}

function NumberControl({ param, value, onChange }: ControlProps) {
  const isInt = param.type === 'Integer';
  return (
    <input
      className="nodrag vnode__input"
      type="number"
      step={isInt ? 1 : 'any'}
      min={param.min}
      max={param.max}
      value={asNumber(value)}
      onChange={(e) => {
        const n = Number(e.target.value);
        onChange(isInt ? Math.round(n) : n);
      }}
    />
  );
}

function BooleanControl({ value, onChange }: ControlProps) {
  const checked = Boolean(value);
  return (
    <span className="vnode__bool">
      <input
        className="nodrag"
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="vnode__bool-label">{checked ? 'true' : 'false'}</span>
    </span>
  );
}

function StringControl({ value, onChange }: ControlProps) {
  return (
    <input
      className="nodrag vnode__input"
      type="text"
      value={typeof value === 'string' ? value : ''}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function VectorControl({ value, onChange }: ControlProps) {
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
          value={v[axis]}
          onChange={(e) => setAxis(axis, Number(e.target.value))}
        />
      ))}
    </span>
  );
}

function ColorControl({ value, onChange }: ControlProps) {
  const [r, g, b, a] = asRgba(value);
  const setAlpha = (n: number) => onChange([r, g, b, Math.max(0, Math.min(1, n))]);
  return (
    <span className="vnode__color">
      <input
        className="nodrag"
        type="color"
        aria-label="color"
        value={rgbToHex([r, g, b])}
        onChange={(e) => {
          const [nr, ng, nb] = hexToRgb(e.target.value);
          onChange([nr, ng, nb, a]);
        }}
      />
      <input
        className="nodrag vnode__alpha"
        type="range"
        min={0}
        max={1}
        step={0.01}
        aria-label="alpha"
        value={a}
        onChange={(e) => setAlpha(Number(e.target.value))}
      />
      <input
        className="nodrag vnode__input vnode__input--axis"
        type="number"
        step="any"
        min={0}
        max={1}
        aria-label="alpha value"
        value={a}
        onChange={(e) => setAlpha(Number(e.target.value))}
      />
    </span>
  );
}

function ParamControl(props: ControlProps) {
  if (props.param.isArray) {
    return <span className="vnode__param-note">(array)</span>;
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

export interface ParamControlsProps {
  nodeId: string;
  paramDefs: readonly ParamDefinition[];
  values: Record<string, unknown>;
}

/** Inline editors for a node's params, dispatched by socket type. */
export function ParamControls({ nodeId, paramDefs, values }: ParamControlsProps) {
  const { setParam } = useNodeEdit();
  if (paramDefs.length === 0) return null;
  return (
    <div className="vnode__params nodrag nowheel">
      {paramDefs.map((param) => (
        <label className="vnode__param" key={param.name}>
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
