import type { NodeDefinition, ParamDefinition } from './node-definition';
import { NodeRegistry } from './registry';
import { SOCKET_TYPES, type SocketType } from './socket-types';

/** Prefix shared by the per-type Parameter node types (e.g. `ParameterFloat`). */
export const PARAMETER_NODE_PREFIX = 'Parameter';

/** The node type that exposes a network parameter of socket type `type`. */
export function parameterNodeType(type: SocketType): string {
  return `${PARAMETER_NODE_PREFIX}${type}`;
}

/** Whether `type` is one of the generated Parameter node types. */
export function isParameterNodeType(type: string): boolean {
  return (
    type.startsWith(PARAMETER_NODE_PREFIX) &&
    (SOCKET_TYPES as readonly string[]).includes(type.slice(PARAMETER_NODE_PREFIX.length))
  );
}

/** Every Parameter node type, one per socket type (incl. `ParameterGeometry`). */
export const PARAMETER_NODE_TYPES: string[] = SOCKET_TYPES.map(parameterNodeType);

/** A constant node: a single param `value` echoed to a `value` output. */
function constantDef(type: string, socketType: SocketType, defaultValue: unknown): NodeDefinition {
  return {
    type,
    label: `${socketType} Constant`,
    category: 'Input',
    inputs: [],
    outputs: [{ name: 'value', type: socketType }],
    params: [{ name: 'value', type: socketType, default: defaultValue }],
  };
}

const xyzInputs = [
  { name: 'x', type: 'Float' as const, default: 0 },
  { name: 'y', type: 'Float' as const, default: 0 },
  { name: 'z', type: 'Float' as const, default: 0 },
];

const pointArrayParams: ParamDefinition[] = [
  {
    name: 'mode',
    type: 'String',
    default: 'grid',
    options: ['grid', 'line', 'circle', 'random'],
  },
  { name: 'countX', type: 'Integer', default: 3, min: 1 },
  { name: 'countY', type: 'Integer', default: 3, min: 1 },
  { name: 'spacingX', type: 'Float', default: 1 },
  { name: 'spacingY', type: 'Float', default: 1 },
  { name: 'start', type: 'Vector', default: [0, 0, 0] },
  { name: 'end', type: 'Vector', default: [1, 0, 0] },
  { name: 'count', type: 'Integer', default: 8, min: 0 },
  { name: 'radius', type: 'Float', default: 1 },
  { name: 'min', type: 'Vector', default: [0, 0, 0] },
  { name: 'max', type: 'Vector', default: [1, 1, 1] },
  { name: 'seed', type: 'Integer', default: 0 },
];

const parameterDefs: NodeDefinition[] = SOCKET_TYPES.map((type) => ({
  type: parameterNodeType(type),
  label: `Parameter (${type})`,
  category: 'Input',
  inputs: [],
  outputs: [{ name: 'value', type }],
  params: [{ name: 'name', type: 'String', default: '' }],
}));

/** Declarative definitions for the basic node set (Phase 2). */
export const BASIC_NODE_DEFINITIONS: NodeDefinition[] = [
  // Constants
  constantDef('ConstFloat', 'Float', 0),
  constantDef('ConstInteger', 'Integer', 0),
  constantDef('ConstBoolean', 'Boolean', false),
  constantDef('ConstVector', 'Vector', [0, 0, 0]),
  constantDef('ConstColor', 'Color', [0, 0, 0, 1]),
  constantDef('ConstString', 'String', ''),

  // Vector construction / decomposition
  {
    type: 'Point',
    label: 'Point',
    category: 'Vector',
    inputs: xyzInputs,
    outputs: [{ name: 'point', type: 'Vector' }],
    params: [],
  },
  {
    type: 'Vector',
    label: 'Vector',
    category: 'Vector',
    inputs: xyzInputs,
    outputs: [{ name: 'vector', type: 'Vector' }],
    params: [],
  },
  {
    type: 'CombineXYZ',
    label: 'Combine XYZ',
    category: 'Vector',
    inputs: xyzInputs,
    outputs: [{ name: 'vector', type: 'Vector' }],
    params: [],
  },
  {
    type: 'SeparateXYZ',
    label: 'Separate XYZ',
    category: 'Vector',
    inputs: [{ name: 'vector', type: 'Vector', default: [0, 0, 0] }],
    outputs: [
      { name: 'x', type: 'Float' },
      { name: 'y', type: 'Float' },
      { name: 'z', type: 'Float' },
    ],
    params: [],
  },
  {
    type: 'VectorMath',
    label: 'Vector Math',
    category: 'Vector',
    inputs: [
      { name: 'a', type: 'Vector', default: [0, 0, 0] },
      { name: 'b', type: 'Vector', default: [0, 0, 0] },
      { name: 'scale', type: 'Float', default: 1 },
    ],
    outputs: [
      { name: 'vector', type: 'Vector' },
      { name: 'value', type: 'Float' },
    ],
    params: [
      {
        name: 'operation',
        type: 'String',
        default: 'add',
        options: ['add', 'subtract', 'scale', 'dot', 'cross', 'normalize', 'length', 'distance'],
      },
    ],
  },
  {
    type: 'VectorArray',
    label: 'Vector Array',
    category: 'Vector',
    inputs: [],
    outputs: [{ name: 'vectors', type: 'Vector', isArray: true }],
    params: [{ name: 'values', type: 'Vector', isArray: true, default: [] }],
  },

  // Geometry
  {
    type: 'PointArray',
    label: 'Point Array',
    category: 'Geometry',
    inputs: [],
    outputs: [
      { name: 'geometry', type: 'Geometry' },
      { name: 'points', type: 'Vector', isArray: true },
    ],
    params: pointArrayParams,
  },
  {
    type: 'Project',
    label: 'Project',
    category: 'Geometry',
    inputs: [{ name: 'geometry', type: 'Geometry' }],
    outputs: [{ name: 'geometry', type: 'Geometry' }],
    params: [
      {
        name: 'mode',
        type: 'String',
        default: 'orthographic',
        options: ['orthographic', 'perspective'],
      },
      { name: 'distance', type: 'Float', default: 10 },
    ],
  },
  {
    type: 'Translate',
    label: 'Translate',
    category: 'Geometry',
    inputs: [
      { name: 'geometry', type: 'Geometry' },
      { name: 'offset', type: 'Vector', default: [0, 0, 0] },
    ],
    outputs: [{ name: 'geometry', type: 'Geometry' }],
    params: [],
  },
  {
    type: 'BezierCurve',
    label: 'Bezier Curve',
    category: 'Geometry',
    inputs: [
      { name: 'p0', type: 'Vector', default: [0, 0, 0] },
      { name: 'p1', type: 'Vector', default: [0, 0, 0] },
      { name: 'p2', type: 'Vector', default: [0, 0, 0] },
      { name: 'p3', type: 'Vector', default: [0, 0, 0] },
    ],
    outputs: [
      { name: 'geometry', type: 'Geometry' },
      { name: 'points', type: 'Vector', isArray: true },
    ],
    params: [{ name: 'segments', type: 'Integer', default: 16, min: 1 }],
  },

  // Parameters (one per socket type, incl. Geometry)
  ...parameterDefs,

  // Output
  {
    type: 'OutputGeometry',
    label: 'Output Geometry',
    category: 'Output',
    inputs: [{ name: 'geometry', type: 'Geometry' }],
    outputs: [],
    params: [],
  },
];

/** A {@link NodeRegistry} pre-populated with the basic node definitions. */
export function createBasicRegistry(): NodeRegistry {
  return new NodeRegistry(BASIC_NODE_DEFINITIONS);
}
