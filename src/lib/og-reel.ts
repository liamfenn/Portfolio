import { smoothstep } from "@/lib/glyph-physics";

/**
 * The work reel's interlude (storyboard 442:1405): while the office name is off the card, the work grid slides up from
 * below, drifts, then scrolls ever faster, smearing with motion blur, and flies off the top. It carries exactly the
 * twelve projects (six rows of two on a wide card, twelve on a tall one), wrapping round rather than showing more.
 * Near the top and bottom edges the grid bends slightly inward, a soft warp rather than a perspective tilt.
 * Placeholder blocks for now.
 */

export const PROJECTS = 12;
/** Slides in from below, drifts, ramps up from about midway, then flies off the top. */
export const ENTER_MS = 900;
export const SPIN_MS = 3600;
export const LEAVE_MS = 500;
export const REEL_MS = ENTER_MS + SPIN_MS + LEAVE_MS;
/** The drift, and the speed the ramp builds to by the end, in px per second. */
const DRIFT_SPEED = 70;
const TOP_SPEED = 5500;
/** The ramp's curve: a higher power stays slow for longer, then takes off. */
const RAMP_POWER = 3;
/** How far the warp draws the corners in, as a share of the card's width. */
const WARP = 0.04;

/** A cubic Bézier ease, as CSS's cubic-bezier(x1, y1, x2, y2): solves for the curve's x, returns its y. */
export function bezier(x1: number, y1: number, x2: number, y2: number, t: number) {
  const x = Math.max(0, Math.min(1, t));
  const at = (a: number, b: number, s: number) => 3 * a * s * (1 - s) ** 2 + 3 * b * s * s * (1 - s) + s ** 3;
  let low = 0, high = 1, s = x;
  for (let i = 0; i < 30; i++) { s = (low + high) / 2; if (at(x1, x2, s) < x) low = s; else high = s; }
  return at(y1, y2, s);
}
/** The slide in: accelerates, then decelerates into place. 0 → 1. */
export const enterEase = (t: number) => bezier(0.65, 0, 0.35, 1, t);
/** The way out: the reverse half, accelerating away. 0 → 1. */
export const leaveEase = (t: number) => bezier(0.55, 0, 1, 0.45, t);

/** How far the grid has scrolled, in px, `ms` after it has slid in. */
export function scrollOffset(ms: number) {
  const t = Math.max(0, ms) / 1000, total = SPIN_MS / 1000;
  return DRIFT_SPEED * t + TOP_SPEED * total / (RAMP_POWER + 1) * Math.pow(t / total, RAMP_POWER + 1);
}
/** Its speed then, in px per second. */
export function scrollSpeed(ms: number) {
  const t = Math.max(0, ms) / SPIN_MS;
  return DRIFT_SPEED + TOP_SPEED * Math.pow(t, RAMP_POWER);
}
/** How strongly the scroll blurs at a speed: none while drifting, fully by 1,500 px/s. */
export function speedIntensity(speed: number) {
  return smoothstep((speed - DRIFT_SPEED) / 1500);
}

export interface ReelLayout { columns: number; rows: number; size: number; gap: number }
/** Two columns of the storyboard's 469px blocks on a wide card; one column with 60px side margins on a tall one. */
export function reelLayout(width: number, height: number): ReelLayout {
  return width >= height ? { columns: 2, rows: PROJECTS / 2, size: 469.33, gap: 8 } : { columns: 1, rows: PROJECTS, size: width - 120, gap: 8 };
}
/**
 * Where a row's top sits, scrolled by `offset`, the gap the same down as across. The rows start stacked below the
 * first, and one that has scrolled fully off the top comes round again below the last, so only the twelve are shown.
 */
export function rowTop(row: number, offset: number, layout: ReelLayout, firstTop: number) {
  const pitch = layout.size + layout.gap, around = layout.rows * pitch, gone = -(firstTop + pitch);
  let along = row * pitch - offset;
  if (along < gone) along += around * Math.ceil((gone - along) / around);
  return firstTop + along;
}
/**
 * The warp, for a point at (u, v) across the card (each -1 to 1): how far to draw it toward the middle, as a share
 * of the card's half-width and half-height. One smooth curve over the whole height, nothing at the middle and growing
 * toward the top and bottom, and more toward the sides, so the grid's sides bow in a rounded arc rather than bending
 * at a corner.
 */
export function warpAt(u: number, v: number) {
  const edge = v * v;
  return { x: u * edge * WARP * 2, y: v * edge * WARP * 0.6 };
}

