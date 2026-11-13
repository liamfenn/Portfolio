import test from "node:test";
import assert from "node:assert/strict";
import {
  ALBUM_CELL_ORDER, AVATAR_AT, FILTER_AT, FOCUSED_AT, FOCUS_SIZE, GRID_AT, LAND_AT, SONG_ATS, SPIN_AT, STORY_METRICS,
  albumAt, barAt, gridAt, gridTiles, slotProject, spinProgress, storyCopy, storySchedule,
} from "../src/lib/og-story.ts";

const WIDTH = 1366, HEIGHT = 768;
const SHAPE = { count: 10, rewards: 1, cycle: [1, 7, 3, 4] };
const PROJECTS = Array.from({ length: SHAPE.count }, (_, index) => ({ company: "Shop", label: `Project ${index}`, period: "Q4 26" }));
const bar = ms => barAt(ms, WIDTH, HEIGHT, STORY_METRICS, SHAPE);

test("the spin starts and ends at rest, ramping up then falling back, and covers the whole distance", () => {
  assert.equal(spinProgress(0), 0);
  assert.ok(Math.abs(spinProgress(1) - 1) < 1e-9);
  const rate = s => (spinProgress(s + 0.001) - spinProgress(s - 0.001)) / 0.002;
  assert.ok(rate(0.001) < 0.01 && rate(0.999) < 0.01);
  let previous = 0;
  for (let s = 0.01; s <= 1; s += 0.01) { assert.ok(spinProgress(s) >= previous); previous = spinProgress(s); }
  assert.ok(rate(0.45) > 2 * rate(0.2) && rate(0.45) > 2 * rate(0.85));
});

test("the grid slides up from below with nothing above it, then spins to rest on the Rewards card", () => {
  assert.equal(gridAt(GRID_AT - 1, HEIGHT, STORY_METRICS, SHAPE), null);
  const entering = gridAt(GRID_AT + 300, HEIGHT, STORY_METRICS, SHAPE);
  assert.ok(entering.top > 32 && entering.top < HEIGHT);
  assert.deepEqual(gridTiles(entering, SHAPE, WIDTH, HEIGHT).map(tile => tile.project), [0]);
  const landed = gridAt(LAND_AT, HEIGHT, STORY_METRICS, SHAPE);
  assert.equal(slotProject(Math.round(landed.pos), SHAPE), SHAPE.rewards);
  assert.ok(landed.speed < 50);
  assert.ok(gridAt((SPIN_AT + LAND_AT) / 2, HEIGHT, STORY_METRICS, SHAPE).speed > 3000);
});

test("it is a short reel: the spin lands well inside ten seconds and the last project leaves by about fifteen", () => {
  assert.ok(LAND_AT <= 9000, `lands at ${LAND_AT}ms`);
  assert.ok(storySchedule(SHAPE.cycle.length).endAt <= 15000);
});

test("once focused, one larger tile shows at a time, paging through the chosen projects in order", () => {
  const { steps, outAt } = storySchedule(SHAPE.cycle.length);
  assert.equal(steps.length, SHAPE.cycle.length - 1);
  for (let step = 1; step < steps.length; step++) assert.ok(steps[step].dwell <= steps[step - 1].dwell);
  const resting = gridAt(steps[0].at - 10, HEIGHT, STORY_METRICS, SHAPE);
  assert.equal(resting.size, FOCUS_SIZE);
  assert.ok(FOCUS_SIZE > STORY_METRICS.column);
  assert.equal(resting.top, (HEIGHT - FOCUS_SIZE) / 2);
  assert.equal(gridTiles(resting, SHAPE, WIDTH, HEIGHT).length, 1);
  const shown = [FOCUSED_AT + 10, ...steps.map(step => step.at + step.ms + 10)].map(ms => {
    const grid = gridAt(ms, HEIGHT, STORY_METRICS, SHAPE);
    return gridTiles(grid, SHAPE, WIDTH, HEIGHT)[0].project;
  });
  assert.deepEqual(shown, SHAPE.cycle);
  assert.equal(storyCopy(outAt - 10, PROJECTS, SHAPE).trail, `Project ${SHAPE.cycle.at(-1)}`);
  assert.equal(storyCopy(FOCUSED_AT + 10, PROJECTS, SHAPE).trail, `Project ${SHAPE.rewards}`);
});

