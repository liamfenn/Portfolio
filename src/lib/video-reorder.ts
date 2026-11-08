import { VIDEO_POLICY } from "./video-policy";

function inViewport(box: DOMRect) {
  return box.bottom > 0 && box.top < innerHeight && box.right > 0 && box.left < innerWidth && box.width > 0 && box.height > 0;
}

/**
 * Keep pictures over relocated native video surfaces until their next presented frame has painted. Playing videos
 * get a copy of their current frame. Paused ones were offscreen before the sort, and iOS may have dropped their video
 * layer, so a copy could come out black and the surface stays black until it decodes again: they show an opaque
 * poster. Mobile keeps the native video rendered underneath that opaque cover so it can resume.
 */
export function preserveReorderedVideoFrames(videos: Iterable<HTMLVideoElement>, posters: ReadonlySet<HTMLVideoElement> = new Set()) {
  const cleanups: (() => void)[] = [];
  for (const video of videos) {
    if (video.dataset.frameReady !== "true" || video.readyState < 2 || !video.videoWidth) continue;
    const box = video.getBoundingClientRect();
    if (!inViewport(box)) continue;
    const parent = video.parentElement;
    // An in-progress rendition upgrade already has its own retained picture.
    if (!parent || parent.querySelector(".project-preview-upgrade") || "reorderHold" in video.dataset) continue;
    if (video.paused || posters.has(video)) {
      cleanups.push(holdPoster(video));
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
    }, () => { if (inViewport(video.getBoundingClientRect())) cleanups.push(holdPoster(video)); }));
  }
  return () => cleanups.forEach(clear => clear());
}

/** A slow decoder gets a static picture until it presents, rather than a timed reveal of a possibly black surface. */
function holdPoster(video: HTMLVideoElement) {
  video.dataset.reorderHold = "";
  const release = untilPresented(video, undefined, () => { clearTimeout(timeout); delete video.dataset.reorderHold; });
  // A paused offscreen tile may never present or emit another pause event. Only invisible coverage may expire.
  const timeout = setTimeout(() => { if (!inViewport(video.getBoundingClientRect())) release(); }, VIDEO_POLICY.reorderHoldTimeout);
  return release;
}

/** Run `release` after presentation and two paints, or on source release, error, cancellation or an optional timeout. */
function untilPresented(video: HTMLVideoElement, timeoutMs: number | undefined, release: () => void, onTimeout?: () => void) {
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
    video.removeEventListener("pause", paused);
    release();
  };
  const timeout = timeoutMs === undefined ? undefined : setTimeout(() => { onTimeout?.(); clear(); }, timeoutMs);
  const paused = () => { if (!inViewport(video.getBoundingClientRect())) clear(); };
  const presented = () => {
    frame = undefined;
    if (cleared) return;
    paint = requestAnimationFrame(() => { if (!cleared) paint = requestAnimationFrame(clear); });
  };
  if ("requestVideoFrameCallback" in video) frame = video.requestVideoFrameCallback(presented);
  else presented();
  video.addEventListener("emptied", clear);
  video.addEventListener("error", clear);
  video.addEventListener("pause", paused);
  return clear;
}