/** A displacement map for the warp, as a PNG data URL, for SVG's feDisplacementMap with this `scale`. */
function warpMap(width: number, height: number, scale: number) {
  const canvas = document.createElement("canvas"), w = Math.round(width / 4), h = Math.round(height / 4);
  canvas.width = w; canvas.height = h;
  const ink = canvas.getContext("2d")!, image = ink.createImageData(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const u = (x + 0.5) / w * 2 - 1, v = (y + 0.5) / h * 2 - 1, { x: dx, y: dy } = warpAt(u, v), at = (y * w + x) * 4;
    // A point samples from further out, so the picture is drawn in toward the middle.
    image.data[at] = Math.round(255 * (0.5 + dx * width / 2 / scale));
    image.data[at + 1] = Math.round(255 * (0.5 + dy * height / 2 / scale));
    image.data[at + 3] = 255;
  }
  ink.putImageData(image, 0, 0);
  return canvas.toDataURL("image/png");
}

const nextFrame = () => new Promise<number>(resolve => requestAnimationFrame(resolve));

/** Plays the interlude in `stage` (which fills the card), resolving once the grid has flown off. */
export async function playReel(stage: HTMLElement, signal: AbortSignal) {
  const width = stage.clientWidth, height = stage.clientHeight, layout = reelLayout(width, height), { columns, rows, size, gap } = layout;
  const rowWidth = columns * size + (columns - 1) * gap, firstTop = (height - size) / 2, scale = width * WARP * 4;
  const grid = document.createElement("div"), filterId = "og-reel-filter";
  grid.className = "og-reel-grid";
  // The warp, then a vertical-only blur (which CSS's own blur() can't do), in the grid's own px.
  stage.insertAdjacentHTML("beforeend", `<svg class="og-reel-filters" aria-hidden="true">
    <filter id="${filterId}" filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" x="0" y="0" width="${width}" height="${height}" color-interpolation-filters="sRGB">
      <feImage href="${warpMap(width, height, scale)}" x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="none" result="map"/>
      <feDisplacementMap in="SourceGraphic" in2="map" scale="${scale}" xChannelSelector="R" yChannelSelector="G" result="warped"/>
      <feGaussianBlur in="warped" stdDeviation="0 0"/>
    </filter></svg>`);
  const blur = stage.querySelector("feGaussianBlur")!;
  const elements = Array.from({ length: rows }, () => {
    const element = document.createElement("div");
    element.className = "og-reel-row";
    // Placed below the card from the start, so nothing shows before the first frame moves it.
    element.style.cssText = `left:${(width - rowWidth) / 2}px;width:${rowWidth}px;height:${size}px;gap:${gap}px;transform:translateY(${height}px);visibility:hidden`;
    for (let column = 0; column < columns; column++) {
      const block = document.createElement("div");
      block.className = "og-reel-block";
      block.style.width = `${size}px`;
      element.append(block);
    }
    grid.append(element);
    return element;
  });
  grid.style.filter = `url(#${filterId})`;
  stage.append(grid);
  try {
    const start = await nextFrame();
    // At the fly-off the rows stop coming round: those on the card carry on up and out, and the rest stay below.
    let frozen: number[] | null = null, previousTops: number[] = [];
    for (let time = start, previous = start; ; previous = time, time = await nextFrame()) {
      signal.throwIfAborted();
      const ms = time - start, spinning = ms - ENTER_MS, leaving = (spinning - SPIN_MS) / LEAVE_MS;
      // Sliding in from just below the card, accelerating then settling, before the scroll takes over.
      const enter = (1 - enterEase(ms / ENTER_MS)) * (height - firstTop), offset = scrollOffset(Math.min(spinning, SPIN_MS));
      if (leaving > 0 && !frozen) frozen = elements.map((_, row) => rowTop(row, offset, layout, firstTop));
      const leave = leaving > 0 ? leaveEase(leaving) * (height + size) : 0;
      const tops = elements.map((_, row) => frozen ? frozen[row] - leave - scrollOffset(spinning) + offset : rowTop(row, offset, layout, firstTop) + enter);
      // The blur follows how fast the rows are actually moving, whichever part of the move this is.
      const moved = previousTops.length ? Math.abs(tops[0] - previousTops[0]) / Math.max(1, time - previous) * 1000 : 0;
      const speed = moved > 2 * height ? scrollSpeed(spinning) : moved, intensity = spinning > 0 ? speedIntensity(speed) : 0;
      blur.setAttribute("stdDeviation", `0 ${(Math.min(36, speed / 60 * 0.4) * intensity).toFixed(2)}`);
      elements.forEach((element, row) => {
        const top = tops[row], below = frozen !== null && frozen[row] > height;
        element.style.visibility = below || top > height + 40 || top + size < -40 ? "hidden" : "";
        element.style.transform = `translateY(${top}px)`;
      });
      previousTops = tops;
      if (leaving >= 1) break;
    }
  } finally {
    grid.remove(); stage.querySelector(".og-reel-filters")?.remove();
  }
}