test("the last tile slides away alone, with nothing following it down", () => {
  const { outAt, endAt } = storySchedule(SHAPE.cycle.length);
  for (let ms = outAt; ms < endAt; ms += 10) {
    const grid = gridAt(ms, HEIGHT, STORY_METRICS, SHAPE);
    assert.ok(gridTiles(grid, SHAPE, WIDTH, HEIGHT).every(tile => tile.project === SHAPE.cycle.at(-1)), `another tile shows at ${ms}ms`);
  }
});

test("the bar starts blank and centred, opens only once the avatar has popped, and rides off with the last tile", () => {
  const first = bar(0);
  assert.equal(first.avatar, 0);
  assert.equal(first.width, STORY_METRICS.control);
  assert.equal(first.left, (WIDTH - STORY_METRICS.control) / 2);
  assert.equal(first.top, (HEIGHT - STORY_METRICS.control) / 2);
  assert.equal(bar(AVATAR_AT + 1000).avatar, 1);
  // While the avatar is still popping, the bar hasn't started to open.
  for (let ms = AVATAR_AT; ms < AVATAR_AT + STORY_METRICS.pop; ms += 5) assert.equal(bar(ms).width, STORY_METRICS.control);
  const open = bar(1800);
  assert.equal(open.width, STORY_METRICS.column);
  assert.equal(open.fillLeft, STORY_METRICS.control);
  assert.deepEqual(storyCopy(1800, PROJECTS, SHAPE), { lead: "", trail: "Office of", trailGap: "artist", action: "Liam Fennell", actionKind: "name" });
  assert.ok(bar(storySchedule(SHAPE.cycle.length).endAt).top >= HEIGHT);
  assert.equal(storyCopy(0, PROJECTS, SHAPE).action, "");
});

test("the player flips through three songs, playing, played a while ago, then playing, each with its own cover", () => {
  const songs = SONG_ATS.map(at => storyCopy(at + 450, PROJECTS, SHAPE));
  assert.equal(new Set(songs.map(song => song.lead)).size, 3);
  assert.deepEqual(songs.map(song => song.actionKind), ["clock", "ago", "clock"]);
  assert.deepEqual(SONG_ATS.map(at => Math.round(bar(at + 450).playing)), [1, 0, 1]);
  // The clock ticks in place once a second.
  const first = storyCopy(SONG_ATS[0] + 100, PROJECTS, SHAPE), next = storyCopy(SONG_ATS[0] + 1100, PROJECTS, SHAPE);
  assert.notEqual(first.action, next.action);
  assert.equal(next.tick, true);
  // Each later song's cover comes in over the last, cell by cell, in a fixed order.
  assert.equal(new Set(ALBUM_CELL_ORDER).size, 64);
  assert.deepEqual(albumAt(SONG_ATS[1] + 500), { under: 1, over: 1, shown: 0 });
  assert.ok(albumAt(SONG_ATS[2] + 100).shown > 0 && albumAt(SONG_ATS[2] + 100).shown < 64);
});

test("Spotify moves sides by shrinking on the right as it grows after the album, with the text holding still", () => {
  const { control } = STORY_METRICS;
  const before = bar(SONG_ATS[0] + 300), after = bar(SONG_ATS[1] - 50);
  assert.equal(before.brandRight, control);
  assert.equal(after.brandLeft, control);
  assert.equal(after.brandRight, 0);
  assert.equal(after.brandLeftX, after.albumX + control);
  for (let ms = SONG_ATS[0] + 300; ms < SONG_ATS[1]; ms += 5) {
    const frame = bar(ms);
    assert.ok(Math.abs(frame.brandRight + frame.brandLeft - control) < 1, `Spotify is not one block's width at ${ms}ms`);
    assert.ok(Math.abs(frame.textLeft - before.textLeft) < 0.5, `the text moves at ${ms}ms`);
  }
});

