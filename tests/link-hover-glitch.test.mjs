import test from "node:test";
import assert from "node:assert/strict";
import { cssMilliseconds, glitchLetters } from "../src/lib/color-glitch.ts";

test("theme bursts have a visible minimum while respecting short text and fraction caps", () => {
  for (const length of [0, 1, 6, 50, 400]) {
    for (const random of [() => 0, () => .99999]) {
      const selected = glitchLetters(length, .4, 96, random, 48);
      const limit = Math.min(Math.floor(length * .4), 96);
      assert.ok(selected.length >= Math.min(48, limit));
      assert.ok(selected.length <= limit);
      assert.equal(new Set(selected).size, selected.length);
    }
  }
});

test("glitch lead timing survives CSS optimization to seconds", () => {
  assert.equal(cssMilliseconds("60ms"), 60);
  assert.equal(cssMilliseconds(" .06s "), 60);
});

test("hover flashes never exceed 60% of a label, including short links", () => {
  for (let length = 0; length < 100; length++) {
    for (const random of [() => 0, () => 0.5, () => 0.999999]) {
      const selected = glitchLetters(length, 0.6, 3, random);
      assert.ok(selected.length <= Math.floor(length * 0.6));
      assert.ok(selected.length <= 3);
      assert.equal(new Set(selected).size, selected.length);
      assert.ok(selected.every(index => index >= 0 && index < length));
      if (length >= 2) assert.ok(selected.length > 0);
    }
  }
});

test("different random choices flash different letter positions", () => {
  assert.deepEqual(glitchLetters(10, 0.6, 3, () => 0), [0]);
  assert.deepEqual(glitchLetters(10, 0.6, 3, () => 0.999999), [9, 8, 7]);
});
