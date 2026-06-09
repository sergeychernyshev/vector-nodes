import { summarizeGeometry, type PreviewResult } from './preview';

export interface PreviewPaneProps {
  result: PreviewResult;
}

/**
 * Preview panel: shows the evaluated output geometry (a lightweight summary for
 * now; the 3D/2D renderers arrive in Steps 4.2/4.3), or the evaluation error.
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
        <PreviewSummary result={result} />
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
