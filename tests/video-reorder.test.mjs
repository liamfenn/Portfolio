import test from "node:test";
import assert from "node:assert/strict";
import { preserveReorderedVideoFrames } from "../src/lib/video-reorder.ts";
import { VIDEO_POLICY } from "../src/lib/video-policy.ts";

function environment(t) {
  const paints = new Map();
  let nextPaint = 0;
  const canvases = [];
  const globals = {
    innerWidth: 393, innerHeight: 850, devicePixelRatio: 3,
    requestAnimationFrame: callback => { paints.set(++nextPaint, callback); return nextPaint; },
    cancelAnimationFrame: id => paints.delete(id),
    document: { createElement: () => {
      const canvas = {
        width: 0, height: 0, dataset: {}, removed: false,
        getContext: () => ({ drawImage: (...args) => { canvas.drawn = args; } }),
        setAttribute: () => {}, remove: () => { canvas.removed = true; },
      };
      canvases.push(canvas);
      return canvas;
    } },
  };
  for (const [name, value] of Object.entries(globals)) {
    const original = Object.getOwnPropertyDescriptor(globalThis, name);
    Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
    t.after(() => original ? Object.defineProperty(globalThis, name, original) : delete globalThis[name]);
  }
  const video = (overrides = {}) => Object.assign(new EventTarget(), {
    dataset: { frameReady: "true" }, readyState: 4, videoWidth: 1200, videoHeight: 1200,
    currentTime: 8, src: "unchanged.mp4", paused: false,
    getBoundingClientRect: () => ({ top: 100, bottom: 493, left: 0, right: 393, width: 393, height: 393 }),
    parentElement: { querySelector: () => null, appendChild: () => {} },
    requestVideoFrameCallback(callback) { this.present = callback; return 1; },
    cancelVideoFrameCallback() { this.cancelled = true; },
    play() { assert.fail("frame protection must not change playback"); },
    pause() { assert.fail("frame protection must not pause playback"); },
    load() { assert.fail("frame protection must not reload a source"); },
  }, overrides);
  const paint = () => { const callbacks = [...paints.values()]; paints.clear(); callbacks.forEach(callback => callback()); };
  return { video, canvases, paint, paints };
}

test("reordered video keeps its picture through presentation and two paints without changing playback", t => {
  const env = environment(t), video = env.video();
  const clear = preserveReorderedVideoFrames([video]);
  t.after(clear);
  const canvas = env.canvases[0];
  assert.equal(canvas.width, 786, "capture is bounded to the displayed pixels at the existing 2x DPR cap");
  assert.equal(canvas.drawn[0], video);
  assert.equal(canvas.removed, false);
  video.present();
  env.paint();
  assert.equal(canvas.removed, false);
  env.paint();
  assert.equal(canvas.removed, true);
  assert.equal(canvas.width, 0, "release the backing bitmap after use");
  assert.equal(video.currentTime, 8);
  assert.equal(video.src, "unchanged.mp4");
});

test("rapid reorders cancel stale frame callbacks and do not leave paint work behind", t => {
  const env = environment(t), video = env.video();
  const clear = preserveReorderedVideoFrames([video]);
  clear();
  clear();
  video.present();
  assert.equal(video.cancelled, true);
  assert.equal(env.canvases[0].removed, true);
  assert.equal(env.paints.size, 0);
});

test("cold, offscreen and already covered videos retain their existing fallback", t => {
  const env = environment(t);
  const clear = preserveReorderedVideoFrames([
    env.video({ dataset: {}, readyState: 0 }),
    env.video({ getBoundingClientRect: () => ({ top: 900, bottom: 1293, left: 0, right: 393, width: 393, height: 393 }) }),
    env.video({ parentElement: { querySelector: () => ({}) } }),
  ]);
  clear();
  assert.equal(env.canvases.length, 0);
});

test("source release removes the sort cover immediately", t => {
  const env = environment(t), video = env.video();
  const clear = preserveReorderedVideoFrames([video]);
  t.after(clear);
  video.dispatchEvent(new Event("emptied"));
  assert.equal(env.canvases[0].removed, true);
  video.present();
  assert.equal(env.paints.size, 0);
});

test("a video that never presents cannot leave a stuck cover", async t => {
  const env = environment(t), video = env.video();
  const clear = preserveReorderedVideoFrames([video]);
  t.after(clear);
  await new Promise(resolve => setTimeout(resolve, VIDEO_POLICY.reorderPaintTimeout + 30));
  assert.equal(env.canvases[0].removed, true);
  assert.equal(env.canvases[0].width, 0);
  assert.equal(video.cancelled, true);
});

test("a paused video relocated into view holds its poster, not a frame copy, until it presents again", t => {
  const env = environment(t), video = env.video({ paused: true });
  const clear = preserveReorderedVideoFrames([video]);
  t.after(clear);
  assert.equal(env.canvases.length, 0, "a suspended surface could copy as black");
  assert.equal(video.dataset.reorderHold, "");
  video.present();
  env.paint();
  assert.equal(video.dataset.reorderHold, "");
  env.paint();
  assert.equal("reorderHold" in video.dataset, false);
  assert.equal(video.src, "unchanged.mp4");
});

test("a held poster clears on source release and on repeat sorts", t => {
  const env = environment(t), released = env.video({ paused: true }), resorted = env.video({ paused: true });
  const clear = preserveReorderedVideoFrames([released, resorted]);
  released.dispatchEvent(new Event("emptied"));
  assert.equal("reorderHold" in released.dataset, false);
  clear();
  assert.equal("reorderHold" in resorted.dataset, false);
  assert.equal(resorted.cancelled, true);
});
