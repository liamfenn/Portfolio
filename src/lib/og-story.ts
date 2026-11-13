import { bezier, enterEase, speedIntensity } from "@/lib/og-reel";

/**
 * The story video (storyboard 678:4147), told with the site's own pieces: the avatar pops in and the header bar opens
 * into "Office of … Liam Fennell", becomes the music player, then the work filter as the grid slides up beneath it. The
 * grid spins like the work reel (the same accelerate-then-decelerate slides, warp, and motion blur), lands on the
 * Rewards card about five seconds in, and pages through the rest of the work, each project held a little less than the
 * last, ending on the first. That project slides away and the office name glitches in and back out to blank.
 *
 * Everything here is a pure function of time, so a frame can be checked without a browser; og-story.tsx draws it.
 */

/** Lengths from tokens.css, read by the component; these defaults are the current token values, for tests. */
export interface StoryMetrics {
  /** --portfolio-column-width, the bar and grid's width. */
  column: number;
  /** --portfolio-control-size: the bar's height, and the avatar, album and Spotify squares. */
  control: number;
  /** --header-narrow-inset: how much the bar narrows once it sits over the work. */
  narrow: number;
  /** --content-padding-mobile: the bar's inner edge padding. */
  inset: number;
  /** --portfolio-panel-padding: text's distance from a square beside it. */
  panel: number;
  /** --header-filter-slot: where the filter's label starts, after its mark. */
  slot: number;
  /** --portfolio-feed-gap, between tiles. */
  gap: number;
  /** --header-pop-duration, for the squares and mark popping in and out. */
  pop: number;
}
export const STORY_METRICS: StoryMetrics = { column: 552, control: 32, narrow: 48, inset: 12, panel: 10, slot: 27, gap: 8, pop: 280 };

/** The focused project's tile, from the storyboard (frames 14 and 15). */
export const FOCUS_SIZE = 480;
/** Where the grid comes to rest, and where the bar docks above it, from the top of the card (frames 12 and 13). */
const GRID_TOP = 32, DOCK_TOP = 24;

/** The beats, in ms from the blank first frame. */
export const AVATAR_AT = 250;
const OPEN_AT = 500;
const OFFICE_AT = 700, NAME_AT = 1000;
export const PLAYER_AT = 1600;
const SOLO_AT = 2250;
const IDLE_AT = 2800;
/** The bar lets go of the player and rises; the grid follows it up a moment later, and the bar turns into the filter. */
const LIFT_AT = 3100, RISE_MS = 1000;
export const GRID_AT = 3200;
const GRID_MS = 900;
const FILTER_AT = 3300;
/** Once the grid is under the bar, the bar narrows and turns translucent, as the site's header does over the work. */
const OVER_AT = 3700;
/** The spin: from rest, ramping up, then a long deceleration into the Rewards card. */
export const SPIN_AT = GRID_AT + GRID_MS;
const SPIN_MS = 1200;
export const LAND_AT = SPIN_AT + SPIN_MS;
/** The landed tile shrinks to its focused size and pushes its neighbours off the card. */
const FOCUS_MS = 450;
/** Every move between the bar's layouts. */
const MORPH_MS = 450;
/** Paging through the rest: each project is held for less than the last, and each page turns a little quicker. */
const DWELL_MS = 800, DWELL_RATIO = 0.7, STEP_MS = 380, STEP_RATIO = 0.82, STEP_MIN_MS = 180;
/** The last project, the first in the feed, is held longer before it slides away. */
const FINAL_DWELL_MS = 1100;
const OUT_MS = 700;
/** The office name starts glitching in this long after the last tile starts sliding away. */
const NAME_DELAY_MS = 150;

/** The spin's speed curve: a power ramp up to its peak (a higher power stays slow for longer, then takes off), and a
 * longer fall back to rest. */
