import type { PortfolioVideoAsset, PortfolioVideoRendition } from "./media-assets";

export const VIDEO_POLICY = {
  desktopLimit: 4,
  mobileLimit: 2,
  loadLimit: 2,
  prepareMargin: 240,
  releaseDelay: 15_000,
  loadTimeout: 15_000,
  resizeDelay: 250,
} as const;

export type VideoCandidate = {
  visible: number;
  near: boolean;
  priority: boolean;
  failed: boolean;
  distance: number;
};

/** Visible intent wins, then viewport coverage and distance. Stable ties avoid playback churn. */
export function rankVideos<T extends VideoCandidate>(items: T[]): T[] {
  return items.filter(item => item.near && !item.failed).sort((a, b) =>
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
