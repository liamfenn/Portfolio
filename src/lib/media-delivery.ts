import type { PortfolioVideoAsset, PortfolioVideoRendition } from "@/lib/media-assets";

/**
 * Where encoded media is served from. Empty means the local /public folder,
 * which is what dev and any checkout without blob credentials will use. In
 * production this points at the Vercel Blob store so the bytes stay out of git.
 */
const MEDIA_BASE_URL = (process.env.NEXT_PUBLIC_MEDIA_BASE_URL ?? "").replace(/\/+$/, "");

/** The codec string browsers match against to decide whether they can play AV1. */
export const AV1_MIME = 'video/mp4; codecs="av01.0.05M.08"';
export const H264_MIME = "video/mp4";

/** Highest DPR worth serving. Beyond 3x the extra pixels are not perceptible. */
const MAX_PIXEL_RATIO = 3;

export function mediaUrl(path: string) {
  if (/^(https?:)?\/\//.test(path) || path.startsWith("data:")) {
    return path;
  }

  return `${MEDIA_BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}

/**
 * Chooses the smallest rendition that still covers the display box at the
 * device's pixel ratio, falling back to the largest available.
 */
export function pickRendition(
  asset: PortfolioVideoAsset,
  displayWidth: number,
): PortfolioVideoRendition | null {
  if (asset.renditions.length === 0) {
    return null;
  }

  const ladder = [...asset.renditions].sort((a, b) => a.width - b.width);
  if (displayWidth <= 0) {
    return ladder[ladder.length - 1];
  }

  const pixelRatio = Math.min(
    typeof window === "undefined" ? 1 : window.devicePixelRatio || 1,
    MAX_PIXEL_RATIO,
  );
  const required = displayWidth * pixelRatio;

  return ladder.find((rendition) => rendition.width >= required) ?? ladder[ladder.length - 1];
}
