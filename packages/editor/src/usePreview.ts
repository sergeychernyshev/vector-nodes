import type { Graph } from '@vector-nodes/core';
import { useEffect, useRef, useState } from 'react';

import { evaluatePreview, type PreviewResult } from './preview';
import type { PreviewRequest, PreviewResponse } from './preview-protocol';

/**
 * Evaluate `graph` for the preview off the main thread in a Web Worker, keeping
 * UI interactions smooth on large graphs. Returns the latest result; stale
 * responses (superseded by a newer edit) are ignored.
 *
 * Falls back to synchronous evaluation when Workers are unavailable (e.g. the
 * jsdom test environment).
 */
export function usePreview(
  graph: Graph,
  previewIds: string[] = [],
  parameters: Record<string, unknown> = {},
): PreviewResult {
  const [result, setResult] = useState<PreviewResult>({});
  const workerRef = useRef<Worker | null>(null);
  const requestId = useRef(0);
  // A stable string key so the send effect tracks the id set, not the array ref.
  const previewKey = previewIds.join(',');
  // Likewise, track parameter values (e.g. the animation clock's `time`) by
  // content so a new clock tick re-sends the graph for evaluation (issue #138).
  const parametersKey = JSON.stringify(parameters);

  // Spin up the worker once; tear it down on unmount.
  useEffect(() => {
    if (typeof Worker === 'undefined') return;
    const worker = new Worker(new URL('./preview.worker.ts', import.meta.url), {
      type: 'module',
    });
    worker.onmessage = (event: MessageEvent<PreviewResponse>) => {
      // Drop results for requests that a later edit already superseded.
      if (event.data.id === requestId.current) setResult(event.data.result);
    };
    workerRef.current = worker;
    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  // Send each new graph (or change to the open per-node previews) to the worker,
  // or evaluate inline as a fallback.
  useEffect(() => {
    const id = (requestId.current += 1);
    const ids = previewKey === '' ? [] : previewKey.split(',');
    const params = JSON.parse(parametersKey) as Record<string, unknown>;
    const worker = workerRef.current;
    if (worker) {
      worker.postMessage({
        id,
        graph,
        previewIds: ids,
        parameters: params,
      } satisfies PreviewRequest);
    } else {
      setResult(evaluatePreview(graph, ids, params));
    }
  }, [graph, previewKey, parametersKey]);

  return result;
}
