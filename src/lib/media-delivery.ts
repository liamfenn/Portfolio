import type { PortfolioVideoAsset, PortfolioVideoRendition } from "@/lib/media-assets";

/**
 * Where encoded media is served from. In dev, the local /public folder. A deployed build reads the Vercel Blob store,
 * so the bytes stay out of git: NEXT_PUBLIC_MEDIA_BASE_URL when it is set, otherwise the store's own address, since the
 * media files aren't in the repo and a build without the variable (Vercel previews, for one) would have none to serve.
 */
const BLOB_STORE_URL = "https://el220fg1tsh8udeh.public.blob.vercel-storage.com";
const MEDIA_BASE_URL = (process.env.NEXT_PUBLIC_MEDIA_BASE_URL || (process.env.NODE_ENV === "production" ? BLOB_STORE_URL : "")).replace(/\/+$/, "");

/** The codec string browsers match against to decide whether they can play AV1. */
export const AV1_MIME = 'video/mp4; codecs="av01.0.05M.08"';
export const H264_MIME = "video/mp4";

/**
 * Highest DPR worth serving. Motion hides fine detail, so 3x phones get the 2x rendition: a card about 330px wide
 * fetches the 800 rung instead of the 1200, which is roughly half the bytes.
 */
const MAX_PIXEL_RATIO = 2;

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
