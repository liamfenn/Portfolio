import type { PortfolioVideoRendition } from "./media-assets";

export type AlphaVideoFormat = "hevcAlpha" | "webmAlpha";

/** A codec can be playable while silently dropping alpha, so check decoded pixels once on intent. */
export function probeAlphaVideo(source: string): Promise<boolean> {
  return new Promise(resolve => {
    const video = document.createElement("video");
    video.muted = true; video.playsInline = true; video.preload = "auto";
    const finish = (supported: boolean) => {
      clearTimeout(timeout);
      video.removeEventListener("loadeddata", ready);
      video.removeEventListener("error", failed);
      video.pause(); video.removeAttribute("src"); video.load();
      resolve(supported);
    };
    const ready = () => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 64;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      try {
        if (!context) { finish(false); return; }
        context.drawImage(video, 0, 0, 64, 64);
        finish(context.getImageData(0, 0, 1, 1).data[3] === 0 && context.getImageData(32, 32, 1, 1).data[3] === 255);
      } catch { finish(false); }
      canvas.width = canvas.height = 0;
    };
    const failed = () => finish(false);
    const timeout = setTimeout(failed, 2000);
    video.addEventListener("loadeddata", ready, { once: true });
    video.addEventListener("error", failed, { once: true });
    video.src = source; video.load();
  });
}

let support: Promise<AlphaVideoFormat | null> | undefined;
export function alphaVideoFormat() {
  return support ??= (async () => {
    if (await probeAlphaVideo("/videos/support/alpha-hevc.mov")) return "hevcAlpha";
    if (await probeAlphaVideo("/videos/support/alpha-vp9.webm")) return "webmAlpha";
    return null;
  })();
}

export function videoSource(rendition: PortfolioVideoRendition, alpha: boolean, format: AlphaVideoFormat | null) {
  if (!alpha) return rendition.h264 ?? null;
  return format ? rendition[format] ?? null : null;
}
