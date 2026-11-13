import { bezier, enterEase, speedIntensity } from "@/lib/og-reel";

/**
 * The story video (storyboard 678:4147): a short highlight reel introducing the site with its own pieces. The avatar
 * pops in and the header bar opens into "Office of … Liam Fennell", becomes the music player and flips through three
 * songs, then becomes the work filter as it rises and the grid comes up beneath it. The grid spins like the work reel
 * (the same accelerate-then-decelerate slides, warp, and motion blur), lands on the Rewards card, and pages through a
 * few projects. The last slides away and the office name glitches in and back out to blank.
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
  /** --header-scroll-duration: the header's flip from the name to the filter, which the bar's own flip copies. */
  scroll: number;
}
export const STORY_METRICS: StoryMetrics = { column: 552, control: 32, narrow: 48, inset: 12, panel: 10, slot: 27, gap: 8, pop: 280, scroll: 360 };

/** What the grid holds: the feed's projects, where the Rewards card sits in it, and the projects paged through after
 * landing (as feed indexes, starting with the Rewards card). */
export interface StoryShape { count: number; rewards: number; cycle: number[] }

/** The focused project's tile: larger than the grid's, so landing zooms in a little and the bar's text sits small
 * against the work. */
export const FOCUS_SIZE = 600;
/** Where the grid comes to rest, and where the bar docks above it, from the top of the card (frames 12 and 13). */
const GRID_TOP = 32, DOCK_TOP = 24;

/** The beats, in ms from the blank first frame. The bar's moves are quick and land together; text changes only once
 * the bar has settled. */
export const AVATAR_AT = 250;
/** The bar opens once the avatar has finished popping, accelerating then decelerating like the reel's slides, so the
 * avatar doesn't shift while it is still scaling and the opening doesn't lurch. */
const OPEN_AT = 600, OPEN_MS = 520;
const OFFICE_AT = 1150, NAME_AT = 1350;
/** "Office of" to the player: the album slides out from under the avatar as Spotify pops in at the far end. */
export const PLAYER_AT = 2000;
/** The avatar leaves and the album slides into its place; Spotify shrinks away on the right and grows in after the
 * album, so it moves sides without crossing the text. */
const SOLO_AT = 3300;
/** Three songs: playing, played a few minutes ago, playing. */
export const SONG_ATS = [PLAYER_AT + 400, 3900, 4800];
/** The album leaves and Spotify slides into its place as the bar rises; then the bar flips to the filter on the site's
 * header flip ease (homepage.css `.is-over-images`, --header-scroll-ease): Spotify shrinks and fades away as the fill
 * and label ride its edge into place and the bar narrows to its new width, all in one motion; the fill turns
 * translucent, the dot pops in, and the text scrambles to "All". */
const LIFT_AT = 5800, RISE_MS = 900, SLIDE_AT = LIFT_AT + 200;
export const FILTER_AT = SLIDE_AT + 420;
/** The grid follows the bar up, reaching it just after it has become the filter, which turns translucent over it as
 * the site's header does over the work. */
export const GRID_AT = LIFT_AT + 100;
const GRID_MS = 1000;
/** The spin: from rest, ramping up, then a long deceleration into the Rewards card. */
export const SPIN_AT = GRID_AT + GRID_MS + 100;
const SPIN_MS = 1500;
export const LAND_AT = SPIN_AT + SPIN_MS;
/** The landed tile grows to its focused size and pushes its neighbours off the card; the bar's text changes after. */
const FOCUS_MS = 500;
export const FOCUSED_AT = LAND_AT + FOCUS_MS;
/** The bar's moves, on the site's own ease (--motion-ease). */
const MOVE_MS = 380;
/** Paging: each project is held a little less than the one before, and the last a little longer before it leaves. */
const DWELLS_MS = [900, 700, 600], STEP_MS = 450, STEP_RATIO = 0.94, FINAL_DWELL_MS = 1000;
const OUT_MS = 700;

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

/** The site's ease (--motion-ease): quick off the mark, settling softly. Pops and the bar's moves both use it. */
const motionEase = (t: number) => bezier(0.16, 1, 0.3, 1, t);
/** The header's flip ease (--header-scroll-ease). */
const scrollEase = (t: number) => bezier(0.4, 0, 0.2, 1, t);
/** The last tile leaves accelerating, then nearly steady, so it reads as a slide rather than a vanish. */
const leaveEase = (t: number) => bezier(0.6, 0, 0.8, 0.7, t);
const clamp = (t: number) => Math.max(0, Math.min(1, t));
const lerp = (from: number, to: number, t: number) => from + (to - from) * t;

