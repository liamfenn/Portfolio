import test from "node:test";
import assert from "node:assert/strict";
import { AVATAR_AT, FOCUS_SIZE, GRID_AT, LAND_AT, SPIN_AT, STORY_METRICS, barAt, gridAt, gridTiles, spinProgress, storyCopy, storySchedule } from "../src/lib/og-story.ts";

const WIDTH = 1080, HEIGHT = 608, COUNT = 10, REWARDS = 1;
const PROJECTS = Array.from({ length: COUNT }, (_, index) => ({ company: "Shop", label: `Project ${index}`, period: "Q4 26" }));

test("the spin starts and ends at rest, ramping up then falling back, and covers the whole distance", () => {
  assert.equal(spinProgress(0), 0);
  assert.ok(Math.abs(spinProgress(1) - 1) < 1e-9);
  const rate = s => (spinProgress(s + 0.001) - spinProgress(s - 0.001)) / 0.002;
  assert.ok(rate(0.001) < 0.01 && rate(0.999) < 0.01);
  let previous = 0;
  for (let s = 0.01; s <= 1; s += 0.01) { assert.ok(spinProgress(s) >= previous); previous = spinProgress(s); }
  assert.ok(rate(0.45) > 2 * rate(0.2) && rate(0.45) > 2 * rate(0.85));
});

test("the grid slides up from below with nothing above it, then lands on the Rewards card about five seconds in", () => {
  assert.equal(gridAt(GRID_AT - 1, HEIGHT, STORY_METRICS, COUNT, REWARDS), null);
  const entering = gridAt(GRID_AT + 300, HEIGHT, STORY_METRICS, COUNT, REWARDS);
  assert.ok(entering.top > 32 && entering.top < HEIGHT);
  assert.deepEqual(gridTiles(entering, COUNT, WIDTH, HEIGHT).map(tile => tile.project), [0]);
  assert.ok(LAND_AT >= 4800 && LAND_AT <= 5600, `lands at ${LAND_AT}ms`);
  const landed = gridAt(LAND_AT, HEIGHT, STORY_METRICS, COUNT, REWARDS);
  assert.equal(landed.pos % COUNT, REWARDS);
  assert.ok(landed.speed < 50);
  assert.ok(gridAt((SPIN_AT + LAND_AT) / 2, HEIGHT, STORY_METRICS, COUNT, REWARDS).speed > 3000);
});

test("once focused, one tile shows at a time, centred, and each project is held for less time than the last", () => {
  const { steps, outAt } = storySchedule(COUNT);
  assert.equal(steps.length, COUNT - 1);
  for (let step = 1; step < steps.length; step++) {
    assert.ok(steps[step].dwell < steps[step - 1].dwell);
    assert.ok(steps[step].ms <= steps[step - 1].ms);
  }
  const resting = gridAt(steps[0].at - 10, HEIGHT, STORY_METRICS, COUNT, REWARDS);
  assert.equal(resting.size, FOCUS_SIZE);
  assert.equal(resting.top, (HEIGHT - FOCUS_SIZE) / 2);
  assert.equal(gridTiles(resting, COUNT, WIDTH, HEIGHT).length, 1);
  // The last page lands on the feed's first project, and the bar names it.
  const last = gridAt(outAt - 10, HEIGHT, STORY_METRICS, COUNT, REWARDS);
  assert.equal(Math.round(last.pos) % COUNT, 0);
  assert.equal(storyCopy(outAt - 10, PROJECTS, REWARDS).trail, "Project 0");
  assert.equal(storyCopy(LAND_AT + 10, PROJECTS, REWARDS).trail, `Project ${REWARDS}`);
});

test("the bar starts blank and centred, opens to the column, and rides off with the last tile", () => {
  const first = barAt(0, WIDTH, HEIGHT, STORY_METRICS, COUNT, REWARDS);
  assert.equal(first.avatar, 0);
  assert.equal(first.width, STORY_METRICS.control);
  assert.equal(first.left, (WIDTH - STORY_METRICS.control) / 2);
  assert.equal(first.top, (HEIGHT - STORY_METRICS.control) / 2);
  assert.equal(barAt(AVATAR_AT + 1000, WIDTH, HEIGHT, STORY_METRICS, COUNT, REWARDS).avatar, 1);
  const open = barAt(1400, WIDTH, HEIGHT, STORY_METRICS, COUNT, REWARDS);
  assert.equal(open.width, STORY_METRICS.column);
  assert.deepEqual(storyCopy(1400, PROJECTS, REWARDS), { lead: "", trail: "Office of", trailGap: "artist", action: "Liam Fennell", actionKind: "name" });
  const { endAt } = storySchedule(COUNT);
  assert.ok(barAt(endAt, WIDTH, HEIGHT, STORY_METRICS, COUNT, REWARDS).top >= HEIGHT);
  assert.equal(storyCopy(0, PROJECTS, REWARDS).action, "");
});

test("the player's clock ticks once a second, then the player goes idle", () => {
  assert.equal(storyCopy(1700, PROJECTS, REWARDS).action, "1:19");
  assert.equal(storyCopy(2650, PROJECTS, REWARDS).action, "1:20");
  assert.equal(storyCopy(3000, PROJECTS, REWARDS).action, "1m ago");
});
