import { useCallback, useEffect, useRef, useState } from 'react';

import { summarizeGeometry, type PreviewResult } from './preview';
import { DEFAULT_PREVIEW_WIDTH, previewWidthFromClientX } from './preview-resize';
import { SidebarIcon } from './SidebarIcon';
import { SvgView } from './SvgView';
import { ThreeView } from './ThreeView';

const WIDTH_STORAGE_KEY = 'vn:preview-width';

/**
 * Tracks the portrait-orientation media query: that's when the preview docks
 * on top of the canvas instead of beside it (issue #61). Guarded so jsdom
 * (no/stub matchMedia) just reports landscape.
 */
function useIsPortrait(): boolean {
  const [portrait, setPortrait] = useState(
    () => window.matchMedia?.('(orientation: portrait)').matches ?? false,
  );
  useEffect(() => {
    const query = window.matchMedia?.('(orientation: portrait)');
    if (!query) return;
    const onChange = () => setPortrait(query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);
  return portrait;
}

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
  /** Which side the pane is docked on; drives the resize handle (issue #62). */
  side?: 'left' | 'right';
}

/** Which renderer the preview shows. The underlying network is always 3D. */
export type PreviewMode = '3d' | '2d';

/**
 * Preview panel: renders the evaluated output geometry with a 2D⇄3D toggle that
 * swaps only the renderer/projection — 3D uses Three.js, 2D uses the SVG
 * projection (Z dropped). Also shows an element-count footer, or the evaluation
 * error.
 */
export function PreviewPane({
  result,
  collapsed,
  onToggleCollapse,
  side = 'right',
}: PreviewPaneProps) {
  const [mode, setMode] = useState<PreviewMode>('3d');
  const [width, setWidth] = useState(loadPreviewWidth);
  const dragging = useRef(false);
  const sideRef = useRef(side);
  sideRef.current = side;

  // Docked on top (portrait): the toggle points at the strip's edge — top
  // while expanded, bottom (the canvas edge it collapsed to) when collapsed.
  const isPortrait = useIsPortrait();
  const iconSide = isPortrait ? (collapsed ? 'bottom' : 'top') : side;

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
      setWidth(previewWidthFromClientX(event.clientX, window.innerWidth, sideRef.current));
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
          <SidebarIcon side={iconSide} />
        </button>
      </aside>
    );
  }

  return (
    <aside className={`preview preview--${side}`} style={{ width }}>
      <div
        className={`preview__resize preview__resize--${side}`}
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
            <SidebarIcon side={iconSide} />
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
    <div className="preview__summary" aria-label="Element counts">
      <span className="preview__count">
        <span className="preview__count-value" data-testid="preview-points">
          {summary.points}
        </span>
        <span className="preview__count-label">points</span>
      </span>
      <span className="preview__count">
        <span className="preview__count-value" data-testid="preview-curves">
          {summary.curves}
        </span>
        <span className="preview__count-label">curves</span>
      </span>
      <span className="preview__count">
        <span className="preview__count-value" data-testid="preview-meshes">
          {summary.meshes}
        </span>
        <span className="preview__count-label">meshes</span>
      </span>
    </div>
  );
}
