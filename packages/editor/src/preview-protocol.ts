import type { Graph } from '@vector-nodes/core';

import { evaluatePreview, type PreviewResult } from './preview';

/** Message posted to the preview worker: a graph to evaluate, tagged by id. */
export interface PreviewRequest {
  id: number;
  graph: Graph;
  /** Node ids whose per-node preview is open and need their geometry (issue #79). */
  previewIds?: string[];
  /**
   * External evaluation parameters (e.g. the animation clock's `time` in
   * seconds), forwarded to the engine so a Time node previews live (issue #138).
   */
  parameters?: Record<string, unknown>;
}

/** Message posted back from the preview worker: the result for request `id`. */
export interface PreviewResponse {
  id: number;
  result: PreviewResult;
}

/**
 * Evaluate one preview request. Lives apart from the worker entry point so it is
 * importable (and unit-testable) without a Worker/DOM context.
 */
export function runPreviewRequest(request: PreviewRequest): PreviewResponse {
  return {
    id: request.id,
    result: evaluatePreview(request.graph, request.previewIds, request.parameters),
  };
}
