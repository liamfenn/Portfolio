import test from "node:test";
import assert from "node:assert/strict";
import { alphaDecoder } from "../scripts/lib/alpha-video-processing.mjs";
import { probeAlphaVideo, videoSource } from "../src/lib/video-alpha.ts";

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

for (const mode of ["alpha", "opaque", "error"]) {
  test(`the alpha capability probe handles ${mode} decoding and releases its source`, async t => {
    const original = Object.getOwnPropertyDescriptor(globalThis, "document");
    const video = Object.assign(new EventTarget(), {
      src: "", released: false, paused: false,
      pause() { this.paused = true; },
      removeAttribute() { this.src = ""; this.released = true; },
      load() { if (this.src) queueMicrotask(() => this.dispatchEvent(new Event(mode === "error" ? "error" : "loadeddata"))); },
    });
    const canvas = { width: 0, height: 0, getContext: () => ({ drawImage() {}, getImageData: x => ({ data: [0, 0, 0, mode === "alpha" && x === 0 ? 0 : 255] }) }) };
    Object.defineProperty(globalThis, "document", { configurable: true, value: { createElement: type => type === "video" ? video : canvas } });
    t.after(() => original ? Object.defineProperty(globalThis, "document", original) : delete globalThis.document);
    assert.equal(await probeAlphaVideo("probe.mov"), mode === "alpha");
    assert.equal(video.released, true);
    assert.equal(video.paused, true);
    assert.equal(video.src, "");
  });
}
