import { runPreviewRequest, type PreviewRequest, type PreviewResponse } from './preview-protocol';

// Worker entry point: evaluate each incoming graph and post the result back.
// Typed via a local cast so this compiles under the DOM lib without pulling in
// the WebWorker lib (the two define `self`/`postMessage` differently).
const ctx = self as unknown as {
  onmessage: ((event: MessageEvent<PreviewRequest>) => void) | null;
  postMessage: (message: PreviewResponse) => void;
};

ctx.onmessage = (event) => {
  ctx.postMessage(runPreviewRequest(event.data));
};
