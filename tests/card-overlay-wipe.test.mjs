import test from "node:test";
import assert from "node:assert/strict";
import { WIPE_BAND, coverFraction, cubicBezier, diagonalOf, parseBezier, rowRevealOpacity, wipeFront } from "../src/lib/card-overlay-wipe.ts";

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

test("the front starts and ends outside the tile, with the blur fully set at the far corner", () => {
  assert.ok(wipeFront(0) + WIPE_BAND < 0);
  assert.ok(wipeFront(1) - 1 >= 2 * WIPE_BAND);
  assert.equal(diagonalOf(0, 0, 400, 200), 0);
  assert.equal(diagonalOf(400, 200, 400, 200), 1);
  assert.equal(diagonalOf(400, 0, 400, 200), 0.5);
});

test("rows stay hidden while the lens is over them and are fully shown by the end", () => {
  for (const center of [0.2, 0.5, 0.9]) {
    assert.equal(rowRevealOpacity(center, center), 0);
    assert.equal(rowRevealOpacity(center + WIPE_BAND, center), 0);
    assert.equal(rowRevealOpacity(wipeFront(1), center), 1);
  }
  const fading = rowRevealOpacity(0.5 + 1.6 * WIPE_BAND, 0.5);
  assert.ok(fading > 0 && fading < 1);
});

test("cover fit crops the long side of the source", () => {
  assert.deepEqual(coverFraction(100, 100, 200, 100), [0.5, 1]);
  assert.deepEqual(coverFraction(200, 100, 100, 100), [1, 0.5]);
  assert.deepEqual(coverFraction(100, 100, 100, 100), [1, 1]);
});
