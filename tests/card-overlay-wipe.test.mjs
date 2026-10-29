import test from "node:test";
import assert from "node:assert/strict";
import { WIPE_BAND, WIPE_END, WIPE_HIDDEN, WIPE_START, coverFraction, cubicBezier, paletteSamples, parseBezier, rowRevealOpacity, sweepDuration, sweepPosition, wipeFront } from "../src/lib/card-overlay-wipe.ts";

test("the bezier solver matches CSS timing endpoints and symmetry", () => {
  const ease = cubicBezier(.85, 0, .15, 1);
  assert.equal(ease(0), 0);
  assert.equal(ease(1), 1);
  assert.ok(Math.abs(ease(0.5) - 0.5) < 1e-4);
  assert.ok(Math.abs(ease(0.3) + ease(0.7) - 1) < 1e-4);
  // A strong ease-in-out: barely moving off the corner, most of the travel in the middle.
  assert.ok(ease(0.2) < 0.03);
  assert.ok(ease(0.6) - ease(0.4) > 0.5);
  const linear = cubicBezier(0, 0, 1, 1);
  for (const x of [0.1, 0.37, 0.9]) assert.ok(Math.abs(linear(x) - x) < 1e-4);
});

test("bezier tokens parse, and malformed ones are rejected", () => {
  assert.ok(Math.abs(parseBezier(" .85, 0, .15, 1")(0.5) - 0.5) < 1e-4);
  assert.equal(parseBezier(""), null);
  assert.equal(parseBezier(".85, 0, .15"), null);
});

test("the entry touches the corner on its first frame and ends with the blur fully set at the far corner", () => {
  // The corner's fade spans -2 to -0.75 bands behind the front, so the first frame already shows it.
  assert.equal(wipeFront(0), WIPE_START);
  assert.ok(WIPE_START + 2 * WIPE_BAND > 0 && WIPE_START < 0);
  assert.equal(wipeFront(1), WIPE_END);
  assert.ok(WIPE_END - 1 >= 2.3 * WIPE_BAND);
  // The exit rewinds past the corner's fade, so nothing is left drawn.
  assert.ok(WIPE_HIDDEN + 2 * WIPE_BAND <= 0);
});

test("sweep positions run from the top-left corner to the far one at any angle", () => {
  for (const angle of [45, 65]) {
    assert.equal(sweepPosition(0, 0, 400, 300, angle), 0);
    assert.ok(Math.abs(sweepPosition(400, 300, 400, 300, angle) - 1) < 1e-9);
  }
  assert.ok(Math.abs(sweepPosition(200, 0, 200, 200, 45) - 0.5) < 1e-9);
  // Steeper than 45°, the sweep favors height: the bottom-left corner is reached before the top-right.
  assert.ok(sweepPosition(0, 200, 200, 200, 65) > sweepPosition(200, 0, 200, 200, 65));
});

test("rows stay hidden while the front is over them and are fully shown once it has crossed", () => {
  for (const center of [0.2, 0.5, 0.9]) {
    assert.equal(rowRevealOpacity(center, center), 0);
    assert.equal(rowRevealOpacity(center + WIPE_BAND, center), 0);
    assert.equal(rowRevealOpacity(WIPE_END, center), 1);
    assert.equal(rowRevealOpacity(WIPE_HIDDEN, center), 0);
  }
  const fading = rowRevealOpacity(0.5 + 1.6 * WIPE_BAND, 0.5);
  assert.ok(fading > 0 && fading < 1);
});

test("a reversal takes only its share of a full sweep", () => {
  assert.equal(sweepDuration(WIPE_START, WIPE_END, 750), 750);
  assert.ok(Math.abs(sweepDuration(0.5, WIPE_HIDDEN, 500) - 500 * (0.5 - WIPE_HIDDEN) / (WIPE_END - WIPE_START)) < 1e-9);
  assert.equal(sweepDuration(WIPE_END, WIPE_HIDDEN, 500), 500);
  assert.equal(sweepDuration(0.4, 0.4, 500), 0);
});

test("cover fit crops the long side of the source", () => {
  assert.deepEqual(coverFraction(100, 100, 200, 100), [0.5, 1]);
  assert.deepEqual(coverFraction(200, 100, 100, 100), [1, 0.5]);
  assert.deepEqual(coverFraction(100, 100, 100, 100), [1, 1]);
});

test("palette samples spread across the palette and convert to 0–1 RGB", () => {
  assert.deepEqual(paletteSamples(["#ff0000", "#00ff00", "#0000ff", "#ffffff"], 2), [[1, 0, 0], [0, 0, 1]]);
  assert.deepEqual(paletteSamples(["#000000"], 8), [[0, 0, 0]]);
  assert.deepEqual(paletteSamples([], 8), [[1, 1, 1]]);
});
