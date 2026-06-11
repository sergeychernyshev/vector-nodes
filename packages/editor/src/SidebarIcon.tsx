import sidebarLeftRaw from '../icons/sidebar-left.svg?raw';
import sidebarRightRaw from '../icons/sidebar-right.svg?raw';

/** Drop the XML prolog/comments so the markup can be inlined into HTML. */
const svgMarkup = (raw: string) => raw.slice(raw.indexOf('<svg'));

const ICONS = {
  left: svgMarkup(sidebarLeftRaw),
  right: svgMarkup(sidebarRightRaw),
} as const;

/**
 * Sidebar toggle glyph, inlined from packages/editor/icons so its strokes can
 * be recolored via CSS (`currentColor`) to follow the light/dark theme. The
 * buttons that use it carry the accessible label; the icon itself is
 * decorative.
 */
export function SidebarIcon({ side }: { side: 'left' | 'right' }) {
  return (
    <span className="sidebar-icon" aria-hidden dangerouslySetInnerHTML={{ __html: ICONS[side] }} />
  );
}
