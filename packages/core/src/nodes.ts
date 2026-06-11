import type { NodeDefinition, SocketDefinition } from './node-definition.js';
import { NodeRegistry } from './registry.js';
import { SOCKET_TYPES, type SocketType } from './socket-types.js';

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

/** The socket type a Parameter node exposes (e.g. `ParameterFloat` → `Float`), or `null`. */
export function parameterSocketType(type: string): SocketType | null {
  return isParameterNodeType(type)
    ? (type.slice(PARAMETER_NODE_PREFIX.length) as SocketType)
    : null;
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

// The point-source nodes (grid/line/circle/random) all emit the same pair of
// outputs: a geometry bundle and the raw point field.
const pointSourceOutputs = [
  { name: 'geometry', type: 'Geometry' as const },
  { name: 'points', type: 'Vector' as const, isArray: true },
];

/**
 * A point-source node definition: shared outputs, mode-specific config. The
 * config fields are input sockets (issue #58) so they can be typed in or wired.
 */
function pointSourceDef(type: string, label: string, config: SocketDefinition[]): NodeDefinition {
  return {
    type,
    label,
    category: 'Geometry',
    inputs: config,
    outputs: pointSourceOutputs,
    params: [],
  };
}

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

  // Geometry — point sources, one node per pattern
  pointSourceDef('PointGrid', 'Point Grid', [
    { name: 'countX', type: 'Integer', default: 3, min: 1 },
    { name: 'countY', type: 'Integer', default: 3, min: 1 },
    { name: 'spacingX', type: 'Float', default: 1 },
    { name: 'spacingY', type: 'Float', default: 1 },
  ]),
  pointSourceDef('PointLine', 'Point Line', [
    { name: 'start', type: 'Vector', default: [0, 0, 0] },
    { name: 'end', type: 'Vector', default: [1, 0, 0] },
    { name: 'count', type: 'Integer', default: 8, min: 0 },
  ]),
  pointSourceDef('PointCircle', 'Point Circle', [
    { name: 'radius', type: 'Float', default: 1 },
    { name: 'count', type: 'Integer', default: 8, min: 0 },
  ]),
  pointSourceDef('PointRandom', 'Point Random', [
    { name: 'count', type: 'Integer', default: 8, min: 0 },
    { name: 'min', type: 'Vector', default: [0, 0, 0] },
    { name: 'max', type: 'Vector', default: [1, 1, 1] },
    { name: 'seed', type: 'Integer', default: 0 },
  ]),
  {
    type: 'Project',
    label: 'Project',
    category: 'Geometry',
    inputs: [
      { name: 'geometry', type: 'Geometry' },
      { name: 'distance', type: 'Float', default: 10 },
    ],
    outputs: [{ name: 'geometry', type: 'Geometry' }],
    params: [
      {
        name: 'mode',
        type: 'String',
        default: 'orthographic',
        options: ['orthographic', 'perspective'],
      },
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
      { name: 'segments', type: 'Integer', default: 16, min: 1 },
    ],
    outputs: [
      { name: 'geometry', type: 'Geometry' },
      { name: 'points', type: 'Vector', isArray: true },
    ],
    params: [],
  },

  // Transforms (Phase 7)
  {
    type: 'RotateGeometry',
    label: 'Rotate',
    category: 'Geometry',
    inputs: [
      { name: 'geometry', type: 'Geometry' },
      { name: 'axis', type: 'Vector', default: [0, 0, 1] },
      { name: 'angle', type: 'Float', default: 0 },
    ],
    outputs: [{ name: 'geometry', type: 'Geometry' }],
    params: [],
  },
  {
    type: 'ScaleGeometry',
    label: 'Scale',
    category: 'Geometry',
    inputs: [
      { name: 'geometry', type: 'Geometry' },
      { name: 'factor', type: 'Vector', default: [1, 1, 1] },
    ],
    outputs: [{ name: 'geometry', type: 'Geometry' }],
    params: [],
  },

  // Curves (Phase 7)
  {
    type: 'CircleCurve',
    label: 'Circle',
    category: 'Geometry',
    inputs: [
      { name: 'radius', type: 'Float', default: 1 },
      { name: 'count', type: 'Integer', default: 16, min: 3 },
    ],
    outputs: [{ name: 'geometry', type: 'Geometry' }],
    params: [],
  },
  {
    type: 'Polyline',
    label: 'Polyline',
    category: 'Geometry',
    // `points` is a Vector field input (issue #56); `closed` is a Boolean input
    // (issue #58) — both wirable or set inline.
    inputs: [
      { name: 'points', type: 'Vector', isArray: true, default: [] },
      { name: 'closed', type: 'Boolean', default: false },
    ],
    outputs: [{ name: 'geometry', type: 'Geometry' }],
    params: [],
  },

  // Curve primitives (issue #114)
  {
    type: 'StarCurve',
    label: 'Star',
    category: 'Geometry',
    inputs: [
      { name: 'points', type: 'Integer', default: 5, min: 2 },
      { name: 'innerRadius', type: 'Float', default: 0.5 },
      { name: 'outerRadius', type: 'Float', default: 1 },
    ],
    outputs: [{ name: 'geometry', type: 'Geometry' }],
    params: [],
  },
  {
    type: 'ArcCurve',
    label: 'Arc',
    category: 'Geometry',
    // Angles are radians, consistent with RotateGeometry.
    inputs: [
      { name: 'radius', type: 'Float', default: 1 },
      { name: 'startAngle', type: 'Float', default: 0 },
      { name: 'sweepAngle', type: 'Float', default: Math.PI / 2 },
      { name: 'segments', type: 'Integer', default: 16, min: 1 },
    ],
    outputs: [{ name: 'geometry', type: 'Geometry' }],
    params: [],
  },
  {
    type: 'SpiralCurve',
    label: 'Spiral',
    category: 'Geometry',
    inputs: [
      { name: 'turns', type: 'Float', default: 2 },
      { name: 'startRadius', type: 'Float', default: 0 },
      { name: 'endRadius', type: 'Float', default: 1 },
      { name: 'height', type: 'Float', default: 0 },
      { name: 'segments', type: 'Integer', default: 64, min: 1 },
    ],
    outputs: [{ name: 'geometry', type: 'Geometry' }],
    params: [],
  },
  {
    type: 'RectangleCurve',
    label: 'Rectangle',
    category: 'Geometry',
    inputs: [
      { name: 'width', type: 'Float', default: 1 },
      { name: 'height', type: 'Float', default: 1 },
    ],
    outputs: [{ name: 'geometry', type: 'Geometry' }],
    params: [],
  },
  {
    type: 'QuadraticBezier',
    label: 'Quadratic Bezier',
    category: 'Geometry',
    // Defaults draw a visible arch (unlike all-zero, which is a degenerate point).
    inputs: [
      { name: 'p0', type: 'Vector', default: [-1, 0, 0] },
      { name: 'p1', type: 'Vector', default: [0, 1, 0] },
      { name: 'p2', type: 'Vector', default: [1, 0, 0] },
      { name: 'segments', type: 'Integer', default: 16, min: 1 },
    ],
    outputs: [
      { name: 'geometry', type: 'Geometry' },
      { name: 'points', type: 'Vector', isArray: true },
    ],
    params: [],
  },

  // Curve sampling ops (issue #115): per-curve rewrites; points/meshes pass through.
  {
    type: 'ResampleCurve',
    label: 'Resample Curve',
    category: 'Geometry',
    inputs: [
      { name: 'geometry', type: 'Geometry' },
      { name: 'count', type: 'Integer', default: 16, min: 2 },
    ],
    outputs: [{ name: 'geometry', type: 'Geometry' }],
    params: [],
  },
  {
    type: 'SubdivideCurve',
    label: 'Subdivide Curve',
    category: 'Geometry',
    inputs: [
      { name: 'geometry', type: 'Geometry' },
      { name: 'cuts', type: 'Integer', default: 1, min: 0 },
    ],
    outputs: [{ name: 'geometry', type: 'Geometry' }],
    params: [],
  },
  {
    type: 'ReverseCurve',
    label: 'Reverse Curve',
    category: 'Geometry',
    inputs: [{ name: 'geometry', type: 'Geometry' }],
    outputs: [{ name: 'geometry', type: 'Geometry' }],
    params: [],
  },
  // Rounded corners (issue #116).
  {
    type: 'FilletCurve',
    label: 'Fillet Curve',
    category: 'Geometry',
    inputs: [
      { name: 'geometry', type: 'Geometry' },
      { name: 'radius', type: 'Float', default: 0.1, min: 0 },
      { name: 'resolution', type: 'Integer', default: 4, min: 1 },
    ],
    outputs: [{ name: 'geometry', type: 'Geometry' }],
    params: [],
  },
  {
    type: 'TrimCurve',
    label: 'Trim Curve',
    category: 'Geometry',
    inputs: [
      { name: 'geometry', type: 'Geometry' },
      { name: 'start', type: 'Float', default: 0, min: 0, max: 1 },
      { name: 'end', type: 'Float', default: 1, min: 0, max: 1 },
    ],
    outputs: [{ name: 'geometry', type: 'Geometry' }],
    params: [],
  },

  // Fill closed curves into mesh faces (issue #117).
  {
    type: 'FillCurve',
    label: 'Fill Curve',
    category: 'Geometry',
    inputs: [{ name: 'geometry', type: 'Geometry' }],
    outputs: [{ name: 'geometry', type: 'Geometry' }],
    params: [],
  },

  // Combinators (Phase 7)
  {
    type: 'MergeGeometry',
    label: 'Merge',
    category: 'Geometry',
    // One array input that accepts many geometry connections (issue #99).
    inputs: [{ name: 'geometry', type: 'Geometry', isArray: true, default: [] }],
    outputs: [{ name: 'geometry', type: 'Geometry' }],
    params: [],
  },
  {
    type: 'BoundingBox',
    label: 'Bounding Box',
    category: 'Geometry',
    inputs: [{ name: 'geometry', type: 'Geometry' }],
    outputs: [{ name: 'geometry', type: 'Geometry' }],
    params: [],
  },
  {
    type: 'ColorGeometry',
    label: 'Set Color',
    category: 'Geometry',
    inputs: [
      { name: 'geometry', type: 'Geometry' },
      { name: 'color', type: 'Color', default: [1, 1, 1, 1] },
    ],
    outputs: [{ name: 'geometry', type: 'Geometry' }],
    params: [],
  },
  {
    type: 'InstanceOnPoints',
    label: 'Instance on Points',
    category: 'Geometry',
    inputs: [
      { name: 'geometry', type: 'Geometry' },
      { name: 'points', type: 'Vector', isArray: true, default: [] },
    ],
    outputs: [{ name: 'geometry', type: 'Geometry' }],
    params: [],
  },

  // Utility (Phase 7)
  {
    type: 'MathFloat',
    label: 'Math',
    category: 'Utility',
    inputs: [
      { name: 'a', type: 'Float', default: 0 },
      { name: 'b', type: 'Float', default: 0 },
    ],
    outputs: [{ name: 'value', type: 'Float' }],
    params: [
      {
        name: 'operation',
        type: 'String',
        default: 'add',
        options: ['add', 'subtract', 'multiply', 'divide', 'min', 'max', 'power'],
      },
    ],
  },
  {
    type: 'MapRange',
    label: 'Map Range',
    category: 'Utility',
    inputs: [
      { name: 'value', type: 'Float', default: 0 },
      { name: 'fromMin', type: 'Float', default: 0 },
      { name: 'fromMax', type: 'Float', default: 1 },
      { name: 'toMin', type: 'Float', default: 0 },
      { name: 'toMax', type: 'Float', default: 1 },
    ],
    outputs: [{ name: 'value', type: 'Float' }],
    params: [],
  },
  {
    type: 'Clamp',
    label: 'Clamp',
    category: 'Utility',
    inputs: [
      { name: 'value', type: 'Float', default: 0 },
      { name: 'min', type: 'Float', default: 0 },
      { name: 'max', type: 'Float', default: 1 },
    ],
    outputs: [{ name: 'value', type: 'Float' }],
    params: [],
  },

  // Mesh primitives (Phase 8)
  {
    type: 'PlaneMesh',
    label: 'Plane',
    category: 'Mesh',
    inputs: [
      { name: 'width', type: 'Float', default: 1 },
      { name: 'height', type: 'Float', default: 1 },
    ],
    outputs: [{ name: 'geometry', type: 'Geometry' }],
    params: [],
  },
  {
    type: 'BoxMesh',
    label: 'Cube',
    category: 'Mesh',
    inputs: [
      { name: 'width', type: 'Float', default: 1 },
      { name: 'height', type: 'Float', default: 1 },
      { name: 'depth', type: 'Float', default: 1 },
    ],
    outputs: [{ name: 'geometry', type: 'Geometry' }],
    params: [],
  },
  {
    type: 'GridMesh',
    label: 'Grid',
    category: 'Mesh',
    inputs: [
      { name: 'countX', type: 'Integer', default: 4, min: 1 },
      { name: 'countY', type: 'Integer', default: 4, min: 1 },
      { name: 'sizeX', type: 'Float', default: 2 },
      { name: 'sizeY', type: 'Float', default: 2 },
    ],
    outputs: [{ name: 'geometry', type: 'Geometry' }],
    params: [],
  },
  {
    type: 'UVSphere',
    label: 'UV Sphere',
    category: 'Mesh',
    inputs: [
      { name: 'radius', type: 'Float', default: 1 },
      { name: 'segments', type: 'Integer', default: 16, min: 3 },
      { name: 'rings', type: 'Integer', default: 8, min: 2 },
    ],
    outputs: [{ name: 'geometry', type: 'Geometry' }],
    params: [],
  },
  {
    type: 'CylinderMesh',
    label: 'Cylinder',
    category: 'Mesh',
    inputs: [
      { name: 'radius', type: 'Float', default: 1 },
      { name: 'height', type: 'Float', default: 2 },
      { name: 'segments', type: 'Integer', default: 16, min: 3 },
    ],
    outputs: [{ name: 'geometry', type: 'Geometry' }],
    params: [],
  },
  {
    type: 'ConeMesh',
    label: 'Cone',
    category: 'Mesh',
    inputs: [
      { name: 'radius', type: 'Float', default: 1 },
      { name: 'height', type: 'Float', default: 2 },
      { name: 'segments', type: 'Integer', default: 16, min: 3 },
    ],
    outputs: [{ name: 'geometry', type: 'Geometry' }],
    params: [],
  },

  // Mesh ops (Phase 8)
  {
    type: 'TriangulateMesh',
    label: 'Triangulate',
    category: 'Mesh',
    inputs: [{ name: 'geometry', type: 'Geometry' }],
    outputs: [{ name: 'geometry', type: 'Geometry' }],
    params: [],
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
