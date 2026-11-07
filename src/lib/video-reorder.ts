import { VIDEO_POLICY } from "./video-policy";

/**
 * Keep pictures over relocated native video surfaces until their next presented frame has painted. Playing videos
 * get a copy of their current frame. Paused ones were offscreen before the sort, and iOS may have dropped their video
 * layer, so a copy could come out black and the surface stays black until it decodes again: they show their poster.
 */
export function preserveReorderedVideoFrames(videos: Iterable<HTMLVideoElement>) {
  const cleanups: (() => void)[] = [];
  for (const video of videos) {
    if (video.dataset.frameReady !== "true" || video.readyState < 2 || !video.videoWidth) continue;
    const box = video.getBoundingClientRect();
    if (box.bottom <= 0 || box.top >= innerHeight || box.right <= 0 || box.left >= innerWidth || !box.width || !box.height) continue;
    const parent = video.parentElement;
    // An in-progress rendition upgrade already has its own retained picture.
    if (!parent || parent.querySelector(".project-preview-upgrade")) continue;
    if (video.paused) {
      cleanups.push(untilPresented(video, VIDEO_POLICY.reorderHoldTimeout, () => delete video.dataset.reorderHold));
      video.dataset.reorderHold = "";
      continue;
    }
    const cover = document.createElement("canvas");
    cover.width = Math.ceil(Math.min(video.videoWidth, box.width * Math.min(devicePixelRatio, 2)));
    cover.height = Math.ceil(cover.width * video.videoHeight / video.videoWidth);
    const context = cover.getContext("2d");
    if (!context) continue;
    try { context.drawImage(video, 0, 0, cover.width, cover.height); } catch { continue; }
    cover.className = "project-preview-upgrade";
    cover.setAttribute("aria-hidden", "true");
    cover.dataset.videoReorder = "";
    parent.appendChild(cover);
    cleanups.push(untilPresented(video, VIDEO_POLICY.reorderPaintTimeout, () => {
      cover.remove();
      cover.width = cover.height = 0;
    }));
  }
  return () => cleanups.forEach(clear => clear());
}

/** Run `release` once the video's next frame has presented and two paints have passed, or on release, error or timeout. */
function untilPresented(video: HTMLVideoElement, timeoutMs: number, release: () => void) {
  let frame: number | undefined, paint: number | undefined;
  let cleared = false;
  const clear = () => {
    if (cleared) return;
    cleared = true;
    if (frame !== undefined) video.cancelVideoFrameCallback(frame);
    if (paint !== undefined) cancelAnimationFrame(paint);
    clearTimeout(timeout);
    video.removeEventListener("emptied", clear);
    video.removeEventListener("error", clear);
    release();
  };
  const timeout = setTimeout(clear, timeoutMs);
  const presented = () => {
    frame = undefined;
    if (cleared) return;
    paint = requestAnimationFrame(() => { if (!cleared) paint = requestAnimationFrame(clear); });
  };
  if ("requestVideoFrameCallback" in video) frame = video.requestVideoFrameCallback(presented);
  else presented();
  video.addEventListener("emptied", clear);
  video.addEventListener("error", clear);
  return clear;
}
