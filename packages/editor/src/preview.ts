import { createBasicRegistry, type Graph } from '@vector-nodes/core';
import { BASIC_OPERATORS, evaluateGraph } from '@vector-nodes/engine';
import { emptyGeometry, type Geometry } from '@vector-nodes/runtime';

const registry = createBasicRegistry();

/** The outcome of evaluating the current graph for preview. */
export interface PreviewResult {
  geometry?: Geometry;
  /** Present when the graph is invalid or evaluation failed. */
  error?: string;
}

/**
 * Evaluate a graph for the preview pane: returns the output geometry, or an
 * error message when the graph is invalid (e.g. mid-edit) or evaluation throws.
 */
export function evaluatePreview(graph: Graph): PreviewResult {
  try {
    const result = evaluateGraph(graph, registry, BASIC_OPERATORS);
    const geometry = (result.output.geometry as Geometry | undefined) ?? emptyGeometry();
    return { geometry };
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
