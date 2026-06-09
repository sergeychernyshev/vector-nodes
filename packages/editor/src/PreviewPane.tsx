import { summarizeGeometry, type PreviewResult } from './preview';
import { ThreeView } from './ThreeView';

export interface PreviewPaneProps {
  result: PreviewResult;
}

/**
 * Preview panel: renders the evaluated output geometry in 3D (Three.js) with a
 * lightweight element-count footer, or the evaluation error. The 2D renderer
 * and 2D⇄3D toggle arrive in Steps 4.3/4.4.
 */
export function PreviewPane({ result }: PreviewPaneProps) {
  return (
    <aside className="preview">
      <div className="preview__header">Preview</div>
      {result.error ? (
        <div className="preview__error" role="alert">
          {result.error}
        </div>
      ) : (
        <div className="preview__body">
          {result.geometry && <ThreeView geometry={result.geometry} />}
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
