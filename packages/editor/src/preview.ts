import { createBasicRegistry, createGraph, type Graph } from '@vector-nodes/core';
import { BASIC_OPERATORS, evaluateGraph } from '@vector-nodes/engine';
import { emptyGeometry, type Geometry } from '@vector-nodes/runtime';

const registry = createBasicRegistry();

/** The outcome of evaluating the current graph for preview. */
export interface PreviewResult {
  geometry?: Geometry;
  /**
   * Geometry produced by individual nodes whose per-node preview is open
   * (issue #79), keyed by node id. Only the requested, evaluated nodes appear.
   */
  nodeGeometries?: Record<string, Geometry>;
  /**
   * Resolved values flowing into connected input sockets, keyed by node id then
   * input socket name. Lets a node's disabled inline editor preview the value its
   * connection supplies. Only displayable scalars/vectors/colors are included.
   */
  nodeInputs?: Record<string, Record<string, unknown>>;
  /** Present when the graph is invalid or evaluation failed. */
  error?: string;
}

/** Whether a value looks like a geometry bundle (for per-node previews). */
function isGeometry(value: unknown): value is Geometry {
  return (
    typeof value === 'object' &&
    value !== null &&
    Array.isArray((value as Geometry).points) &&
    Array.isArray((value as Geometry).curves) &&
    Array.isArray((value as Geometry).meshes)
  );
}

/**
 * Evaluate a graph for the preview pane: returns the output geometry, or an
 * error message when the graph is invalid (e.g. mid-edit) or evaluation throws.
 *
 * `previewIds` requests per-node geometry for those nodes (issue #79). Each
 * requested node is evaluated even when it is not reachable from the output
 * (issue #140), so a node being built in isolation still previews; the geometry
 * of every requested node that produced one is returned in `nodeGeometries`.
 */
export function evaluatePreview(graph: Graph, previewIds: readonly string[] = []): PreviewResult {
  try {
    // Pass the open preview ids as extra evaluation roots so a node previews
    // even when it isn't (yet) wired to the output (issue #140).
    const result = evaluateGraph(graph, registry, BASIC_OPERATORS, {}, previewIds);
    const geometry = (result.output.geometry as Geometry | undefined) ?? emptyGeometry();
    const nodeGeometries: Record<string, Geometry> = {};
    for (const id of previewIds) {
      const g = result.nodeOutputs.get(id)?.geometry;
      if (isGeometry(g)) nodeGeometries[id] = g;
    }
    // The value each link delivers to its destination input, so a connected
    // node's disabled editor can preview it (the upstream output's value).
    const nodeInputs: Record<string, Record<string, unknown>> = {};
    for (const link of graph.links) {
      const value = result.nodeOutputs.get(link.from[0])?.[link.from[1]];
      if (!isDisplayableInput(value)) continue;
      (nodeInputs[link.to[0]] ??= {})[link.to[1]] = value;
    }
    return { geometry, nodeGeometries, nodeInputs };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

/** Whether a value can be shown in an inline editor (scalar, vector, or color). */
function isDisplayableInput(value: unknown): boolean {
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'string') {
    return true;
  }
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.length <= 4 &&
    value.every((n) => typeof n === 'number')
  );
}

/**
 * Evaluate a single node in isolation with its default params/inputs and return
 * the geometry from its `geometryOutput` socket (issue #141). Used for the live
 * preview shown in the placement ghost while a node is dragged onto the canvas.
 * Returns `undefined` if the node produces no geometry (e.g. an unknown type).
 */
export function previewNodeGeometry(
  type: string,
  geometryOutput: string,
  params: Record<string, unknown> = {},
  inputDefaults: Record<string, unknown> = {},
): Geometry | undefined {
  const graph = createGraph({
    nodes: [
      { id: 'g', type, params, inputDefaults },
      { id: 'out', type: 'OutputGeometry' },
    ],
    links: [{ from: ['g', geometryOutput], to: ['out', 'geometry'] }],
  });
  return evaluatePreview(graph).geometry;
}

/** Element counts of a geometry bundle, for a lightweight preview summary. */
export interface GeometrySummary {
  points: number;
  curves: number;
  meshes: number;
}

/** Count the points, curves, and meshes in a geometry bundle. */
export function summarizeGeometry(geometry: Geometry): GeometrySummary {
  return {
    points: geometry.points.length,
    curves: geometry.curves.length,
    meshes: geometry.meshes.length,
  };
}
