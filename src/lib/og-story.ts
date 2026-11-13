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

/** The beats, in ms from the blank first frame. Each move in the bar finishes before the next starts, text changes
 * only once the bar has settled, and every state is held long enough to read. */
export const AVATAR_AT = 300;
const OPEN_AT = 800, OPEN_MS = 900;
const OFFICE_AT = 1800, NAME_AT = 2050;
/** "Office of" to the player: the album slides out from under the avatar as the fill's right end draws back off
 * Spotify, then the text changes. */
export const PLAYER_AT = 3000;
export const TRACK_AT = PLAYER_AT + 900;
/** The avatar leaves and the album slides into its place as the fill's right end covers Spotify; hidden there,
 * Spotify moves beside the album, and the fill's left edge draws back to reveal it. */
const SOLO_AT = 4900, REVEAL_AT = SOLO_AT + 900, REVEAL_MS = 600;
const IDLE_AT = 6800, IDLE_MS = 600;
/** The album leaves and Spotify slides into its place as the bar rises to the top. */
const LIFT_AT = 7500, SLIDE_AT = LIFT_AT + 300, RISE_MS = 1600;
/** The fill's left edge covers Spotify, then the filter's mark and label come in. */
const COVER_AT = SLIDE_AT + 800, COVER_MS = 600;
export const FILTER_AT = COVER_AT + COVER_MS;
/** Only once the bar is the filter does the grid come up beneath it, the bar narrowing and turning translucent as the
 * work passes under it, as the site's header does. */
const GRID_MS = 1300;
export const GRID_AT = FILTER_AT + 500 - GRID_MS;
const OVER_AT = FILTER_AT + 100, OVER_MS = 800;
/** The spin: from rest, ramping up, then a long deceleration into the Rewards card. */
export const SPIN_AT = GRID_AT + GRID_MS + 400;
const SPIN_MS = 2200;
export const LAND_AT = SPIN_AT + SPIN_MS;
/** The landed tile glides to its focused size and pushes its neighbours off the card; the bar's text changes after. */
const FOCUS_MS = 800;
export const FOCUSED_AT = LAND_AT + FOCUS_MS;
/** Every move between the bar's layouts, and how long its squares and mark take to pop (twice the site's pop). */
const GLIDE_MS = 900;
const POP_SCALE = 2;
/** Paging through the rest: each project is held for less than the last, down to a floor, and each page turns a
 * little quicker. */
const DWELL_MS = 1000, DWELL_RATIO = 0.75, DWELL_MIN_MS = 240, STEP_MS = 560, STEP_RATIO = 0.88, STEP_MIN_MS = 340;
/** The last project, the first in the feed, is held longer before it slides away. */
const FINAL_DWELL_MS = 1800;
const OUT_MS = 1100;

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

/** Pops ease like the site's (--motion-ease). Moves accelerate gently, then glide a long way into place. */
const popEase = (t: number) => bezier(0.16, 1, 0.3, 1, t);
const glide = (t: number) => bezier(0.5, 0, 0.15, 1, t);
/** The last tile leaves accelerating, then nearly steady, so it reads as a slide rather than a vanish. */
const leaveEase = (t: number) => bezier(0.6, 0, 0.8, 0.7, t);
const clamp = (t: number) => Math.max(0, Math.min(1, t));
const lerp = (from: number, to: number, t: number) => from + (to - from) * t;

