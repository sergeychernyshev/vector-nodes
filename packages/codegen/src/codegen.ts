import {
  assertValidGraph,
  flattenMetaNodes,
  getOutputNode,
  isParameterNodeType,
  resolveParamDefaults,
  type Graph,
  type GraphLink,
  type GraphNode,
  type NodeRegistry,
  type SocketType,
} from '@vector-nodes/core';

/**
 * The compatible `@vector-nodes/runtime` semver range that generated modules
 * import from. Kept in lockstep with this package's version by Changesets.
 */
export const RUNTIME_RANGE = '^0.2.0';

/** A function parameter of the generated module. */
export interface GeneratedParam {
  /** JS identifier (sanitized parameter id). */
  name: string;
  /** Idiomatic TypeScript type for the parameter's socket type. */
  tsType: string;
}

/** The result of generating code for a graph. */
export interface GeneratedModule {
  /** The exported function name (sanitized from the network metadata). */
  name: string;
  params: GeneratedParam[];
  /** Runtime helper names the body references (imported from `@vector-nodes/runtime`). */
  uses: string[];
  /** The function body (statements + a `return`), shared by the TS and JS targets. */
  body: string;
  /** Full TypeScript module source (`export default function …(): Geometry`). */
  ts: string;
  /** Full JavaScript module source (same logic, no type annotations). */
  js: string;
  /** The runtime dependency the generated module needs at a compatible range. */
  runtimeDependency: Record<string, string>;
}

/** A minimal `package.json` for shipping a generated module standalone. */
export function generatedPackageJson(mod: GeneratedModule): string {
  return `${JSON.stringify(
    {
      name: mod.name,
      version: '0.0.0',
      type: 'module',
      main: `./${mod.name}.js`,
      dependencies: mod.runtimeDependency,
    },
    null,
    2,
  )}\n`;
}

/** Idiomatic TypeScript type for a socket type. */
export function tsTypeOf(type: SocketType): string {
  switch (type) {
    case 'Float':
    case 'Integer':
      return 'number';
    case 'Boolean':
      return 'boolean';
    case 'Vector':
      return '[number, number, number]';
    case 'Color':
      return '[number, number, number, number]';
    case 'String':
      return 'string';
    case 'Geometry':
      return 'Geometry';
    case 'Matrix':
      return 'number[]';
  }
}

