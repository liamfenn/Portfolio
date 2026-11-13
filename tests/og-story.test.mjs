import test from "node:test";
import assert from "node:assert/strict";
import { AVATAR_AT, FILTER_AT, FOCUSED_AT, FOCUS_SIZE, GRID_AT, LAND_AT, SPIN_AT, STORY_METRICS, TRACK_AT, barAt, gridAt, gridTiles, spinProgress, storyCopy, storySchedule } from "../src/lib/og-story.ts";

const WIDTH = 1366, HEIGHT = 768, COUNT = 10, REWARDS = 1;
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

test("the grid slides up from below with nothing above it, then glides to rest on the Rewards card", () => {
  assert.equal(gridAt(GRID_AT - 1, HEIGHT, STORY_METRICS, COUNT, REWARDS), null);
  const entering = gridAt(GRID_AT + 300, HEIGHT, STORY_METRICS, COUNT, REWARDS);
  assert.ok(entering.top > 32 && entering.top < HEIGHT);
  assert.deepEqual(gridTiles(entering, COUNT, WIDTH, HEIGHT).map(tile => tile.project), [0]);
  assert.ok(LAND_AT >= 10000 && LAND_AT <= 13000, `lands at ${LAND_AT}ms`);
  const landed = gridAt(LAND_AT, HEIGHT, STORY_METRICS, COUNT, REWARDS);
  assert.equal(landed.pos % COUNT, REWARDS);
  assert.ok(landed.speed < 50);
  assert.ok(gridAt((SPIN_AT + LAND_AT) / 2, HEIGHT, STORY_METRICS, COUNT, REWARDS).speed > 3000);
});

test("once focused, one tile shows at a time, centred, and each project is held for less time than the last, down to a floor", () => {
  const { steps, outAt } = storySchedule(COUNT);
  assert.equal(steps.length, COUNT - 1);
  for (let step = 1; step < steps.length; step++) {
    assert.ok(steps[step].dwell <= steps[step - 1].dwell);
    assert.ok(steps[step].ms <= steps[step - 1].ms);
  }
  assert.ok(steps[1].dwell < steps[0].dwell && steps.at(-1).dwell >= 200 && steps.at(-1).ms >= 300);
  const resting = gridAt(steps[0].at - 10, HEIGHT, STORY_METRICS, COUNT, REWARDS);
  assert.equal(resting.size, FOCUS_SIZE);
  assert.equal(resting.top, (HEIGHT - FOCUS_SIZE) / 2);
  assert.equal(gridTiles(resting, COUNT, WIDTH, HEIGHT).length, 1);
  // The last page lands on the feed's first project, and the bar names it.
  const last = gridAt(outAt - 10, HEIGHT, STORY_METRICS, COUNT, REWARDS);
  assert.equal(Math.round(last.pos) % COUNT, 0);
  assert.equal(storyCopy(outAt - 10, PROJECTS, REWARDS).trail, "Project 0");
  assert.equal(storyCopy(FOCUSED_AT + 10, PROJECTS, REWARDS).trail, `Project ${REWARDS}`);
});

test("the bar starts blank and centred, opens to the column, and rides off with the last tile", () => {
  const first = barAt(0, WIDTH, HEIGHT, STORY_METRICS, COUNT, REWARDS);
  assert.equal(first.avatar, 0);
  assert.equal(first.width, STORY_METRICS.control);
  assert.equal(first.left, (WIDTH - STORY_METRICS.control) / 2);
  assert.equal(first.top, (HEIGHT - STORY_METRICS.control) / 2);
  assert.equal(barAt(AVATAR_AT + 1000, WIDTH, HEIGHT, STORY_METRICS, COUNT, REWARDS).avatar, 1);
  const open = barAt(2600, WIDTH, HEIGHT, STORY_METRICS, COUNT, REWARDS);
  assert.equal(open.width, STORY_METRICS.column);
  assert.deepEqual(storyCopy(2600, PROJECTS, REWARDS), { lead: "", trail: "Office of", trailGap: "artist", action: "Liam Fennell", actionKind: "name" });
  const { endAt } = storySchedule(COUNT);
  assert.ok(barAt(endAt, WIDTH, HEIGHT, STORY_METRICS, COUNT, REWARDS).top >= HEIGHT);
  assert.equal(storyCopy(0, PROJECTS, REWARDS).action, "");
});

