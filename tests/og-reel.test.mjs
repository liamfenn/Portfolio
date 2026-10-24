import test from "node:test";
import assert from "node:assert/strict";
import { collapseScale, popIn, reelLayout, scrollOffset, scrollSpeed, speedIntensity } from "../src/lib/og-reel.ts";

test("the scroll starts at a crawl and keeps speeding up, with no pause", () => {
  assert.equal(scrollOffset(0), 0);
  assert.ok(scrollSpeed(100) < 100);
  let previous = 0;
  for (let ms = 250; ms <= 3400; ms += 250) {
    assert.ok(scrollSpeed(ms) > scrollSpeed(ms - 250));
    assert.ok(scrollOffset(ms) > previous);
    previous = scrollOffset(ms);
  }
  assert.ok(scrollSpeed(3400) > 3000);
});

test("rows bend and blur only once the grid is moving fast", () => {
  assert.equal(speedIntensity(0), 0);
  assert.ok(speedIntensity(200) < 0.1);
  assert.equal(speedIntensity(2000), 1);
});

test("a block pops in from under full size, overshoots, and settles", () => {
  assert.ok(popIn(0) < 0.7);
  assert.ok(Math.max(...[100, 120, 140, 160].map(popIn)) > 1);
  assert.ok(Math.abs(popIn(800) - 1) < 0.01);
});

test("the collapse pulls harder as it goes, ending at nothing", () => {
  assert.equal(collapseScale(0), 1);
  assert.ok(1 - collapseScale(0.5) < 0.5);
  assert.equal(collapseScale(1), 0);
});

test("wide cards get the storyboard's two columns; tall ones one column with 60px margins", () => {
  assert.deepEqual(reelLayout(1200, 675), { columns: 2, size: 469.33, gap: 8 });
  assert.deepEqual(reelLayout(675, 1200), { columns: 1, size: 555, gap: 8 });
});