/** When each page turn starts and how long it takes, then when the last project slides away and is gone. */
export function storySchedule(count: number) {
  const steps: { at: number; ms: number; dwell: number }[] = [];
  let at = FOCUSED_AT;
  for (let step = 0; step < count - 1; step++) {
    const dwell = Math.max(DWELL_MIN_MS, DWELL_MS * DWELL_RATIO ** step), ms = Math.max(STEP_MIN_MS, STEP_MS * STEP_RATIO ** step);
    steps.push({ at: at + dwell, ms, dwell });
    at += dwell + ms;
  }
  const outAt = at + FINAL_DWELL_MS;
  return { steps, outAt, endAt: outAt + OUT_MS };
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
  const focus = glide((ms - LAND_AT) / FOCUS_MS);
  // Focused tiles are a card apart, so only one shows at rest and each page brings the next in from below.
  const size = lerp(column, FOCUS_SIZE, focus), pitch = lerp(column + gap, height + gap, focus), top = lerp(GRID_TOP, focusTop, focus);
  let pos = landed;
  for (const step of schedule.steps) pos += glide((ms - step.at) / step.ms);
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

/** The tiles on the card: each one's project, and where it is. Only the tile at `pos` and those after it show (the
 * ones before have scrolled off the top), so the grid comes up from below with nothing above it, and the last tile
 * slides away with nothing following it down. */
export function gridTiles(grid: GridFrame, count: number, width: number, height: number) {
  const tiles: { project: number; left: number; top: number }[] = [], left = (width - grid.size) / 2;
  // A page's glide ends a hair short of a whole tile, so `pos` is rounded before it picks the first slot.
  for (let slot = Math.floor(grid.pos + 1e-6); ; slot++) {
    const top = grid.top + (slot - grid.pos) * grid.pitch;
    if (top > height) break;
    if (top + grid.size > 0) tiles.push({ project: slot % count, left, top });
  }
  return tiles;
}

/** How much the grid warps and blurs at its speed: none at rest, as the reel's does while drifting. Like the reel's,
 * the slide in stays sharp; the blur starts with the spin. */
export const motionAt = (grid: GridFrame | null, ms: number) => grid && ms >= SPIN_AT ? speedIntensity(grid.speed) : 0;

/**
 * The bar, in its own coordinates (x from its left edge). Its layers sit in a fixed order, back to front: Spotify, the
 * grey fill, the album, the avatar, then the text and the filter's mark. So Spotify is shown and hidden by the fill's
 * edges wiping over it, and the album slides out from under the avatar, rather than anything popping on top of the text.
 * `avatar`, `album` and `mark` are pops, 0 (out) to 1; `brand` is Spotify's opacity, only cut while it is covered.
 */
export interface BarFrame {
  left: number; top: number; width: number;
  avatar: number; album: number; albumX: number; brand: number; brandX: number; playing: number; mark: number;
  /** The grey fill's left edge and its gap from the right, and the text's left edge and right edge's inset. */
  fillLeft: number; fillRight: number; textLeft: number; actionRight: number;
  /** 0 is the solid fill, 1 the translucent fill used over the work. */
  over: number;
}
type BarState = Omit<BarFrame, "left" | "top"> & { rise: number };
type Key = { at: number; ms: number; ease: (t: number) => number; set: Partial<BarState> };
const cut = () => 1;

function barKeys({ column, control, narrow, inset, panel, slot, pop }: StoryMetrics) {
  const popMs = pop * POP_SCALE;
  const start: BarState = {
    width: control, avatar: 0, album: 0, albumX: 0, brand: 1, brandX: column - control, playing: 1, mark: 0,
    fillLeft: control, fillRight: 0, textLeft: control + panel, actionRight: inset, over: 0, rise: 0,
  };
  const keys: Key[] = [
    { at: AVATAR_AT, ms: popMs, ease: popEase, set: { avatar: 1 } },
    // The album waits under the avatar, Spotify under the far end of the fill.
    { at: AVATAR_AT + popMs, ms: 1, ease: cut, set: { album: 1 } },
    { at: OPEN_AT, ms: OPEN_MS, ease: glide, set: { width: column } },
    // The player: the album slides out from under the avatar, pushing the fill's left edge and the text along, as the
    // fill's right end draws back to reveal Spotify. The text keeps its words until the bar has settled.
    { at: PLAYER_AT, ms: GLIDE_MS, ease: glide, set: { albumX: control, fillLeft: control * 2, textLeft: control * 2 + panel, fillRight: control, actionRight: control + inset } },
    // The avatar pops out over the album, which slides into its place; the fill follows the album's edge on the left and
    // covers Spotify on the right, the text staying where it is.
    { at: SOLO_AT, ms: popMs, ease: popEase, set: { avatar: 0 } },
    { at: SOLO_AT, ms: GLIDE_MS, ease: glide, set: { albumX: 0, fillLeft: control, fillRight: 0, actionRight: inset } },
    // Covered, Spotify moves beside the album, and the fill's left edge draws back to show it.
    { at: REVEAL_AT - 1, ms: 1, ease: cut, set: { brandX: control } },
    { at: REVEAL_AT, ms: REVEAL_MS, ease: glide, set: { fillLeft: control * 2 } },
    { at: IDLE_AT, ms: IDLE_MS, ease: glide, set: { playing: 0 } },
    // The album pops out; Spotify slides into its place with the fill and text following, and the bar narrows.
    { at: LIFT_AT, ms: popMs, ease: popEase, set: { album: 0 } },
    { at: LIFT_AT, ms: RISE_MS, ease: enterEase, set: { rise: 1 } },
    { at: SLIDE_AT, ms: GLIDE_MS * 0.9, ease: glide, set: { brandX: 0, fillLeft: control, textLeft: control + panel, width: column - narrow / 2 } },
    // The fill's left edge covers Spotify, the text moving to the filter's slot; then the mark pops in before it.
    { at: COVER_AT, ms: COVER_MS, ease: glide, set: { fillLeft: 0, textLeft: slot } },
    { at: FILTER_AT, ms: 1, ease: cut, set: { brand: 0 } },
    { at: FILTER_AT, ms: popMs, ease: popEase, set: { mark: 1 } },
    { at: OVER_AT, ms: OVER_MS, ease: glide, set: { over: 1, width: column - narrow } },
    // Into the focused tile: the mark pops out, then the text moves into its place.
    { at: LAND_AT, ms: popMs, ease: popEase, set: { mark: 0 } },
    { at: LAND_AT + popMs * 0.6, ms: FOCUS_MS - popMs * 0.6, ease: glide, set: { textLeft: inset } },
  ];
  return { start, keys };
}

/** The bar at `ms` on a card `width` × `height`. */
export function barAt(ms: number, width: number, height: number, metrics: StoryMetrics, count: number, rewards: number): BarFrame {
  const { start, keys } = barKeys(metrics), state = { ...start };
  for (const { at, ms: length, ease, set } of keys) {
    if (ms < at) break;
    const t = ease(clamp((ms - at) / length));
    for (const [field, value] of Object.entries(set) as [keyof BarState, number][]) state[field] = lerp(state[field], value, t);
  }
  const { rise, ...bar } = state;
  let left = (width - bar.width) / 2, top = lerp((height - metrics.control) / 2, DOCK_TOP, rise);
  if (ms >= LAND_AT) {
    // From docked over the grid to inset in the focused tile, riding with it as it slides away.
    const focus = glide((ms - LAND_AT) / FOCUS_MS), grid = gridPlace(ms, height, metrics, count, rewards);
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
  /** The clock's ticks change in place, as the site's player clock does, without the scramble. */
  tick?: true;
}
export interface StoryProject { company: string; label: string; period: string }

/** The track and how far into it the clock starts, from the storyboard (frame 7). */
const TRACK = { title: "Romance", artist: "Fontaines D.C.", seconds: 79 };
const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

export function storyCopy(ms: number, projects: StoryProject[], rewards: number): StoryCopy {
  const blank: StoryCopy = { lead: "", trail: "", trailGap: "artist", action: "", actionKind: "label" };
  if (ms < OFFICE_AT) return blank;
  if (ms < TRACK_AT) return { ...blank, trail: "Office of", ...(ms >= NAME_AT ? { action: "Liam Fennell", actionKind: "name" } : {}) };
  if (ms < FILTER_AT) {
    const playing = ms < IDLE_AT;
    const seconds = Math.floor((ms - TRACK_AT) / 1000);
    if (!playing) return { ...blank, lead: TRACK.title, trail: TRACK.artist, action: "1m ago", actionKind: "ago" };
    return { ...blank, lead: TRACK.title, trail: TRACK.artist, action: clock(TRACK.seconds + seconds), actionKind: "clock", ...(seconds > 0 ? { tick: true as const } : {}) };
  }
  if (ms < FOCUSED_AT) return { ...blank, lead: "Filter", action: "Top" };
  // Each page turn swaps the bar's project halfway through.
  const turned = storySchedule(projects.length).steps.filter(step => ms >= step.at + step.ms / 2).length;
  const { company, label, period } = projects[(rewards + turned) % projects.length];
  return { lead: company, trail: label, trailGap: "detail", action: period, actionKind: "label" };
}