test("the player's clock ticks once a second, then the player goes idle", () => {
  assert.equal(storyCopy(TRACK_AT + 100, PROJECTS, REWARDS).action, "1:19");
  assert.equal(storyCopy(TRACK_AT + 1100, PROJECTS, REWARDS).action, "1:20");
  assert.equal(storyCopy(7000, PROJECTS, REWARDS).action, "1m ago");
});

test("nothing in the bar overlaps: text clears every visible square, and Spotify only shows where the fill has left it", () => {
  const { control, panel, inset } = STORY_METRICS;
  for (let ms = 0; ms < LAND_AT; ms += 5) {
    const bar = barAt(ms, WIDTH, HEIGHT, STORY_METRICS, COUNT, REWARDS);
    const squares = [bar.avatar > 0.01 ? control : 0, bar.album > 0.01 ? bar.albumX + control : 0];
    // Spotify shows only outside the fill: left of its left edge, or right of its right end.
    const fillRight = bar.width - bar.fillRight, brandRight = bar.brandX + control;
    // (The bar clips at its own width, so Spotify past that edge is hidden too.)
    const showsLeft = bar.brand > 0 && bar.brandX < bar.fillLeft - 0.5;
    const showsRight = bar.brand > 0 && Math.min(brandRight, bar.width) > Math.max(bar.brandX, fillRight) + 0.5;
    const brandShows = showsLeft || showsRight;
    if (showsLeft) squares.push(Math.min(brandRight, bar.fillLeft));
    assert.ok(bar.textLeft >= Math.max(...squares) + Math.min(panel, inset) - 0.5, `text under a square at ${ms}ms`);
    if (showsRight) assert.ok(bar.actionRight >= bar.width - Math.max(bar.brandX, fillRight) + inset - 0.5, `time under Spotify at ${ms}ms`);
    // The album and Spotify never show on top of each other.
    if (brandShows && bar.album > 0.01) assert.ok(bar.brandX >= bar.albumX + control - 0.5 || bar.brandX + control <= bar.albumX + 0.5, `album over Spotify at ${ms}ms`);
  }
});

test("text only changes once the bar has settled, and the bar holds still while it changes", () => {
  let previous = JSON.stringify(storyCopy(0, PROJECTS, REWARDS));
  for (let ms = 0; ms < FOCUSED_AT + 50; ms += 5) {
    const copy = storyCopy(ms, PROJECTS, REWARDS), words = JSON.stringify(copy);
    if (words === previous) continue;
    // The player's clock is a clock: it ticks whatever the bar is doing.
    const ticked = copy.actionKind === "clock" && JSON.parse(previous).actionKind === "clock";
    previous = words;
    if (ticked) continue;
    const before = barAt(ms - 30, WIDTH, HEIGHT, STORY_METRICS, COUNT, REWARDS), during = barAt(ms + 300, WIDTH, HEIGHT, STORY_METRICS, COUNT, REWARDS);
    for (const field of ["textLeft", "actionRight", "fillLeft", "fillRight"]) {
      assert.ok(Math.abs(before[field] - during[field]) < 0.5, `${field} moves as the text changes at ${ms}ms`);
    }
  }
});

test("the grid only reaches the bar once it has become the filter", () => {
  for (let ms = GRID_AT; ms < FILTER_AT; ms += 5) {
    const grid = gridAt(ms, HEIGHT, STORY_METRICS, COUNT, REWARDS), bar = barAt(ms, WIDTH, HEIGHT, STORY_METRICS, COUNT, REWARDS);
    assert.ok(grid.top > bar.top + STORY_METRICS.control, `grid under the bar at ${ms}ms`);
  }
});

test("the last tile slides away alone, with nothing following it down", () => {
  const { outAt, endAt } = storySchedule(COUNT);
  for (let ms = outAt; ms < endAt; ms += 10) {
    const grid = gridAt(ms, HEIGHT, STORY_METRICS, COUNT, REWARDS);
    assert.ok(gridTiles(grid, COUNT, WIDTH, HEIGHT).every(tile => tile.project === 0), `another tile shows at ${ms}ms`);
  }
});
