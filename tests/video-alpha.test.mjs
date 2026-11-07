import test from "node:test";
import assert from "node:assert/strict";
import { alphaDecoder } from "../scripts/lib/alpha-video-processing.mjs";
import { alphaVideoFormat, probeAlphaVideo, videoSource } from "../src/lib/video-alpha.ts";

test("alpha imports require the alpha-aware VP9 decoder or an alpha pixel format", () => {
  assert.deepEqual(alphaDecoder({ codec_name: "vp9", tags: { alpha_mode: "1" } }), ["-c:v", "libvpx-vp9"]);
  assert.deepEqual(alphaDecoder({ codec_name: "vp9", tags: { ALPHA_MODE: "1" } }), ["-c:v", "libvpx-vp9"]);
  assert.deepEqual(alphaDecoder({ codec_name: "prores", pix_fmt: "yuva444p12le" }), []);
  assert.throws(() => alphaDecoder({ codec_name: "av1", pix_fmt: "yuv420p" }), /No decodable alpha/);
});

test("transparent video chooses a verified format and never an opaque fallback", () => {
  const rung = { width: 800, h264: "opaque.mp4", hevcAlpha: "alpha.mov", webmAlpha: "alpha.webm" };
  assert.equal(videoSource(rung, true, "hevcAlpha"), "alpha.mov");
  assert.equal(videoSource(rung, true, "webmAlpha"), "alpha.webm");
  assert.equal(videoSource(rung, true, null), null);
  assert.equal(videoSource({ width: 800, h264: "opaque.mp4" }, true, "webmAlpha"), null);
  assert.equal(videoSource(rung, false, "hevcAlpha"), "opaque.mp4");
});

function browserProbe(t, getMode) {
  const original = Object.getOwnPropertyDescriptor(globalThis, "document");
  const videos = [];
  const document = {
    body: { appendChild(video) { video.mounted = true; } },
    createElement(type) {
      if (type === "video") {
        const video = Object.assign(new EventTarget(), {
          src: "", style: {}, mounted: false, removes: 0, plays: 0, released: false, paused: false,
          setAttribute() {},
          pause() { this.paused = true; },
          removeAttribute() { this.src = ""; this.released = true; },
          remove() { this.mounted = false; this.removes++; },
          // Model iPhone's metadata-only preload: no decoded frame arrives until inline play.
          load() {},
          play() {
            this.plays++;
            if (!this.mounted || !this.muted || !this.defaultMuted || !this.playsInline) return Promise.reject(new Error("Inline playback unavailable"));
            if (getMode() === "denied") return Promise.reject(new Error("NotAllowedError"));
            if (getMode() === "timeout") return new Promise(() => {});
            queueMicrotask(() => this.dispatchEvent(new Event(getMode() === "error" ? "error" : "loadeddata")));
            return Promise.resolve();
          },
        });
        videos.push(video);
        return video;
      }
      return { width: 0, height: 0, getContext: () => ({
        drawImage() { if (getMode() === "tainted") throw new Error("SecurityError"); },
        getImageData: x => ({ data: [0, 0, 0, getMode() === "alpha" && x === 0 ? 0 : 255] }),
      }) };
    },
  };
  Object.defineProperty(globalThis, "document", { configurable: true, value: document });
  t.after(() => original ? Object.defineProperty(globalThis, "document", original) : delete globalThis.document);
  return videos;
}

function assertReleased(video) {
  assert.equal(video.plays, 1);
  assert.equal(video.released, true);
  assert.equal(video.paused, true);
  assert.equal(video.src, "");
  assert.equal(video.mounted, false);
  assert.equal(video.removes, 1);
}

for (const mode of ["alpha", "opaque", "error", "denied", "tainted"]) {
  test(`the inline alpha probe handles ${mode} and releases its temporary video`, async t => {
    const videos = browserProbe(t, () => mode);
    assert.equal(await probeAlphaVideo("probe.mov"), mode === "alpha");
    assertReleased(videos[0]);
    videos[0].dispatchEvent(new Event("error"));
    assert.equal(videos[0].removes, 1);
  });
}

test("a stalled alpha probe times out and removes its mounted video", async t => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const videos = browserProbe(t, () => "timeout");
  const pending = probeAlphaVideo("probe.mov");
  assert.equal(videos[0].mounted, true);
  t.mock.timers.tick(8000);
  assert.equal(await pending, false);
  assertReleased(videos[0]);
});

test("an inconclusive alpha check can retry rather than caching static posters forever", async t => {
  let mode = "denied";
  const videos = browserProbe(t, () => mode);
  assert.equal(await alphaVideoFormat(), null);
  assert.equal(videos.length, 2);
  mode = "alpha";
  assert.equal(await alphaVideoFormat(), "hevcAlpha");
  assert.equal(videos.length, 3);
  assert.equal(await alphaVideoFormat(), "hevcAlpha");
  assert.equal(videos.length, 3);
  videos.forEach(assertReleased);
});