const SPIN_PEAK = 0.45, SPIN_RAMP = 3, SPIN_FALL = 2.2;
const SPIN_AREA = SPIN_PEAK / (SPIN_RAMP + 1) + (1 - SPIN_PEAK) / (SPIN_FALL + 1);
/** How far through the spin, 0 to 1, at `s` of its time: its speed curve, integrated. Starts and ends at rest. */
export function spinProgress(s: number) {
  const t = Math.max(0, Math.min(1, s));
  if (t <= SPIN_PEAK) return SPIN_PEAK / (SPIN_RAMP + 1) * (t / SPIN_PEAK) ** (SPIN_RAMP + 1) / SPIN_AREA;
  const fall = (t - SPIN_PEAK) / (1 - SPIN_PEAK);
  return (SPIN_PEAK / (SPIN_RAMP + 1) + (1 - SPIN_PEAK) / (SPIN_FALL + 1) * (1 - (1 - fall) ** (SPIN_FALL + 1))) / SPIN_AREA;
}

/** Pops ease like the site's (--motion-ease); the slides accelerate, then decelerate, like the reel's. */
const popEase = (t: number) => bezier(0.16, 1, 0.3, 1, t);
/** The last tile leaves accelerating, then nearly steady, so it reads as a slide rather than a vanish. */
const leaveEase = (t: number) => bezier(0.6, 0, 0.8, 0.7, t);
const clamp = (t: number) => Math.max(0, Math.min(1, t));
const lerp = (from: number, to: number, t: number) => from + (to - from) * t;

/** When each page turn starts and how long it takes, then when the last project slides away and the name comes in. */
export function storySchedule(count: number) {
  const steps: { at: number; ms: number; dwell: number }[] = [];
  let at = LAND_AT + FOCUS_MS;
  for (let step = 0; step < count - 1; step++) {
    const dwell = DWELL_MS * DWELL_RATIO ** step, ms = Math.max(STEP_MIN_MS, STEP_MS * STEP_RATIO ** step);
    steps.push({ at: at + dwell, ms, dwell });
    at += dwell + ms;
  }
  const outAt = at + FINAL_DWELL_MS;
  return { steps, outAt, nameAt: outAt + NAME_DELAY_MS, endAt: outAt + OUT_MS };
}

export interface GridFrame {
  /** How many tiles the column has scrolled by; slot `j` shows project `j % count`. */
  pos: number;
  /** The top of the tile at `pos`, the tile size, and the distance from one tile's top to the next. */
  top: number; size: number; pitch: number;
  /** How fast the tiles are moving, px per second, for the blur and warp. */
  speed: number;
}

/** Where the column is, without its speed. */
function gridPlace(ms: number, height: number, metrics: StoryMetrics, count: number, rewards: number) {
  const { column, gap } = metrics, schedule = storySchedule(count), landed = count + rewards, focusTop = (height - FOCUS_SIZE) / 2;
  if (ms < GRID_AT || ms >= schedule.endAt) return null;
  if (ms < SPIN_AT) return { pos: 0, top: lerp(height, GRID_TOP, enterEase((ms - GRID_AT) / GRID_MS)), size: column, pitch: column + gap };
  if (ms < LAND_AT) return { pos: landed * spinProgress((ms - SPIN_AT) / SPIN_MS), top: GRID_TOP, size: column, pitch: column + gap };
  const focus = enterEase((ms - LAND_AT) / FOCUS_MS);
  // Focused tiles are a card apart, so only one shows at rest and each page brings the next in from below.
  const size = lerp(column, FOCUS_SIZE, focus), pitch = lerp(column + gap, height + gap, focus), top = lerp(GRID_TOP, focusTop, focus);
  let pos = landed;
  for (const step of schedule.steps) pos += enterEase((ms - step.at) / step.ms);
  const away = ms < schedule.outAt ? 0 : leaveEase((ms - schedule.outAt) / OUT_MS) * (height - focusTop + metrics.control);
  return { pos, top: top + away, size, pitch };
}

