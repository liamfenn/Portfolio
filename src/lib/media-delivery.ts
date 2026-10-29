import type { PortfolioVideoAsset, PortfolioVideoRendition } from "@/lib/media-assets";
import { videoRendition } from "./video-policy";

/**
 * Where encoded media is served from. Empty means the local /public folder,
 * which is what dev and any checkout without blob credentials will use. In
 * production this points at the Vercel Blob store so the bytes stay out of git.
 */
const MEDIA_BASE_URL = (process.env.NEXT_PUBLIC_MEDIA_BASE_URL ?? "").replace(/\/+$/, "");

/** The codec string browsers match against to decide whether they can play AV1. */
export const AV1_MIME = 'video/mp4; codecs="av01.0.05M.08"';
export const H264_MIME = "video/mp4";

export function mediaUrl(path: string) {
  if (/^(https?:)?\/\//.test(path) || path.startsWith("data:")) {
    return path;
  }

  const publicPath = `${path.startsWith("/") ? "" : "/"}${path}`;
  // Committed site images live on the current origin, including when videos use Blob storage.
  if (publicPath.startsWith("/images/")) return publicPath;
  return `${MEDIA_BASE_URL}${publicPath}`;
}

/**
 * Chooses the smallest rendition that still covers the display box at the
 * device's pixel ratio, falling back to the largest available.
 */
export function pickRendition(
  asset: PortfolioVideoAsset,
  displayWidth: number,
): PortfolioVideoRendition | null {
  return videoRendition(asset, displayWidth, typeof window === "undefined" ? 1 : window.devicePixelRatio || 1);
}
