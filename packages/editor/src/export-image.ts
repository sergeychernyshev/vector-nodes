import { toPng } from 'html-to-image';

/** Fraction of the export canvas left as a margin around the framed nodes. */
export const IMAGE_PADDING = 0.12;

const MIN_SIZE = 256;
const MAX_SIZE = 4096;

/**
 * Pixel size of the export canvas derived from the nodes' bounding box, with a
 * margin and clamped to a sane range so tiny graphs aren't postage stamps and
 * huge ones don't blow past canvas limits.
 */
export function exportImageSize(
  bounds: { width: number; height: number },
  margin = 96,
): { width: number; height: number } {
  const clamp = (v: number) => Math.round(Math.max(MIN_SIZE, Math.min(MAX_SIZE, v)));
  return {
    width: clamp((bounds.width || 1) + margin * 2),
    height: clamp((bounds.height || 1) + margin * 2),
  };
}

/** The translate+scale that frames the nodes within the export canvas. */
export interface CaptureTransform {
  x: number;
  y: number;
  zoom: number;
}

/**
 * Edge color/width come from CSS custom properties (`--xy-edge-*`) declared on
 * the `.react-flow` container — an ancestor of the captured `.react-flow__viewport`.
 * html-to-image clones the viewport detached from that ancestor, so those
 * properties resolve to nothing and `stroke` falls back to `none`, dropping every
 * connection. Copy the container's custom properties onto the viewport for the
 * duration of the capture so the clone keeps them; returns a restorer.
 */
function inheritFlowVars(viewport: HTMLElement): () => void {
  const root = viewport.closest<HTMLElement>('.react-flow');
  if (!root) return () => {};
  const computed = getComputedStyle(root);
  const applied: string[] = [];
  for (let i = 0; i < computed.length; i += 1) {
    const name = computed.item(i);
    if (name.startsWith('--')) {
      viewport.style.setProperty(name, computed.getPropertyValue(name));
      applied.push(name);
    }
  }
  return () => applied.forEach((name) => viewport.style.removeProperty(name));
}

/**
 * Rasterize the React Flow viewport element to a PNG data URL, framing the
 * content with the given size and transform. Faithful to the live canvas:
 * html-to-image rasterizes the actual rendered DOM.
 */
export function captureViewport(
  viewport: HTMLElement,
  size: { width: number; height: number },
  transform: CaptureTransform,
  backgroundColor: string,
): Promise<string> {
  const restore = inheritFlowVars(viewport);
  return toPng(viewport, {
    backgroundColor,
    width: size.width,
    height: size.height,
    style: {
      width: `${size.width}px`,
      height: `${size.height}px`,
      transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.zoom})`,
    },
  }).finally(restore);
}

/** Trigger a browser download of a data URL under `filename`. */
export function downloadDataUrl(filename: string, dataUrl: string): void {
  const anchor = document.createElement('a');
  anchor.href = dataUrl;
  anchor.download = filename;
  anchor.click();
}
