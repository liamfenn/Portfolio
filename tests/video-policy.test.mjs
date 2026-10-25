import test from "node:test";
import assert from "node:assert/strict";
import { rankVideos, videoRendition } from "../src/lib/video-policy.ts";
import { encodingPlan, rate } from "../scripts/lib/video-processing.mjs";

const asset = { renditions: [800, 1200, 1600].map(width => ({ width, h264: `${width}.mp4` })) };
const source = { width: 2160, height: 2160, avg_frame_rate: "60/1", color_primaries: "bt709", color_transfer: "iec61966-2-1", color_range: "tv" };

test("60fps and fractional source rates survive the encoding plan without doubling slower masters", () => {
  for (const value of ["60/1", "60000/1001", "30/1", "24000/1001"]) {
    const plan = encodingPlan({ ...source, avg_frame_rate: value });
    assert.equal(plan.frameRate, value);
    assert.equal(plan.fps, rate(value));
  }
  assert.throws(() => encodingPlan({ ...source, avg_frame_rate: "30/1" }, { fps: "60" }), /cannot exceed/);
});

test("encoding never upscales and includes a useful rung for smaller masters", () => {
  assert.deepEqual(encodingPlan({ ...source, width: 1080 }).widths, [800, 1080]);
  assert.deepEqual(encodingPlan({ ...source, width: 640 }).widths, [640]);
  assert.throws(() => encodingPlan(source, { widths: [801] }), /even integers/);
});

test("HDR and untagged masters require deliberate color handling", () => {
  assert.throws(() => encodingPlan({ ...source, color_transfer: "smpte2084" }), /SDR/);
  assert.throws(() => encodingPlan({ ...source, color_primaries: "bt2020" }), /SDR/);
  assert.throws(() => encodingPlan({ ...source, color_space: "bt2020nc" }), /SDR/);
  assert.throws(() => encodingPlan({ ...source, sample_aspect_ratio: "4:3" }), /square-pixel/);
  assert.throws(() => encodingPlan({ ...source, color_transfer: undefined }), /metadata/);
  assert.equal(encodingPlan({ ...source, color_transfer: undefined }, { assumeSrgb: true }).inputTransfer, "srgb");
});

test("renditions cover actual display pixels, cap DPR, upgrade expansion, and do not downgrade", () => {
  assert.equal(videoRendition(asset, 390, 3).width, 800);
  assert.equal(videoRendition(asset, 600, 2).width, 1200);
  assert.equal(videoRendition(asset, 750, 2, 800).width, 1600);
  assert.equal(videoRendition(asset, 200, 1, 1600).width, 1600);
  assert.equal(videoRendition(asset, 0, 2), null);
  assert.equal(videoRendition({ renditions: [] }, 400, 2), null);
});

test("visible cards outrank warmups; hover and focus take a playback slot without waking distant cards", () => {
  const items = [
    { id: "warm", near: true, visible: 0, priority: true, failed: false, distance: 100 },
    { id: "focused", near: true, visible: 0.2, priority: true, failed: false, distance: 400 },
    { id: "middle", near: true, visible: 1, priority: false, failed: false, distance: 0 },
    { id: "distant", near: false, visible: 0, priority: true, failed: false, distance: 2000 },
    { id: "broken", near: true, visible: 1, priority: true, failed: true, distance: 0 },
  ];
  assert.deepEqual(rankVideos(items).map(item => item.id), ["focused", "middle", "warm"]);
  assert.equal(items[0].id, "warm");
});