/** When each page turn starts and how long it takes, then when the last project slides away and is gone. */
export function storySchedule(cycle: number) {
  const steps: { at: number; ms: number; dwell: number }[] = [];
  let at = FOCUSED_AT;
  for (let step = 0; step < cycle - 1; step++) {
    const dwell = DWELLS_MS[Math.min(step, DWELLS_MS.length - 1)], ms = STEP_MS * STEP_RATIO ** step;
    steps.push({ at: at + dwell, ms, dwell });
    at += dwell + ms;
  }
  const outAt = at + FINAL_DWELL_MS;
  return { steps, outAt, endAt: outAt + OUT_MS };
}

export interface GridFrame {
  /** How many tiles the column has scrolled by; `slotProject` says which project each slot shows. */
  pos: number;
  /** The top of the tile at `pos`, the tile size, and the distance from one tile's top to the next. */
  top: number; size: number; pitch: number;
  /** How fast the tiles are moving, px per second, for the blur and warp. */
  speed: number;
}

/** The project in a slot of the column: the feed in order, wrapping round, until the slot the spin lands on; from there
 * the projects paged through. */
export function slotProject(slot: number, { count, rewards, cycle }: StoryShape) {
  const landed = count + rewards;
  return slot < landed ? slot % count : cycle[(slot - landed) % cycle.length];
}

