import test from "node:test";
import assert from "node:assert/strict";
import { PROJECTS, SPIN_MS, bezier, enterEase, leaveEase, reelLayout, rowTop, scrollOffset, scrollSpeed, speedIntensity, warpAt } from "../src/lib/og-reel.ts";

test("the grid drifts slowly at first, then ramps up from about midway, never pausing", () => {
  assert.equal(scrollOffset(0), 0);
  assert.ok(scrollSpeed(SPIN_MS * 0.25) < 200);
  assert.ok(scrollSpeed(SPIN_MS) > 5000);
  for (let ms = 100; ms <= SPIN_MS; ms += 100) {
    assert.ok(scrollSpeed(ms) >= scrollSpeed(ms - 100));
    assert.ok(scrollOffset(ms) > scrollOffset(ms - 100));
  }
  assert.ok(scrollSpeed(SPIN_MS / 2) < scrollSpeed(SPIN_MS) / 4);
});

test("the scroll blurs only once it is moving fast", () => {
  assert.equal(speedIntensity(70), 0);
  assert.ok(speedIntensity(300) < 0.1);
  assert.equal(speedIntensity(2000), 1);
});

test("the slide in accelerates, then decelerates; the way out only accelerates", () => {
  assert.ok(Math.abs(bezier(0.25, 0.1, 0.25, 1, 0)) < 1e-6 && Math.abs(bezier(0.25, 0.1, 0.25, 1, 1) - 1) < 1e-6);
  assert.ok(Math.abs(enterEase(0.5) - 0.5) < 0.01);
  assert.ok(enterEase(0.1) < 0.05 && enterEase(0.9) > 0.95);
  assert.ok(leaveEase(0.5) < 0.5 && leaveEase(1) > 0.999);
});

test("twelve projects: six rows of two on a wide card, twelve in one column with 60px margins on a tall one", () => {
  assert.deepEqual(reelLayout(1200, 675), { columns: 2, rows: 6, size: 469.33, gap: 8 });
  assert.deepEqual(reelLayout(675, 1200), { columns: 1, rows: 12, size: 555, gap: 8 });
  for (const layout of [reelLayout(1200, 675), reelLayout(675, 1200)]) assert.equal(layout.rows * layout.columns, PROJECTS);
});

test("rows keep the same gap down as across, start below the first, and come round once they leave the top", () => {
  const layout = reelLayout(1200, 675), pitch = layout.size + layout.gap, first = 103;
  for (let row = 1; row < layout.rows; row++) assert.ok(Math.abs(rowTop(row, 0, layout, first) - rowTop(row - 1, 0, layout, first) - pitch) < 1e-9);
  assert.ok(rowTop(layout.rows - 1, 0, layout, first) > first);
  // Row 0 has scrolled fully off the top: it is now below the last row, a gap after it.
  const offset = first + pitch + 1;
  assert.ok(Math.abs(rowTop(0, offset, layout, first) - rowTop(layout.rows - 1, offset, layout, first) - pitch) < 1e-9);
});

test("the warp leaves the middle alone and draws the top and bottom corners in, more toward the sides", () => {
  assert.deepEqual(warpAt(0.8, 0), { x: 0, y: 0 });
  assert.equal(warpAt(0, 1).x, 0);
  assert.ok(warpAt(1, 1).x > warpAt(0.5, 1).x && warpAt(0.5, 1).x > 0);
  assert.ok(warpAt(-1, -1).x < 0 && warpAt(-1, -1).y < 0);
  assert.ok(warpAt(1, 1).x <= 0.1);
});