test("nothing in the bar overlaps: text clears every visible square, and Spotify sits beside the album", () => {
  const { control, panel, inset } = STORY_METRICS;
  for (let ms = 0; ms < LAND_AT; ms += 5) {
    const frame = bar(ms);
    const squares = [frame.avatar > 0.01 ? control : 0, frame.albumIn && frame.album > 0.01 ? frame.albumX + control : 0, frame.brandLeft > 0.1 ? frame.brandLeftX + frame.brandLeft : 0];
    assert.ok(frame.textLeft >= Math.max(...squares) + Math.min(panel, inset) - 0.5, `text under a square at ${ms}ms`);
    assert.ok(frame.actionRight >= frame.brandRight + inset - 0.5, `time under Spotify at ${ms}ms`);
    // (At the flip Spotify tucks under the album as they slide out; that is checked on its own below.)
    if (ms < FILTER_AT && frame.brandLeft > 0.5 && frame.albumIn && frame.album > 0.5) assert.ok(frame.brandLeftX >= frame.albumX + control - 0.5, `album over Spotify at ${ms}ms`);
  }
});

test("text only changes once the bar has settled, except in the site's flip to the filter", () => {
  let previous = JSON.stringify(storyCopy(0, PROJECTS, SHAPE));
  for (let ms = 0; ms < FOCUSED_AT + 50; ms += 5) {
    const copy = storyCopy(ms, PROJECTS, SHAPE), words = JSON.stringify(copy);
    if (words === previous) continue;
    previous = words;
    // The player's clock is a clock: it ticks whatever the bar is doing. And the flip to the filter is the site's
    // header flip, which scrambles the text as the label slides.
    if (copy.tick || ms === FILTER_AT) continue;
    const before = bar(ms - 30), during = bar(ms + 200);
    for (const field of ["textLeft", "actionRight", "fillLeft", "fillRight"]) {
      assert.ok(Math.abs(before[field] - during[field]) < 0.5, `${field} moves as the text changes at ${ms}ms`);
    }
  }
});

test("at the flip, Spotify slides out with the album just behind, whole, as the fill and label follow, without a snap", () => {
  const { control, column, narrow, slot } = STORY_METRICS;
  const near = (actual, expected, message) => assert.ok(Math.abs(actual - expected) < 0.5, message ?? `${actual} is not ${expected}`);
  let previous = bar(FILTER_AT - 1);
  // The bar has already narrowed, so its left edge holds still through the slide; the album and Spotify sit side by side.
  near(previous.width, column - narrow);
  near(previous.albumX, 0);
  near(previous.brandLeftX, control);
  const frames = [];
  for (let ms = FILTER_AT; ms <= FILTER_AT + 700; ms += 1000 / 60) frames.push(bar(ms));
  for (const frame of frames) {
    near(frame.width, column - narrow, "the bar's width moves during the slide");
    near(frame.brandLeft, control, "Spotify changes size");
    // The album trails Spotify a little, Spotify tucking under it, but they never come apart, and the album never
    // reaches past Spotify's right edge; the fill's edge is Spotify's right edge.
    if (frame.albumIn) {
      assert.ok(frame.brandLeftX <= frame.albumX + control + 0.5, "a gap opens between the album and Spotify");
      assert.ok(frame.albumX + control <= frame.brandLeftX + control + 0.5, "the album passes Spotify");
    }
    near(frame.fillLeft, Math.max(0, frame.brandLeftX + control), "the fill comes apart from Spotify");
  }
  for (let index = 1; index < frames.length; index++) {
    const step = frames[index - 1].brandLeftX - frames[index].brandLeftX;
    // Every 60fps frame moves on smoothly: never back, never more than a fifth of a square at once (the slide covers
    // two), and its speed never changes abruptly from one frame to the next.
    assert.ok(step >= 0 && step < control / 5, `a jump of ${step.toFixed(1)}px at frame ${index}`);
    if (index > 1) assert.ok(Math.abs(step - (frames[index - 2].brandLeftX - frames[index - 1].brandLeftX)) < control / 20, `a lurch at frame ${index}`);
  }
  // The dot pops in with the flip, not once the squares have gone.
  assert.ok(bar(FILTER_AT + STORY_METRICS.pop).mark > 0.99);
  const last = frames.at(-1);
  near(last.brandLeftX, -control);
  near(last.fillLeft, 0);
  near(last.textLeft, slot);
  assert.equal(last.albumIn, 0);
});

test("the grid follows the bar up, but only reaches it once it has become the filter", () => {
  for (let ms = GRID_AT; ms < FILTER_AT; ms += 5) {
    const grid = gridAt(ms, HEIGHT, STORY_METRICS, SHAPE), frame = bar(ms);
    assert.ok(grid.top > frame.top + STORY_METRICS.control, `grid under the bar at ${ms}ms`);
  }
});