/** Where the column is, without its speed. */
function gridPlace(ms: number, height: number, metrics: StoryMetrics, shape: StoryShape) {
  const { column, gap } = metrics, schedule = storySchedule(shape.cycle.length), landed = shape.count + shape.rewards;
  const focusTop = (height - FOCUS_SIZE) / 2;
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

/** The column at `ms`, or null while it is off the card. */
export function gridAt(ms: number, height: number, metrics: StoryMetrics, shape: StoryShape): GridFrame | null {
  const place = gridPlace(ms, height, metrics, shape);
  if (!place) return null;
  // The speed of the tiles themselves: the first tile's top, measured either side of this instant.
  const along = (time: number) => { const at = gridPlace(time, height, metrics, shape) ?? place; return at.top - at.pos * at.pitch; };
  return { ...place, speed: Math.abs(along(ms + 1) - along(ms - 1)) / 2 * 1000 };
}

/** The tiles on the card: each one's project, and where it is. Only the tile at `pos` and those after it show (the
 * ones before have scrolled off the top), so the grid comes up from below with nothing above it, and the last tile
 * slides away with nothing following it down. */
export function gridTiles(grid: GridFrame, shape: StoryShape, width: number, height: number) {
  const tiles: { project: number; left: number; top: number }[] = [], left = (width - grid.size) / 2;
  // A page's ease ends a hair short of a whole tile, so `pos` is rounded before it picks the first slot.
  for (let slot = Math.floor(grid.pos + 1e-6); ; slot++) {
    const top = grid.top + (slot - grid.pos) * grid.pitch;
    if (top > height) break;
    if (top + grid.size > 0) tiles.push({ project: slotProject(slot, shape), left, top });
  }
  return tiles;
}

/** How much the grid warps and blurs at its speed: none at rest, as the reel's does while drifting. Like the reel's,
 * the slide in stays sharp; the blur starts with the spin. */
export const motionAt = (grid: GridFrame | null, ms: number) => grid && ms >= SPIN_AT ? speedIntensity(grid.speed) : 0;

/**
 * The bar, in its own coordinates (x from its left edge). Its layers sit in a fixed order, back to front: the grey fill,
 * the text and the filter's dot, Spotify, the album, then the avatar, as the site's header stacks its avatar above its
 * label. The fill's edges and the text are worked out from
 * the squares beside them, so they always move together.
 *
 * Spotify is two blocks: one at the far right end, one after the album. Each is as wide as `brandRight` or `brandLeft`
 * (0 to the square's size), so moving sides is the right one shrinking as the left one grows. `brand` pops the right
 * block in; at the flip to the filter the left one narrows to nothing as `brandLeftPop` fades and shrinks it.
 */
export interface BarFrame {
  left: number; top: number; width: number;
  /** Pops, 0 (out) to 1: the avatar, the album, the Spotify blocks (right, then left, which fades on the flip's ease)
   * and the filter's dot. */
  avatar: number; album: number; brand: number; brandLeftPop: number; mark: number;
  /** Whether the album is there at all (it waits under the avatar until the player comes in). */
  albumIn: number; albumX: number;
  brandLeft: number; brandLeftX: number; brandRight: number;
  /** 1 green (playing), 0 grey. */
  playing: number;
  /** The grey fill's left edge and its gap from the right, and the text's left edge and right edge's inset. */
  fillLeft: number; fillRight: number; textLeft: number; actionRight: number;
  /** 0 is the solid fill, 1 the translucent fill used over the work. */
  over: number;
}
interface BarState {
  width: number; rise: number; over: number;
  avatar: number; lead: number; album: number; albumIn: number; albumX: number;
  brand: number; brandRight: number; brandLeft: number; brandLeftX: number; brandLeftPop: number; playing: number; mark: number;
  /** How far the text sits from the fill's left edge: the panel padding beside a square, the filter slot, or the
   * content padding in a focused tile. */
  textPad: number;
}
type Key = { at: number; ms: number; ease: (t: number) => number; set: Partial<BarState> };
const cut = () => 1;

function barKeys({ column, control, narrow, inset, panel, slot, pop, scroll }: StoryMetrics) {
  const start: BarState = {
    width: control, rise: 0, over: 0, avatar: 0, lead: control, album: 1, albumIn: 0, albumX: 0,
    brand: 0, brandRight: 0, brandLeft: 0, brandLeftX: control * 2, brandLeftPop: 1, playing: 1, mark: 0, textPad: panel,
  };
  const flip = (at: number, set: Partial<BarState>): Key => ({ at, ms: scroll, ease: scrollEase, set });
  const move = (at: number, set: Partial<BarState>, ms = MOVE_MS): Key => ({ at, ms, ease: motionEase, set });
  const keys: Key[] = [
    { at: AVATAR_AT, ms: pop, ease: motionEase, set: { avatar: 1 } },
    { at: OPEN_AT, ms: OPEN_MS, ease: enterEase, set: { width: column } },
    // The player: the album slides out from under the avatar, the fill and text moving with it, as Spotify pops in at
    // the far end and the fill's right end makes room for it.
    { at: PLAYER_AT, ms: 1, ease: cut, set: { albumIn: 1 } },
    move(PLAYER_AT, { albumX: control, brandRight: control }),
    { at: PLAYER_AT, ms: pop, ease: motionEase, set: { brand: 1 } },
    // The avatar pops out over the album sliding into its place; Spotify shrinks away on the right and grows in after
    // the album, its left edge riding the album's right edge, so the text stays put.
    { at: SOLO_AT, ms: pop, ease: motionEase, set: { avatar: 0 } },
    move(SOLO_AT, { lead: 0, albumX: 0, brandLeftX: control, brandLeft: control, brandRight: 0 }),
    { at: SONG_ATS[1], ms: pop, ease: motionEase, set: { playing: 0 } },
    { at: SONG_ATS[2], ms: pop, ease: motionEase, set: { playing: 1 } },
    // The album pops out and the bar rises; Spotify slides into the album's place.
    { at: LIFT_AT, ms: pop, ease: motionEase, set: { album: 0 } },
    { at: LIFT_AT, ms: RISE_MS, ease: enterEase, set: { rise: 1 } },
    { at: LIFT_AT + pop, ms: 1, ease: cut, set: { albumIn: 0 } },
    move(SLIDE_AT, { brandLeftX: 0 }),
    // The flip to the filter, in one motion: Spotify narrows and fades as the fill and label follow its edge and the
    // bar narrows to its width over the work, as the header's does once the page scrolls.
    flip(FILTER_AT, { brandLeft: 0, brandLeftPop: 0, textPad: slot, over: 1, width: column - narrow }),
    { at: FILTER_AT, ms: pop, ease: motionEase, set: { mark: 1 } },
    // Into the focused tile: the mark pops out as the text moves into its place.
    { at: LAND_AT, ms: pop, ease: motionEase, set: { mark: 0 } },
    move(LAND_AT + pop * 0.5, { textPad: inset }),
  ];
  return { start, keys };
}

/** The bar at `ms` on a card `width` × `height`. */
export function barAt(ms: number, width: number, height: number, metrics: StoryMetrics, shape: StoryShape): BarFrame {
  const { start, keys } = barKeys(metrics), state = { ...start };
  for (const { at, ms: length, ease, set } of keys) {
    if (ms < at) break;
    const t = ease(clamp((ms - at) / length));
    for (const [field, value] of Object.entries(set) as [keyof BarState, number][]) state[field] = lerp(state[field], value, t);
  }
  const { control, inset } = metrics, { rise, lead, textPad, ...bar } = state;
  // The fill starts after whichever square reaches furthest: the avatar's slot, the album, or Spotify after it.
  const fillLeft = Math.max(lead, state.albumIn ? state.albumX + control : 0, state.brandLeft > 0 ? state.brandLeftX + state.brandLeft : 0);
  const frame = { ...bar, fillLeft, fillRight: state.brandRight, textLeft: fillLeft + textPad, actionRight: state.brandRight + inset };
  let left = (width - bar.width) / 2, top = lerp((height - control) / 2, DOCK_TOP, rise);
  if (ms >= LAND_AT) {
    // From docked over the grid to inset in the focused tile, riding with it as it slides away.
    const focus = enterEase((ms - LAND_AT) / FOCUS_MS), grid = gridPlace(ms, height, metrics, shape);
    const focusTop = (height - FOCUS_SIZE) / 2, away = grid ? grid.top - lerp(GRID_TOP, focusTop, focus) : height;
    frame.width = lerp(frame.width, FOCUS_SIZE - inset * 2, focus);
    left = (width - frame.width) / 2;
    top = lerp(top, focusTop + inset, focus) + away;
  }
  return { ...frame, left, top };
}

/** What the bar says. `lead` is in the primary colour, `trail` after it in the secondary, then the right-hand text. */
export interface StoryCopy {
  lead: string; trail: string; trailGap: "artist" | "detail";
  action: string; actionKind: "name" | "clock" | "ago" | "label";
  /** The clock's ticks change in place, as the site's player clock does, without the scramble. */
  tick?: true;
}
export interface StoryProject { company: string; label: string; period: string }

/** Three of Liam's recent songs: where the clock starts if playing, or how long ago it played. Their art is saved in
 * public/images/meta as og-story-album-1 to 3. */
export const SONGS: { title: string; artist: string; seconds?: number; ago?: string }[] = [
  { title: "Childhood", artist: "Beach House", seconds: 84 },
  { title: "Everything", artist: "Found Space", ago: "4m ago" },
  { title: "Ten Long Years", artist: "LL Burns", seconds: 127 },
];
const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

/** Which song is up at `ms`, or -1 before the player. */
export const songAt = (ms: number) => SONG_ATS.filter(at => ms >= at).length - 1;

export function storyCopy(ms: number, projects: StoryProject[], shape: StoryShape): StoryCopy {
  const blank: StoryCopy = { lead: "", trail: "", trailGap: "artist", action: "", actionKind: "label" };
  if (ms < OFFICE_AT) return blank;
  if (ms < SONG_ATS[0]) return { ...blank, trail: "Office of", ...(ms >= NAME_AT ? { action: "Liam Fennell", actionKind: "name" } : {}) };
  if (ms < FILTER_AT) {
    const index = songAt(ms), song = SONGS[index], words = { ...blank, lead: song.title, trail: song.artist };
    if (song.seconds === undefined) return { ...words, action: song.ago ?? "", actionKind: "ago" };
    const seconds = Math.floor((ms - SONG_ATS[index]) / 1000);
    return { ...words, action: clock(song.seconds + seconds), actionKind: "clock", ...(seconds > 0 ? { tick: true as const } : {}) };
  }
  if (ms < FOCUSED_AT) return { ...blank, lead: "All", action: "Top" };
  // Each page turn swaps the bar's project halfway through.
  const turned = storySchedule(shape.cycle.length).steps.filter(step => ms >= step.at + step.ms / 2).length;
  const { company, label, period } = projects[shape.cycle[Math.min(turned, shape.cycle.length - 1)]];
  return { lead: company, trail: label, trailGap: "detail", action: period, actionKind: "label" };
}

/**
 * The album's art swap between songs, like the site's player (album-artwork.tsx): the next cover appears over the
 * last in irregular clusters on an 8 × 8 grid. Returns which cover is underneath, which is coming in, and how many of
 * its cells show, in `ALBUM_CELL_ORDER`'s order.
 */
export const ALBUM_GRID = 8;
const SWAP_MS = 300;
/** Cells in the order they reveal: nearest one of three fixed seeds first, with a little jitter, so the reveal is the
 * same every run. */
export const ALBUM_CELL_ORDER = (() => {
  const seeds = [{ x: 1.5, y: 5.5 }, { x: 6, y: 1 }, { x: 4.5, y: 4 }];
  const jitter = (index: number) => ((Math.sin(index * 12.9898) * 43758.5453) % 1 + 1) % 1;
  return Array.from({ length: ALBUM_GRID ** 2 }, (_, index) => {
    const x = index % ALBUM_GRID, y = Math.floor(index / ALBUM_GRID);
    return { index, rank: Math.min(...seeds.map(seed => Math.hypot(x - seed.x, y - seed.y))) + jitter(index) * 1.5 };
  }).sort((a, b) => a.rank - b.rank).map(cell => cell.index);
})();
export function albumAt(ms: number) {
  const song = Math.max(0, songAt(ms));
  if (song === 0) return { under: 0, over: 0, shown: 0 };
  return { under: song - 1, over: song, shown: Math.round(clamp((ms - SONG_ATS[song]) / SWAP_MS) * ALBUM_GRID ** 2) };
}
