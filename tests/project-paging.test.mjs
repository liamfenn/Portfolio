import test from "node:test";
import assert from "node:assert/strict";
import { commitsPage, pagingIntent, restartsWheelGesture, scaledBox, swipesToDismiss, tileOnScreen } from "../src/lib/project-paging.ts";

test("a tile counts as on screen only when enough of it shows for a return flight to read", () => {
  const tile = top => ({ left: 0, top, width: 400, height: 400 });
  assert.equal(tileOnScreen(tile(100), 400, 800), true);
  assert.equal(tileOnScreen(tile(-300), 400, 800), true);
  assert.equal(tileOnScreen(tile(-350), 400, 800), false);
  assert.equal(tileOnScreen(tile(790), 400, 800), false);
  assert.equal(tileOnScreen(tile(-2000), 400, 800), false);
  assert.equal(tileOnScreen(tile(2000), 400, 800), false);
});

test("scaling a box keeps its center", () => {
  assert.deepEqual(scaledBox({ left: 0, top: 100, width: 200, height: 200 }, 0.5), { left: 50, top: 150, width: 100, height: 100 });
});

test("swiping down exits only from the top of the view, and only when mostly vertical", () => {
  assert.equal(swipesToDismiss(0, 80, 0, 64), true);
  assert.equal(swipesToDismiss(0, 40, 0, 64), false);
  assert.equal(swipesToDismiss(0, 80, 120, 64), false);
  assert.equal(swipesToDismiss(0, -80, 0, 64), false);
  assert.equal(swipesToDismiss(70, 80, 0, 64), false);
});

test("paging intent waits for deliberate horizontal motion and leaves vertical gestures to scrolling", () => {
  assert.equal(pagingIntent(5, 3, 8), "pending");
  assert.equal(pagingIntent(12, 11, 8), "vertical");
  assert.equal(pagingIntent(-40, 10, 8), "horizontal");
  assert.equal(pagingIntent(20, -80, 8), "vertical");
});

test("paging commits sufficient travel or a deliberate flick in either direction", () => {
  for (const sign of [-1, 1]) {
    assert.equal(commitsPage(sign * 80, 393, 0, 8), true);
    assert.equal(commitsPage(sign * 30, 393, sign * 0.8, 8), true);
    assert.equal(commitsPage(sign * 20, 393, sign * 2, 8), false);
    assert.equal(commitsPage(sign * 45, 393, 0.1, 8), false);
  }
});

test("a reversed short drag snaps back instead of using stale flick velocity", () => {
  assert.equal(commitsPage(35, 393, -0.8, 8), false);
  assert.equal(commitsPage(-35, 393, 0.8, 8), false);
});

test("a new trackpad stroke can interrupt momentum without waiting for complete silence", () => {
  assert.equal(restartsWheelGesture(24, 300, 4, 2, 80, 8), true);
  assert.equal(restartsWheelGesture(-24, -300, -4, -2, 80, 8), true);
  assert.equal(restartsWheelGesture(-12, 300, 40, 50, 80, 8), true);
  for (const [x, last, previous] of [[60, 60, 60], [20, 30, 40], [3, 2, 4], [12, 10, 14], [90, 70, 50]]) {
    assert.equal(restartsWheelGesture(x, 300, last, previous, 80, 8), false);
  }
});
