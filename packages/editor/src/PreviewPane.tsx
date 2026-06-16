import { useCallback, useEffect, useRef, useState } from 'react';

import { summarizeGeometry, type PreviewResult } from './preview';
import {
  DEFAULT_PREVIEW_WIDTH,
  previewHeightFromClientY,
  previewWidthFromClientX,
} from './preview-resize';
import { SidebarIcon } from './SidebarIcon';
import { SvgView } from './SvgView';
import { ThreeView } from './ThreeView';

const WIDTH_STORAGE_KEY = 'vn:preview-width';
const HEIGHT_STORAGE_KEY = 'vn:preview-height';

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
  /**
   * Whether the preview is docked beside the canvas or as a strip on top (issue
   * #154). When omitted, falls back to the portrait media query (issue #61).
   */
  dock?: 'side' | 'top';
  /** Toggle the dock between side and top (issue #154); omit to hide the button. */
  onToggleDock?: () => void;
  /**
   * Reports drags of the strip's bottom border when the preview is docked on
   * top (portrait); the owner applies the height (omit to disable).
   */
  onResizeHeight?: (height: number) => void;
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
  dock,
  onToggleDock,
  onResizeHeight,
}: PreviewPaneProps) {
  const [mode, setMode] = useState<PreviewMode>('3d');
  const [width, setWidth] = useState(loadPreviewWidth);
  const dragging = useRef<false | 'width' | 'height'>(false);
  const paneRef = useRef<HTMLElement>(null);
  // Last height reported during a bottom-border drag, persisted on release.
  const lastHeight = useRef<number | null>(null);
  const sideRef = useRef(side);
  sideRef.current = side;

  // Docked on top: the toggle points at the strip's edge — top while expanded,
  // bottom (the canvas edge it collapsed to) when collapsed. The dock is set
  // explicitly (issue #154), falling back to the portrait query (issue #61).
  const autoPortrait = useIsPortrait();
  const onTop = dock != null ? dock === 'top' : autoPortrait;
  // Chevron for the collapse/expand toggle, pointing the way the panel moves:
  // toward the edge it tucks into when expanded, back toward the canvas when
  // collapsed.
  const collapseChevron = onTop
    ? collapsed
      ? '⌄'
      : '⌃'
    : (side === 'right') === !collapsed
      ? '›'
      : '‹';

  // Drag the left border to resize; width is measured from the viewport's right
  // edge and persisted so it survives reloads.
  const onResizeStart = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragging.current = 'width';
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  // Drag the bottom border to resize the strip's height when the preview is
  // docked on top of the canvas (portrait).
  const onHeightResizeStart = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragging.current = 'height';
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
  }, []);

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      if (dragging.current === 'width') {
        setWidth(previewWidthFromClientX(event.clientX, window.innerWidth, sideRef.current));
      } else if (dragging.current === 'height') {
        const paneTop = paneRef.current?.getBoundingClientRect().top ?? 0;
        const height = previewHeightFromClientY(event.clientY, window.innerHeight, paneTop);
        lastHeight.current = height;
        onResizeHeight?.(height);
      }
    };
    const onUp = () => {
      if (!dragging.current) return;
      const wasHeightDrag = dragging.current === 'height';
      dragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      try {
        if (wasHeightDrag) {
          if (lastHeight.current != null) {
            window.localStorage.setItem(HEIGHT_STORAGE_KEY, String(lastHeight.current));
          }
        } else {
          window.localStorage.setItem(WIDTH_STORAGE_KEY, String(width));
        }
      } catch {
        // Ignore storage failures (private mode, quota): size stays in memory.
      }
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [width, onResizeHeight]);

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
          <span className="preview__chevron" aria-hidden="true">
            {collapseChevron}
          </span>
        </button>
      </aside>
    );
  }

  return (
    <aside ref={paneRef} className={`preview preview--${side}`} style={{ width }}>
      <div
        className={`preview__resize preview__resize--${side}`}
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize preview"
        onPointerDown={onResizeStart}
      />
      {onResizeHeight && (
        <div
          className="preview__resize preview__resize--bottom"
          role="separator"
          aria-orientation="horizontal"
          aria-label="Resize preview height"
          onPointerDown={onHeightResizeStart}
        />
      )}
      <div className="preview__header">
        <span className="preview__header-controls">
          {onToggleCollapse && (
            <button
              type="button"
              className="preview__collapse"
              onClick={onToggleCollapse}
              aria-label="Hide preview"
              aria-expanded
              title="Hide preview"
            >
              <span className="preview__chevron" aria-hidden="true">
                {collapseChevron}
              </span>
            </button>
          )}
          {onToggleDock && (
            <button
              type="button"
              className="preview__collapse preview__dock"
              onClick={onToggleDock}
              aria-label={onTop ? 'Dock preview on the side' : 'Dock preview on top'}
              title={onTop ? 'Dock preview on the side' : 'Dock preview on top'}
            >
              <SidebarIcon side={onTop ? side : 'top'} />
            </button>
          )}
        </span>
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
              // Docked on top the strip is short and wide, so drop the margin to
              // let the geometry fill it edge-to-edge (issue #154).
              <SvgView geometry={result.geometry} padding={onTop ? 0.02 : 0.1} />
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
