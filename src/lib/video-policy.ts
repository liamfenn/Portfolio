import type { PortfolioVideoAsset, PortfolioVideoRendition } from "./media-assets";

export const VIDEO_POLICY = {
  loadLimit: 2,
  prepareMargin: 480,
  /** Offscreen tiles loaded ahead of the scroll, so arriving tiles are already decoding. */
  upcoming: 2,
  /**
   * Paused offscreen sources kept attached (on their last frame), so scrolling back never reloads behind a
   * skeleton. Covers the whole feed; past this, the least recently prepared release first.
   */
  retain: 12,
  loadTimeout: 15_000,
  resizeDelay: 250,
  reorderPaintTimeout: 500,
  /** A held poster is a safe picture, so it can wait longer for a paused video to resume and present. */
  reorderHoldTimeout: 3000,
} as const;

export type VideoCandidate = {
  visible: number;
  near: boolean;
  priority: boolean;
  failed: boolean;
  distance: number;
  focused?: boolean;
  warm?: boolean;
};

/** Visible intent wins, then viewport coverage and distance. Stable ties avoid playback churn. */
export function rankVideos<T extends VideoCandidate>(items: T[], focused = items.some(item => item.focused)): T[] {
  return items.filter(item => item.near && !item.failed && (!focused || item.focused || item.warm)).sort((a, b) =>
    Number(Boolean(b.focused)) - Number(Boolean(a.focused)) ||
    Number(b.visible > 0) - Number(a.visible > 0) ||
    Number(b.priority) - Number(a.priority) || b.visible - a.visible || a.distance - b.distance);
}

/** A loaded rendition never downgrades during a layout change. */
export function videoRendition(
  asset: PortfolioVideoAsset, width: number, pixelRatio: number, currentWidth = 0,
): PortfolioVideoRendition | null {
  if (width <= 0) return null;
  const required = Math.max(currentWidth, width * Math.min(Math.max(pixelRatio, 1), 2));
  const ladder = [...asset.renditions].sort((a, b) => a.width - b.width);
  return ladder.find(rung => rung.width >= required) ?? ladder.at(-1) ?? null;
}