/** The column at `ms`, or null while it is off the card. `rewards` is the Rewards card's place in the feed. */
export function gridAt(ms: number, height: number, metrics: StoryMetrics, count: number, rewards: number): GridFrame | null {
  const place = gridPlace(ms, height, metrics, count, rewards);
  if (!place) return null;
  // The speed of the tiles themselves: the first tile's top, measured either side of this instant.
  const along = (time: number) => { const at = gridPlace(time, height, metrics, count, rewards) ?? place; return at.top - at.pos * at.pitch; };
  return { ...place, speed: Math.abs(along(ms + 1) - along(ms - 1)) / 2 * 1000 };
}

/** The tiles on the card: each one's project, and where it is. Slots before the first never show, so the grid comes
 * up from below with nothing above it. */
export function gridTiles(grid: GridFrame, count: number, width: number, height: number) {
  const tiles: { project: number; left: number; top: number }[] = [], left = (width - grid.size) / 2;
  for (let slot = Math.max(0, Math.floor(grid.pos) - 1); ; slot++) {
    const top = grid.top + (slot - grid.pos) * grid.pitch;
    if (top > height) break;
    if (top + grid.size > 0) tiles.push({ project: slot % count, left, top });
  }
  return tiles;
}

/** How much the grid warps and blurs at its speed: none at rest, as the reel's does while drifting. Like the reel's,
 * the slide in stays sharp; the blur starts with the spin. */
export const motionAt = (grid: GridFrame | null, ms: number) => grid && ms >= SPIN_AT ? speedIntensity(grid.speed) : 0;

/** The bar, in its own coordinates (x from its left edge). `shown` values run 0 (popped out) to 1. */
export interface BarFrame {
  left: number; top: number; width: number;
  avatar: number; album: number; albumX: number; brand: number; brandX: number; playing: number; mark: number;
  /** The grey fill's left edge and its gap from the right, and the text's left edge and right edge's inset. */
  fillLeft: number; fillRight: number; textLeft: number; actionRight: number;
  /** 0 is the solid fill, 1 the translucent fill used over the work. */
  over: number;
}
type BarState = Omit<BarFrame, "left" | "top">;
/** The pops ease like the site's; positions accelerate, then decelerate. */
const POPPED = new Set<keyof BarState>(["avatar", "album", "brand", "mark", "playing"]);

function barKeys({ column, control, narrow, inset, panel, slot, pop }: StoryMetrics) {
  const start: BarState & { rise: number } = {
    width: control, avatar: 0, album: 0, albumX: control, brand: 0, brandX: column - control, playing: 1, mark: 0,
    fillLeft: control, fillRight: 0, textLeft: control + panel, actionRight: inset, over: 0, rise: 0,
  };
  const keys: { at: number; ms: number; set: Partial<typeof start> }[] = [
    { at: AVATAR_AT, ms: pop, set: { avatar: 1 } },
    { at: OPEN_AT, ms: MORPH_MS, set: { width: column } },
    // The player: the album pops in beside the avatar and Spotify at the far end, the fill making room for both.
    { at: PLAYER_AT, ms: MORPH_MS, set: { album: 1, brand: 1, fillLeft: control * 2, fillRight: control, textLeft: control * 2 + panel, actionRight: control + inset } },
    // The avatar leaves and the album slides into its place; Spotify pops out at the end and back in beside it.
    { at: SOLO_AT, ms: MORPH_MS, set: { avatar: 0, albumX: 0, fillRight: 0, actionRight: inset } },
    { at: SOLO_AT, ms: pop * 0.6, set: { brand: 0 } },
    { at: SOLO_AT + pop * 0.6, ms: 1, set: { brandX: control } },
    { at: SOLO_AT + pop * 0.6, ms: pop, set: { brand: 1 } },
    { at: IDLE_AT, ms: pop, set: { playing: 0 } },
    { at: LIFT_AT, ms: MORPH_MS, set: { album: 0, brandX: 0, fillLeft: control, textLeft: control + panel, width: column - narrow / 2 } },
    { at: LIFT_AT, ms: RISE_MS, set: { rise: 1 } },
    // The filter's mark sits where its label leaves room for it, the label at the filter slot.
    { at: FILTER_AT, ms: MORPH_MS, set: { brand: 0, mark: 1, fillLeft: 0, textLeft: slot } },
    { at: OVER_AT, ms: MORPH_MS, set: { over: 1, width: column - narrow } },
    { at: LAND_AT, ms: FOCUS_MS, set: { mark: 0, textLeft: inset } },
  ];
  return { start, keys };
}

