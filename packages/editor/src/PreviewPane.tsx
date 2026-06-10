import { useCallback, useEffect, useRef, useState } from 'react';

import { summarizeGeometry, type PreviewResult } from './preview';
import { DEFAULT_PREVIEW_WIDTH, previewWidthFromClientX } from './preview-resize';
import { SvgView } from './SvgView';
import { ThreeView } from './ThreeView';

const WIDTH_STORAGE_KEY = 'vn:preview-width';

function loadPreviewWidth(): number {
  try {
    const raw = window.localStorage.getItem(WIDTH_STORAGE_KEY);
    const value = raw == null ? NaN : Number(raw);
    return Number.isFinite(value) ? value : DEFAULT_PREVIEW_WIDTH;
  } catch {
    return DEFAULT_PREVIEW_WIDTH;
  }
}

export interface PreviewPaneProps {
  result: PreviewResult;
  /** Whether the preview is collapsed to a thin rail (issue #64). */
  collapsed?: boolean;
  /** Toggle the collapsed state (omit to hide the toggle). */
  onToggleCollapse?: () => void;
}

/** Which renderer the preview shows. The underlying network is always 3D. */
export type PreviewMode = '3d' | '2d';

/**
 * Preview panel: renders the evaluated output geometry with a 2D⇄3D toggle that
 * swaps only the renderer/projection — 3D uses Three.js, 2D uses the SVG
 * projection (Z dropped). Also shows an element-count footer, or the evaluation
 * error.
 */
export function PreviewPane({ result, collapsed, onToggleCollapse }: PreviewPaneProps) {
  const [mode, setMode] = useState<PreviewMode>('3d');
  const [width, setWidth] = useState(loadPreviewWidth);
  const dragging = useRef(false);

  // Drag the left border to resize; width is measured from the viewport's right
  // edge and persisted so it survives reloads.
  const onResizeStart = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      if (!dragging.current) return;
      setWidth(previewWidthFromClientX(event.clientX, window.innerWidth));
    };
    const onUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      try {
        window.localStorage.setItem(WIDTH_STORAGE_KEY, String(width));
      } catch {
        // Ignore storage failures (private mode, quota): width stays in memory.
      }
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [width]);

  // Collapsed: a thin rail with an expand button (rendered after all hooks).
  if (collapsed) {
    return (
      <aside className="preview preview--collapsed">
        <button
          type="button"
          className="preview__collapse"
          onClick={onToggleCollapse}
          aria-label="Show preview"
          aria-expanded={false}
          title="Show preview"
        >
          «
        </button>
      </aside>
    );
  }

  return (
    <aside className="preview" style={{ width }}>
      <div
        className="preview__resize"
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize preview"
        onPointerDown={onResizeStart}
      />
      <div className="preview__header">
        {onToggleCollapse && (
          <button
            type="button"
            className="preview__collapse"
            onClick={onToggleCollapse}
            aria-label="Hide preview"
            aria-expanded
            title="Hide preview"
          >
            »
          </button>
        )}
        <span>Preview</span>
        <div className="preview__toggle" role="group" aria-label="Preview mode">
          <button
            type="button"
            className="preview__toggle-btn"
            aria-pressed={mode === '3d'}
            onClick={() => setMode('3d')}
          >
            3D
          </button>
          <button
            type="button"
            className="preview__toggle-btn"
            aria-pressed={mode === '2d'}
            onClick={() => setMode('2d')}
          >
            2D
          </button>
        </div>
      </div>
      {result.error ? (
        <div className="preview__error" role="alert">
          {result.error}
        </div>
      ) : (
        <div className="preview__body">
          {result.geometry &&
            (mode === '3d' ? (
              <ThreeView geometry={result.geometry} />
            ) : (
              <SvgView geometry={result.geometry} />
            ))}
          <PreviewSummary result={result} />
        </div>
      )}
    </aside>
  );
}

function PreviewSummary({ result }: PreviewPaneProps) {
  const summary = result.geometry
    ? summarizeGeometry(result.geometry)
    : { points: 0, curves: 0, meshes: 0 };
  return (
    <dl className="preview__summary">
      <dt>Points</dt>
      <dd data-testid="preview-points">{summary.points}</dd>
      <dt>Curves</dt>
      <dd data-testid="preview-curves">{summary.curves}</dd>
      <dt>Meshes</dt>
      <dd data-testid="preview-meshes">{summary.meshes}</dd>
    </dl>
  );
}
