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
 * Edges render as `<path class="react-flow__edge-path">` styled only by a CSS
 * rule (`stroke: var(--xy-edge-*)`). html-to-image deep-clones SVG subtrees and
 * inlines computed styles only on the SVG *root*, never its descendants — and it
 * doesn't carry the page's CSS rules — so the cloned edge paths lose their stroke
 * and fall back to `none`, dropping every connection from the image (nodes use
 * our own hex colors, so they're unaffected). Bake each edge path's resolved
 * stroke/width/fill onto the live element as inline styles (which the deep clone
 * preserves) for the duration of the capture; returns a restorer.
 */
export function inlineEdgeStyles(viewport: HTMLElement): () => void {
  const paths = viewport.querySelectorAll<SVGElement>('.react-flow__edge-path');
  const restorers: (() => void)[] = [];
  // Colors that mean "no visible stroke", so we fall back to React Flow's default.
  const BLANK = new Set(['', 'none', 'transparent', 'rgba(0, 0, 0, 0)']);
  paths.forEach((path) => {
    const computed = getComputedStyle(path);
    const previous = path.getAttribute('style');
    path.style.stroke = BLANK.has(computed.stroke) ? '#b1b1b7' : computed.stroke;
    path.style.strokeWidth =
      computed.strokeWidth && computed.strokeWidth !== '0px' ? computed.strokeWidth : '1px';
    path.style.fill = 'none';
    restorers.push(() =>
      previous === null ? path.removeAttribute('style') : path.setAttribute('style', previous),
    );
  });
  return () => restorers.forEach((restore) => restore());
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
  const restore = inlineEdgeStyles(viewport);
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