/** The bar at `ms` on a card `width` × `height`. */
export function barAt(ms: number, width: number, height: number, metrics: StoryMetrics, count: number, rewards: number): BarFrame {
  const { start, keys } = barKeys(metrics), state = { ...start };
  for (const { at, ms: length, set } of keys) {
    if (ms < at) break;
    const t = clamp((ms - at) / length);
    for (const [field, value] of Object.entries(set) as [keyof typeof state, number][]) {
      state[field] = lerp(state[field], value, POPPED.has(field as keyof BarState) ? popEase(t) : enterEase(t));
    }
  }
  const { rise, ...bar } = state;
  let left = (width - bar.width) / 2, top = lerp((height - metrics.control) / 2, DOCK_TOP, rise);
  if (ms >= LAND_AT) {
    // From docked over the grid to inset in the focused tile, riding with it as it slides away.
    const focus = enterEase((ms - LAND_AT) / FOCUS_MS), grid = gridPlace(ms, height, metrics, count, rewards);
    const focusTop = (height - FOCUS_SIZE) / 2, away = grid ? grid.top - lerp(GRID_TOP, focusTop, focus) : height;
    bar.width = lerp(bar.width, FOCUS_SIZE - metrics.inset * 2, focus);
    left = (width - bar.width) / 2;
    top = lerp(top, focusTop + metrics.inset, focus) + away;
  }
  return { ...bar, left, top };
}

/** What the bar says. `lead` is in the primary colour, `trail` after it in the secondary, then the right-hand text. */
export interface StoryCopy {
  lead: string; trail: string; trailGap: "artist" | "detail";
  action: string; actionKind: "name" | "clock" | "ago" | "label";
}
export interface StoryProject { company: string; label: string; period: string }

/** The track and how far into it the clock starts, from the storyboard (frame 7). */
const TRACK = { title: "Romance", artist: "Fontaines D.C.", seconds: 79 };
const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

export function storyCopy(ms: number, projects: StoryProject[], rewards: number): StoryCopy {
  const blank: StoryCopy = { lead: "", trail: "", trailGap: "artist", action: "", actionKind: "label" };
  if (ms < OFFICE_AT) return blank;
  if (ms < PLAYER_AT) return { ...blank, trail: "Office of", ...(ms >= NAME_AT ? { action: "Liam Fennell", actionKind: "name" } : {}) };
  if (ms < FILTER_AT) {
    const playing = ms < IDLE_AT;
    return { ...blank, lead: TRACK.title, trail: TRACK.artist, action: playing ? clock(TRACK.seconds + Math.floor((ms - PLAYER_AT) / 1000)) : "1m ago", actionKind: playing ? "clock" : "ago" };
  }
  if (ms < LAND_AT) return { ...blank, lead: "Filter", action: "Top" };
  // Each page turn swaps the bar's project halfway through.
  const turned = storySchedule(projects.length).steps.filter(step => ms >= step.at + step.ms / 2).length;
  const { company, label, period } = projects[(rewards + turned) % projects.length];
  return { lead: company, trail: label, trailGap: "detail", action: period, actionKind: "label" };
}
