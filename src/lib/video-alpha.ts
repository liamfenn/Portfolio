import type { PortfolioVideoRendition } from "./media-assets";

export type AlphaVideoFormat = "hevcAlpha" | "webmAlpha";

/** A codec can be playable while silently dropping alpha, so check decoded pixels once on intent. */
export function probeAlphaVideo(source: string): Promise<boolean> {
  return new Promise(resolve => {
    const video = document.createElement("video");
    video.muted = video.defaultMuted = true; video.playsInline = true; video.preload = "auto";
    video.setAttribute("aria-hidden", "true");
    video.style.cssText = "position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;pointer-events:none";
    let finished = false;
    const finish = (supported: boolean) => {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      video.removeEventListener("loadeddata", ready);
      video.removeEventListener("error", failed);
      video.pause(); video.removeAttribute("src"); video.load();
      video.remove();
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
    const timeout = setTimeout(failed, 8000);
    video.addEventListener("loadeddata", ready, { once: true });
    video.addEventListener("error", failed, { once: true });
    // iPhone Safari may preload only metadata. A mounted, muted inline play requests a decoded frame.
    document.body.appendChild(video);
    video.src = source; video.load();
    void video.play().catch(failed);
  });
}

let support: Promise<AlphaVideoFormat | null> | undefined;
export function alphaVideoFormat() {
  return support ??= (async () => {
    if (await probeAlphaVideo("/videos/support/alpha-hevc.mov")) return "hevcAlpha";
    if (await probeAlphaVideo("/videos/support/alpha-vp9.webm")) return "webmAlpha";
    // A timeout or autoplay denial is not permanent evidence that neither codec works.
    support = undefined;
    return null;
  })();
}

// The imported alpha files: HEVC Main level 4.0 and VP9 profile 0, about 4 Mbps at the 1200 rung.
const ALPHA_DECODING = {
  hevcAlpha: 'video/mp4; codecs="hvc1.1.6.L120.B0"',
  webmAlpha: 'video/webm; codecs="vp09.00.40.08"',
} as const;

/**
 * Whether this machine can keep alpha playing in the grid. Old Macs decode HEVC in software, which the browser reports
 * as not power efficient. Chrome decodes VP9 alpha in software on every machine, so only its smoothness estimate counts.
 */
export async function alphaDecodesSmoothly(format: AlphaVideoFormat, { size, framerate }: { size: number; framerate: number }) {
  if (!navigator.mediaCapabilities?.decodingInfo) return false;
  try {
    const info = await navigator.mediaCapabilities.decodingInfo({
      type: "file", video: { contentType: ALPHA_DECODING[format], width: size, height: size, framerate, bitrate: 4_000_000 },
    });
    return info.supported && info.smooth && (format === "webmAlpha" || info.powerEfficient);
  } catch { return false; }
}

/**
 * Alpha clips also carry an H.264 copy composited onto the tile color. It looks identical wherever the tile
 * backdrop shows through, and decodes in hardware everywhere, so true alpha is reserved for where it's visible.
 */
export function videoSource(rendition: PortfolioVideoRendition, format: AlphaVideoFormat | null) {
  return (format && rendition[format]) || rendition.h264 || null;
}
