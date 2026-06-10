// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

import { exportImageSize, inlineEdgeStyles } from './export-image';

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Build a `.react-flow__viewport` holding one edge path, optionally pre-styled. */
function viewportWithEdge(stroke?: string): { viewport: HTMLElement; path: SVGElement } {
  const viewport = document.createElement('div');
  viewport.className = 'react-flow__viewport';
  const svg = document.createElementNS(SVG_NS, 'svg');
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('class', 'react-flow__edge-path');
  if (stroke) path.style.stroke = stroke;
  svg.appendChild(path);
  viewport.appendChild(svg);
  return { viewport, path };
}

describe('inlineEdgeStyles (issue #82)', () => {
  it('bakes stroke and fill onto each edge path so the clone keeps them', () => {
    const { viewport, path } = viewportWithEdge('rgb(10, 20, 30)');
    inlineEdgeStyles(viewport);
    expect(path.style.stroke).toBe('rgb(10, 20, 30)');
    expect(path.style.fill).toBe('none');
  });

  it('falls back to a default stroke when the path has none', () => {
    const { viewport, path } = viewportWithEdge();
    inlineEdgeStyles(viewport);
    // #b1b1b7, normalized to rgb by the CSSOM on read.
    expect(path.style.stroke).toBe('rgb(177, 177, 183)');
    expect(path.style.strokeWidth).toBe('1px');
  });

  it('restores the original style attribute afterward', () => {
    const { viewport, path } = viewportWithEdge();
    expect(path.getAttribute('style')).toBeNull();
    const restore = inlineEdgeStyles(viewport);
    expect(path.getAttribute('style')).not.toBeNull();
    restore();
    expect(path.getAttribute('style')).toBeNull();
  });
});

describe('exportImageSize (issue #82)', () => {
  it('adds a margin around the bounds', () => {
    expect(exportImageSize({ width: 400, height: 200 }, 50)).toEqual({ width: 500, height: 300 });
  });

  it('clamps tiny graphs up to a minimum size', () => {
    expect(exportImageSize({ width: 10, height: 10 }, 0)).toEqual({ width: 256, height: 256 });
  });

  it('clamps huge graphs down to a maximum size', () => {
    expect(exportImageSize({ width: 9000, height: 9000 }, 0)).toEqual({
      width: 4096,
      height: 4096,
    });
  });

  it('treats zero-size bounds as a unit box before the margin', () => {
    expect(exportImageSize({ width: 0, height: 0 }, 200)).toEqual({ width: 401, height: 401 });
  });
});
