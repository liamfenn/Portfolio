import test from "node:test";
import assert from "node:assert/strict";
import { trackPositionAt } from "../src/lib/track-clock.ts";

const at = ms => new Date(ms).toISOString();
const seconds = position => Math.floor(position / 1000);

test("a refresh between ticks doesn't move the clock off the beat", () => {
  const tick = 1_000_000; // a whole-second tick of the device clock
  // Last fetch said 60.0s at tick - 600ms, so at the tick the song is at 60.6s: shows 1:00.
  const before = { isPlaying: true, progressMs: 60_000, fetchedAt: at(tick - 600) };
  assert.equal(seconds(trackPositionAt(before, tick)), 60);
  // A refresh lands 700ms after the tick, when the song is at 61.3s, already past its own second.
  const refreshed = { isPlaying: true, progressMs: 61_300, fetchedAt: at(tick + 700) };
  // Rendered with the same tick time, it still shows 1:00 ...
  assert.equal(seconds(trackPositionAt(refreshed, tick)), 60);
  // ... and moves to 1:01 on the next tick.
  assert.equal(seconds(trackPositionAt(refreshed, tick + 1000)), 61);
});

test("a real jump (seek or new song) still shows straight away", () => {
  const tick = 1_000_000;
  const newSong = { isPlaying: true, progressMs: 2_000, fetchedAt: at(tick + 300) };
  assert.equal(seconds(trackPositionAt(newSong, tick)), 1);
});

test("position is clamped to the song and frozen while paused", () => {
  assert.equal(trackPositionAt({ isPlaying: true, progressMs: 100, fetchedAt: at(5_000) }, 4_000), 0);
  assert.equal(trackPositionAt({ isPlaying: true, progressMs: 179_000, durationMs: 180_000, fetchedAt: at(0) }, 10_000), 180_000);
  assert.equal(trackPositionAt({ isPlaying: false, progressMs: 42_000, fetchedAt: at(0) }, 99_000), 42_000);
  assert.equal(trackPositionAt({ isPlaying: true }, 1_000), null);
});
