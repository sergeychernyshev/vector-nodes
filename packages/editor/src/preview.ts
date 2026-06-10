import { createBasicRegistry, type Graph } from '@vector-nodes/core';
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
 * `previewIds` requests per-node geometry for those nodes (issue #79); the
 * geometry of each requested node that was actually evaluated (i.e. reachable
 * from the output) is returned in `nodeGeometries`.
 */
export function evaluatePreview(graph: Graph, previewIds: readonly string[] = []): PreviewResult {
  try {
    const result = evaluateGraph(graph, registry, BASIC_OPERATORS);
    const geometry = (result.output.geometry as Geometry | undefined) ?? emptyGeometry();
    const nodeGeometries: Record<string, Geometry> = {};
    for (const id of previewIds) {
      const g = result.nodeOutputs.get(id)?.geometry;
      if (isGeometry(g)) nodeGeometries[id] = g;
    }
    return { geometry, nodeGeometries };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
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