/** Serialize a baked value to JS source. */
export function lit(value: unknown): string {
  if (value === undefined || value === null) return 'undefined';
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'string') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(lit).join(', ')}]`;
  return JSON.stringify(value);
}

/** Turn an arbitrary id/name into a safe JS identifier. */
export function sanitize(name: string): string {
  const cleaned = name.replace(/[^A-Za-z0-9_$]/g, '_');
  return /^[A-Za-z_$]/.test(cleaned) ? cleaned : `_${cleaned}`;
}

interface EmitContext {
  varName: string;
  inputs: Record<string, string>;
  params: Record<string, unknown>;
}

interface Emit {
  /** Statements to emit before the node's `const` (e.g. a shared temp). */
  pre?: string[];
  /** Expression for the node's output record `{ socket: value, … }`. */
  expr: string;
  /** Runtime helpers referenced. */
  uses: string[];
}

type Emitter = (ctx: EmitContext) => Emit;

const xyz =
  (out: string): Emitter =>
  ({ inputs }) => ({
    expr: `{ ${out}: [${inputs.x}, ${inputs.y}, ${inputs.z}] }`,
    uses: [],
  });

const pointSource = (
  call: (input: Record<string, string>) => { expr: string; use: string },
): Emitter => {
  return ({ varName, inputs }) => {
    // Config fields are inputs (issue #58); `inputs.x` is already an expression.
    const { expr, use } = call(inputs);
    const pts = `${varName}_pts`;
    return {
      pre: [`const ${pts} = ${expr};`],
      expr: `{ geometry: { points: ${pts}, curves: [], meshes: [] }, points: ${pts} }`,
      uses: [use],
    };
  };
};

const VECTOR_MATH: Record<string, (a: string, b: string, s: string) => Emit> = {
  add: (a, b) => ({ expr: `{ vector: add(${a}, ${b}), value: 0 }`, uses: ['add'] }),
  subtract: (a, b) => ({ expr: `{ vector: sub(${a}, ${b}), value: 0 }`, uses: ['sub'] }),
  multiply: (a, b) => ({
    expr: `{ vector: scaleAxes(${a}, ${b}), value: 0 }`,
    uses: ['scaleAxes'],
  }),
  divide: (a, b) => ({
    expr: `{ vector: divideAxes(${a}, ${b}), value: 0 }`,
    uses: ['divideAxes'],
  }),
  scale: (a, _b, s) => ({ expr: `{ vector: scale(${a}, ${s}), value: 0 }`, uses: ['scale'] }),
  cross: (a, b) => ({ expr: `{ vector: cross(${a}, ${b}), value: 0 }`, uses: ['cross'] }),
  normalize: (a) => ({ expr: `{ vector: normalize(${a}), value: 0 }`, uses: ['normalize'] }),
  min: (a, b) => ({ expr: `{ vector: minAxes(${a}, ${b}), value: 0 }`, uses: ['minAxes'] }),
  max: (a, b) => ({ expr: `{ vector: maxAxes(${a}, ${b}), value: 0 }`, uses: ['maxAxes'] }),
  reflect: (a, b) => ({ expr: `{ vector: reflect(${a}, ${b}), value: 0 }`, uses: ['reflect'] }),
  // `a` rotated around the axis `b` by `scale` radians (issue #118).
  rotate: (a, b, s) => ({
    expr: `{ vector: rotateAxisAngle(${a}, ${b}, ${s}), value: 0 }`,
    uses: ['rotateAxisAngle'],
  }),
  dot: (a, b) => ({ expr: `{ vector: [0, 0, 0], value: dot(${a}, ${b}) }`, uses: ['dot'] }),
  length: (a) => ({ expr: `{ vector: [0, 0, 0], value: length(${a}) }`, uses: ['length'] }),
  distance: (a, b) => ({
    expr: `{ vector: [0, 0, 0], value: distance(${a}, ${b}) }`,
    uses: ['distance'],
  }),
};

const EMITTERS: Record<string, Emitter> = {
  ConstFloat: ({ params }) => ({ expr: `{ value: ${lit(params.value)} }`, uses: [] }),
  ConstInteger: ({ params }) => ({ expr: `{ value: ${lit(params.value)} }`, uses: [] }),
  ConstBoolean: ({ params }) => ({ expr: `{ value: ${lit(params.value)} }`, uses: [] }),
  ConstVector: ({ params }) => ({ expr: `{ value: ${lit(params.value)} }`, uses: [] }),
  ConstColor: ({ params }) => ({ expr: `{ value: ${lit(params.value)} }`, uses: [] }),
  ConstString: ({ params }) => ({ expr: `{ value: ${lit(params.value)} }`, uses: [] }),
  Point: xyz('point'),
  Vector: xyz('vector'),
  CombineXYZ: xyz('vector'),
  SeparateXYZ: ({ inputs }) => ({
    expr: `{ x: ${inputs.vector}[0], y: ${inputs.vector}[1], z: ${inputs.vector}[2] }`,
    uses: [],
  }),
  VectorMath: ({ inputs, params }) => {
    const op = VECTOR_MATH[String(params.operation)];
    if (!op)
      throw new Error(`codegen: unknown VectorMath operation "${String(params.operation)}".`);
    return op(inputs.a!, inputs.b!, inputs.scale!);
  },
  VectorArray: ({ params }) => ({
    expr: `{ vectors: fromList(${lit(params.values)}) }`,
    uses: ['fromList'],
  }),
  PointGrid: pointSource((p) => ({
    expr: `gridPoints(${p.countX}, ${p.countY}, ${p.spacingX}, ${p.spacingY})`,
    use: 'gridPoints',
  })),
  PointLine: pointSource((p) => ({
    expr: `linePoints(${p.start}, ${p.end}, ${p.count})`,
    use: 'linePoints',
  })),
  PointCircle: pointSource((p) => ({
    expr: `circlePoints(${p.radius}, ${p.count})`,
    use: 'circlePoints',
  })),
  PointRandom: pointSource((p) => ({
    expr: `randomPoints(${p.count}, ${p.min}, ${p.max}, ${p.seed})`,
    use: 'randomPoints',
  })),
  Project: ({ inputs, params }) =>
    String(params.mode) === 'perspective'
      ? {
          expr: `{ geometry: transformGeometry(${inputs.geometry}, (p) => projectPerspective(p, ${inputs.distance})) }`,
          uses: ['transformGeometry', 'projectPerspective'],
        }
      : {
          expr: `{ geometry: transformGeometry(${inputs.geometry}, (p) => projectOrthographic(p)) }`,
          uses: ['transformGeometry', 'projectOrthographic'],
        },
  Translate: ({ inputs }) => ({
    expr: `{ geometry: transformGeometry(${inputs.geometry}, (p) => add(p, ${inputs.offset})) }`,
    uses: ['transformGeometry', 'add'],
  }),
  BezierCurve: ({ varName, inputs }) => {
    const pts = `${varName}_pts`;
    return {
      pre: [
        `const ${pts} = sampleCubicBezier(${inputs.p0}, ${inputs.p1}, ${inputs.p2}, ${inputs.p3}, ${inputs.segments});`,
      ],
      expr: `{ geometry: { points: ${pts}, curves: [{ points: ${pts}, closed: false }], meshes: [] }, points: ${pts} }`,
      uses: ['sampleCubicBezier'],
    };
  },
  RotateGeometry: ({ inputs }) => ({
    expr: `{ geometry: transformGeometry(${inputs.geometry}, (p) => rotateAxisAngle(p, ${inputs.axis}, ${inputs.angle})) }`,
    uses: ['transformGeometry', 'rotateAxisAngle'],
  }),
  ScaleGeometry: ({ inputs }) => ({
    expr: `{ geometry: transformGeometry(${inputs.geometry}, (p) => scaleAxes(p, ${inputs.factor})) }`,
    uses: ['transformGeometry', 'scaleAxes'],
  }),
  CircleCurve: ({ inputs }) => ({
    expr: `{ geometry: curveGeometry(circleCurve(${inputs.radius}, ${inputs.count})) }`,
    uses: ['curveGeometry', 'circleCurve'],
  }),
  Polyline: ({ inputs }) => ({
    expr: `{ geometry: curveGeometry(polyline(${inputs.points}, ${inputs.closed})) }`,
    uses: ['curveGeometry', 'polyline'],
  }),
  // Curve primitives (issue #114).
  StarCurve: ({ inputs }) => ({
    expr: `{ geometry: curveGeometry(polyline(starPoints(${inputs.points}, ${inputs.innerRadius}, ${inputs.outerRadius}), true)) }`,
    uses: ['curveGeometry', 'polyline', 'starPoints'],
  }),
  ArcCurve: ({ inputs }) => ({
    expr: `{ geometry: curveGeometry(polyline(arcPoints(${inputs.radius}, ${inputs.startAngle}, ${inputs.sweepAngle}, ${inputs.segments}))) }`,
    uses: ['curveGeometry', 'polyline', 'arcPoints'],
  }),
  SpiralCurve: ({ inputs }) => ({
    expr: `{ geometry: curveGeometry(polyline(spiralPoints(${inputs.turns}, ${inputs.startRadius}, ${inputs.endRadius}, ${inputs.height}, ${inputs.segments}))) }`,
    uses: ['curveGeometry', 'polyline', 'spiralPoints'],
  }),
  RectangleCurve: ({ inputs }) => ({
    expr: `{ geometry: curveGeometry(polyline(rectanglePoints(${inputs.width}, ${inputs.height}), true)) }`,
    uses: ['curveGeometry', 'polyline', 'rectanglePoints'],
  }),
  QuadraticBezier: ({ varName, inputs }) => {
    const pts = `${varName}_pts`;
    return {
      pre: [
        `const ${pts} = sampleQuadraticBezier(${inputs.p0}, ${inputs.p1}, ${inputs.p2}, ${inputs.segments});`,
      ],
      expr: `{ geometry: { points: ${pts}, curves: [{ points: ${pts}, closed: false }], meshes: [] }, points: ${pts} }`,
      uses: ['sampleQuadraticBezier'],
    };
  },
  // Curve sampling ops (issue #115).
  ResampleCurve: ({ inputs }) => ({
    expr: `{ geometry: mapCurves(${inputs.geometry}, (c) => resampleCurve(c, ${inputs.count})) }`,
    uses: ['mapCurves', 'resampleCurve'],
  }),
  SubdivideCurve: ({ inputs }) => ({
    expr: `{ geometry: mapCurves(${inputs.geometry}, (c) => subdivideCurve(c, ${inputs.cuts})) }`,
    uses: ['mapCurves', 'subdivideCurve'],
  }),
  ReverseCurve: ({ inputs }) => ({
    expr: `{ geometry: mapCurves(${inputs.geometry}, reverseCurve) }`,
    uses: ['mapCurves', 'reverseCurve'],
  }),
  TrimCurve: ({ inputs }) => ({
    expr: `{ geometry: mapCurves(${inputs.geometry}, (c) => trimCurve(c, ${inputs.start}, ${inputs.end})) }`,
    uses: ['mapCurves', 'trimCurve'],
  }),
  // Rounded corners (issue #116).
  FilletCurve: ({ inputs }) => ({
    expr: `{ geometry: mapCurves(${inputs.geometry}, (c) => filletCurve(c, ${inputs.radius}, ${inputs.resolution})) }`,
    uses: ['mapCurves', 'filletCurve'],
  }),
  // Closed curves → mesh faces (issue #117).
  FillCurve: ({ inputs }) => ({
    expr: `{ geometry: fillCurves(${inputs.geometry}) }`,
    uses: ['fillCurves'],
  }),
  MergeGeometry: ({ inputs }) => ({
    // `inputs.geometry` is already an array expression of the connected sources.
    expr: `{ geometry: mergeAll(${inputs.geometry}) }`,
    uses: ['mergeAll'],
  }),
  ColorGeometry: ({ inputs }) => ({
    expr: `{ geometry: colorGeometry(${inputs.geometry}, ${inputs.color}) }`,
    uses: ['colorGeometry'],
  }),
  // Combine channels into an RGBA color (issue #139), one node per color space.
  CombineColorRGB: ({ inputs }) => ({
    expr: `{ color: combineColor('RGB', ${inputs.red}, ${inputs.green}, ${inputs.blue}, ${inputs.alpha}) }`,
    uses: ['combineColor'],
  }),
  CombineColorHSL: ({ inputs }) => ({
    expr: `{ color: combineColor('HSL', ${inputs.hue}, ${inputs.saturation}, ${inputs.lightness}, ${inputs.alpha}) }`,
    uses: ['combineColor'],
  }),
  CombineColorHSV: ({ inputs }) => ({
    expr: `{ color: combineColor('HSV', ${inputs.hue}, ${inputs.saturation}, ${inputs.value}, ${inputs.alpha}) }`,
    uses: ['combineColor'],
  }),

  BoundingBox: ({ inputs }) => ({
    expr: `{ geometry: { points: boundingBox(${inputs.geometry}), curves: [], meshes: [] } }`,
    uses: ['boundingBox'],
  }),
  InstanceOnPoints: ({ inputs }) => ({
    expr: `{ geometry: instanceOnPoints(${inputs.geometry}, ${inputs.points}) }`,
    uses: ['instanceOnPoints'],
  }),
  MathFloat: ({ inputs, params }) => {
    const a = inputs.a!;
    const b = inputs.b!;
    const exprs: Record<string, string> = {
      add: `${a} + ${b}`,
      subtract: `${a} - ${b}`,
      multiply: `${a} * ${b}`,
      divide: `${a} / ${b}`,
      min: `Math.min(${a}, ${b})`,
      max: `Math.max(${a}, ${b})`,
      power: `Math.pow(${a}, ${b})`,
      sine: `Math.sin(${a})`,
      cosine: `Math.cos(${a})`,
      tangent: `Math.tan(${a})`,
      atan2: `Math.atan2(${a}, ${b})`,
      sqrt: `Math.sqrt(${a})`,
      abs: `Math.abs(${a})`,
      floor: `Math.floor(${a})`,
      ceil: `Math.ceil(${a})`,
      round: `Math.round(${a})`,
      modulo: `${a} % ${b}`,
      log: `Math.log(${a})`,
      exp: `Math.exp(${a})`,
      sign: `Math.sign(${a})`,
    };
    const op = exprs[String(params.operation)];
    if (!op) throw new Error(`codegen: unknown MathFloat operation "${String(params.operation)}".`);
    return { expr: `{ value: ${op} }`, uses: [] };
  },
  // Seeded randomness (issue #119): one stream per output kind, shared seed.
  RandomValue: ({ varName, inputs }) => {
    const vals = `${varName}_vals`;
    const ints = `${varName}_ints`;
    const vecs = `${varName}_vecs`;
    return {
      pre: [
        `const ${vals} = randomFloats(${inputs.count}, ${inputs.min}, ${inputs.max}, ${inputs.seed});`,
        `const ${ints} = randomInts(${inputs.count}, ${inputs.min}, ${inputs.max}, ${inputs.seed});`,
        `const ${vecs} = randomPoints(${inputs.count}, [${inputs.min}, ${inputs.min}, ${inputs.min}], [${inputs.max}, ${inputs.max}, ${inputs.max}], ${inputs.seed});`,
      ],
      expr: `{ value: ${vals}[0], integer: ${ints}[0], vector: ${vecs}[0], values: ${vals}, integers: ${ints}, vectors: ${vecs} }`,
      uses: ['randomFloats', 'randomInts', 'randomPoints'],
    };
  },
  MapRange: ({ inputs }) => ({
    expr: `{ value: mapRange(${inputs.value}, ${inputs.fromMin}, ${inputs.fromMax}, ${inputs.toMin}, ${inputs.toMax}) }`,
    uses: ['mapRange'],
  }),
  Clamp: ({ inputs }) => ({
    expr: `{ value: clamp(${inputs.value}, ${inputs.min}, ${inputs.max}) }`,
    uses: ['clamp'],
  }),
  PlaneMesh: ({ inputs }) => ({
    expr: `{ geometry: meshGeometry(planeMesh(${inputs.width}, ${inputs.height})) }`,
    uses: ['meshGeometry', 'planeMesh'],
  }),
  BoxMesh: ({ inputs }) => ({
    expr: `{ geometry: meshGeometry(boxMesh(${inputs.width}, ${inputs.height}, ${inputs.depth})) }`,
    uses: ['meshGeometry', 'boxMesh'],
  }),
  GridMesh: ({ inputs }) => ({
    expr: `{ geometry: meshGeometry(gridMesh(${inputs.countX}, ${inputs.countY}, ${inputs.sizeX}, ${inputs.sizeY})) }`,
    uses: ['meshGeometry', 'gridMesh'],
  }),
  UVSphere: ({ inputs }) => ({
    expr: `{ geometry: meshGeometry(uvSphere(${inputs.radius}, ${inputs.segments}, ${inputs.rings})) }`,
    uses: ['meshGeometry', 'uvSphere'],
  }),
  CylinderMesh: ({ inputs }) => ({
    expr: `{ geometry: meshGeometry(cylinderMesh(${inputs.radius}, ${inputs.height}, ${inputs.segments})) }`,
    uses: ['meshGeometry', 'cylinderMesh'],
  }),
  ConeMesh: ({ inputs }) => ({
    expr: `{ geometry: meshGeometry(coneMesh(${inputs.radius}, ${inputs.height}, ${inputs.segments})) }`,
    uses: ['meshGeometry', 'coneMesh'],
  }),
  TriangulateMesh: ({ inputs }) => ({
    expr: `{ geometry: triangulateGeometry(${inputs.geometry}) }`,
    uses: ['triangulateGeometry'],
  }),
};

/**
 * Generate a standalone module from a graph. The root network becomes a
 * default-export, named function whose arguments are the network's `Parameter`s
 * (idiomatic TS types, in declared order) and whose return value is the output
 * geometry. Meta-nodes are inlined and the body imports only the runtime helpers
 * it uses — the same helpers the interpreter calls, so compiled output equals
 * interpreted output.
 */
export function generate(graph: Graph, registry: NodeRegistry): GeneratedModule {
  const flat = flattenMetaNodes(graph);
  assertValidGraph(flat, registry);
  const output = getOutputNode(flat);
  if (!output) throw new Error('codegen: graph has no OutputGeometry node.');

  const nodeById = new Map<string, GraphNode>();
  for (const node of flat.nodes) nodeById.set(node.id, node);

  const statements: string[] = [];
  const uses = new Set<string>();
  const varOf = new Map<string, string>();

  /** Whether a link's source output socket is itself a field (array). */
  function sourceIsArray(link: GraphLink): boolean {
    const sourceNode = nodeById.get(link.from[0]);
    if (!sourceNode) return false;
    return (
      registry.get(sourceNode.type)?.outputs.find((s) => s.name === link.from[1])?.isArray ?? false
    );
  }

  function emitNode(id: string): string {
    const existing = varOf.get(id);
    if (existing) return existing;
    const node = nodeById.get(id)!;
    const def = registry.require(node.type);
    const varName = sanitize(`n_${id}`);
    varOf.set(id, varName); // reserve before recursion (DAG, no cycles)

    const inputs: Record<string, string> = {};
    for (const socket of def.inputs) {
      const override = node.inputDefaults?.[socket.name];
      if (socket.isArray) {
        // Array inputs collect every connection into an array expression (issue
        // #99); a single field source passes through as the whole array.
        const links = flat.links.filter((l) => l.to[0] === id && l.to[1] === socket.name);
        if (links.length > 0) {
          const exprs = links.map((l) => `${emitNode(l.from[0])}.${l.from[1]}`);
          inputs[socket.name] =
            links.length === 1 && sourceIsArray(links[0]!) ? exprs[0]! : `[${exprs.join(', ')}]`;
        } else if (override !== undefined) inputs[socket.name] = lit(override);
        else if (node.params?.[socket.name] !== undefined)
          inputs[socket.name] = lit(node.params[socket.name]);
        else inputs[socket.name] = lit(socket.default ?? []);
        continue;
      }
      const link = flat.links.find((l) => l.to[0] === id && l.to[1] === socket.name);
      if (link) inputs[socket.name] = `${emitNode(link.from[0])}.${link.from[1]}`;
      else if (override !== undefined) inputs[socket.name] = lit(override);
      else if (node.params?.[socket.name] !== undefined)
        // Backward compat: config moved from params to inputs (issue #58).
        inputs[socket.name] = lit(node.params[socket.name]);
      else if (socket.default !== undefined) inputs[socket.name] = lit(socket.default);
      else inputs[socket.name] = 'undefined';
    }
    const params = { ...resolveParamDefaults(def), ...node.params };

    let emit: Emit;
    if (isParameterNodeType(node.type)) {
      emit = { expr: `{ value: ${sanitize(String(params.name ?? ''))} }`, uses: [] };
    } else {
      const emitter = EMITTERS[node.type];
      if (!emitter) throw new Error(`codegen: no emitter for node type "${node.type}".`);
      emit = emitter({ varName, inputs, params });
    }
    for (const u of emit.uses) uses.add(u);
    if (emit.pre) statements.push(...emit.pre);
    statements.push(`const ${varName} = ${emit.expr};`);
    return varName;
  }

  const outputLink = flat.links.find((l) => l.to[0] === output.id && l.to[1] === 'geometry');
  let returnExpr: string;
  if (outputLink) {
    returnExpr = `${emitNode(outputLink.from[0])}.${outputLink.from[1]}`;
  } else {
    returnExpr = 'emptyGeometry()';
    uses.add('emptyGeometry');
  }

  const params: GeneratedParam[] = flat.parameters.map((p) => ({
    name: sanitize(p.id),
    tsType: tsTypeOf(p.type),
  }));
  const name = sanitize(graph.metadata?.name ?? 'generated');
  const body = [...statements, `return ${returnExpr};`].join('\n  ');
  const usesList = [...uses].sort();

  const ts = renderModule(name, params, usesList, body, true);
  const js = renderModule(name, params, usesList, body, false);
  return {
    name,
    params,
    uses: usesList,
    body,
    ts,
    js,
    runtimeDependency: { '@vector-nodes/runtime': RUNTIME_RANGE },
  };
}

function renderModule(
  name: string,
  params: GeneratedParam[],
  uses: string[],
  body: string,
  typed: boolean,
): string {
  const importNames = typed ? [...uses, 'type Geometry'] : uses;
  const importLine =
    importNames.length > 0
      ? `import { ${importNames.join(', ')} } from '@vector-nodes/runtime';\n\n`
      : '';
  const args = params.map((p) => (typed ? `${p.name}: ${p.tsType}` : p.name)).join(', ');
  const sig = typed
    ? `export default function ${name}(${args}): Geometry {`
    : `export default function ${name}(${args}) {`;
  return `${importLine}${sig}\n  ${body}\n}\n`;
}
