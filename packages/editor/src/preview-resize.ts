/** Smallest the preview pane may be dragged, in pixels. */
export const MIN_PREVIEW_WIDTH = 180;
/** Largest the preview pane may grow, as a fraction of the viewport width. */
export const MAX_PREVIEW_FRACTION = 0.7;
/** Default preview width, in pixels. */
export const DEFAULT_PREVIEW_WIDTH = 240;

/**
 * Preview width (px) for a drag at `clientX`, given the viewport width and which
 * side the pane is docked on. The width is the distance from the pointer to that
 * side's edge — `viewportWidth - clientX` on the right, `clientX` on the left
 * (issue #62) — clamped to {@link MIN_PREVIEW_WIDTH}…{@link MAX_PREVIEW_FRACTION}
 * of the viewport. Pure, so the drag math is unit-testable.
 */
export function previewWidthFromClientX(
  clientX: number,
  viewportWidth: number,
  side: 'left' | 'right' = 'right',
): number {
  const raw = side === 'left' ? clientX : viewportWidth - clientX;
  const max = Math.max(MIN_PREVIEW_WIDTH, viewportWidth * MAX_PREVIEW_FRACTION);
  return Math.min(Math.max(raw, MIN_PREVIEW_WIDTH), max);
}
