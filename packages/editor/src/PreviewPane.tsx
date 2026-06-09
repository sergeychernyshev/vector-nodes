import { useState } from 'react';

import { summarizeGeometry, type PreviewResult } from './preview';
import { SvgView } from './SvgView';
import { ThreeView } from './ThreeView';

export interface PreviewPaneProps {
  result: PreviewResult;
}

/** Which renderer the preview shows. The underlying network is always 3D. */
export type PreviewMode = '3d' | '2d';

/**
 * Preview panel: renders the evaluated output geometry with a 2D⇄3D toggle that
 * swaps only the renderer/projection — 3D uses Three.js, 2D uses the SVG
 * projection (Z dropped). Also shows an element-count footer, or the evaluation
 * error.
 */
export function PreviewPane({ result }: PreviewPaneProps) {
  const [mode, setMode] = useState<PreviewMode>('3d');

  return (
    <aside className="preview">
      <div className="preview__header">
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
