import { smoothstep } from "@/lib/glyph-physics";

/**
 * The work reel's interlude (storyboard 442:1405): while the office name is off the card, work blocks pop in, start to
 * slide up, and scroll ever faster, the rows bending away at the top and bottom like a drum and smearing with motion
 * blur, until the whole grid is sucked into the centre of the card. Placeholder blocks for now; they become videos.
 */

/** When the first row has popped in and the grid starts to slide up, and how long it scrolls before collapsing. */
export const SCROLL_AT_MS = 450;
export const SCROLL_MS = 3400;
export const COLLAPSE_MS = 700;
export const REEL_MS = SCROLL_AT_MS + SCROLL_MS + COLLAPSE_MS;
/** The scroll starts at a crawl and speeds up exponentially, with no pause on any row. */
const START_SPEED = 60;
const SPEED_UP_MS = 750;
/** Pop-ins: each block springs up from this size, and a row's blocks pop this far apart. */
const POP_FROM = 0.6;
const POP_STAGGER_MS = 70;
/** At full speed, a row at the top or bottom edge tips this far and sinks this far back. */
const DRUM_TIP_DEG = 24;
const DRUM_SINK_PX = 220;

/** How far the grid has scrolled, in px, `ms` after it starts moving. */
export function scrollOffset(ms: number) {
  if (ms <= 0) return 0;
  return START_SPEED * (SPEED_UP_MS / 1000) * (Math.exp(ms / SPEED_UP_MS) - 1);
}
/** Its speed then, in px per second. */
export function scrollSpeed(ms: number) {
  return ms <= 0 ? 0 : START_SPEED * Math.exp(ms / SPEED_UP_MS);
}
/** How strongly the rows bend and blur at a speed: none at a crawl, fully by 1,500 px/s. */
export function speedIntensity(speed: number) {
  return smoothstep(speed / 1500);
}
/** A block popping in: springs from POP_FROM past full size and settles. 1 at rest. */
export function popIn(ms: number) {
  if (ms <= 0) return POP_FROM;
  const t = ms / 1000;
  return 1 - (1 - POP_FROM) * Math.exp(-t * 14) * Math.cos(t * 26);
}
/** The collapse into the centre: eases in, so the grid is pulled harder the smaller it gets. 1 → 0. */
export function collapseScale(progress: number) {
  const p = Math.max(0, Math.min(1, progress));
  return 1 - p * p * p;
}

export interface ReelLayout { columns: number; size: number; gap: number }
/** Two columns of the storyboard's 469px blocks on a wide card; one column with 60px side margins on a tall one. */
export function reelLayout(width: number, height: number): ReelLayout {
  return width >= height ? { columns: 2, size: 469.33, gap: 8 } : { columns: 1, size: width - 120, gap: 8 };
}

const nextFrame = () => new Promise<number>(resolve => requestAnimationFrame(resolve));

/** Plays the interlude in `stage` (which fills the card), resolving once the grid has collapsed away. */
export async function playReel(stage: HTMLElement, signal: AbortSignal) {
  const width = stage.clientWidth, height = stage.clientHeight, { columns, size, gap } = reelLayout(width, height);
  const pitch = size + gap, firstTop = (height - size) / 2, left = (width - (columns * size + (columns - 1) * gap)) / 2;
  const rowCount = Math.ceil((scrollOffset(SCROLL_MS + COLLAPSE_MS) + height) / pitch) + 2;
  const grid = document.createElement("div"), blurId = "og-reel-blur";
  grid.className = "og-reel-grid";
  // A vertical-only blur, which CSS's own blur() can't do: the smear follows the scroll.
  stage.insertAdjacentHTML("beforeend", `<svg class="og-reel-filters" aria-hidden="true"><filter id="${blurId}" x="-5%" y="-30%" width="110%" height="160%"><feGaussianBlur stdDeviation="0 0"/></filter></svg>`);
  const blur = stage.querySelector("feGaussianBlur")!;
  const rows = Array.from({ length: rowCount }, (_, row) => {
    const element = document.createElement("div");
    element.className = "og-reel-row";
    element.style.cssText = `left:${left}px;width:${columns * size + (columns - 1) * gap}px;height:${size}px;gap:${gap}px`;
    for (let column = 0; column < columns; column++) {
      const block = document.createElement("div");
      block.className = "og-reel-block";
      block.style.width = `${size}px`;
      element.append(block);
    }
    grid.append(element);
    return { element, blocks: [...element.children] as HTMLElement[], row };
  });
  stage.append(grid);
  try {
    const start = await nextFrame();
    for (let time = start; ; time = await nextFrame()) {
      signal.throwIfAborted();
      const ms = time - start, moving = ms - SCROLL_AT_MS, offset = scrollOffset(moving), speed = scrollSpeed(moving);
      const intensity = speedIntensity(speed), collapse = (ms - SCROLL_AT_MS - SCROLL_MS) / COLLAPSE_MS;
      blur.setAttribute("stdDeviation", `0 ${(Math.min(36, speed / 60 * 0.4) * intensity).toFixed(2)}`);
      grid.style.filter = intensity > 0.01 ? `url(#${blurId})` : "";
      grid.style.transform = collapse > 0 ? `scale(${collapseScale(collapse)})` : "";
      for (const { element, blocks, row } of rows) {
        const top = firstTop + row * pitch - offset;
        if (top > height + pitch || top + size < -pitch) { element.style.visibility = "hidden"; continue; }
        element.style.visibility = "";
        // Like the face of a turning drum: rows away from the middle sink back and tip away from you, so the grid
        // narrows toward the top and bottom, more the faster it goes.
        const middle = Math.max(-1.6, Math.min(1.6, (top + size / 2 - height / 2) / (height / 2)));
        const tip = middle * DRUM_TIP_DEG * intensity, sink = -middle * middle * DRUM_SINK_PX * intensity;
        element.style.transform = `translateY(${top}px) translateZ(${sink.toFixed(2)}px) rotateX(${tip.toFixed(3)}deg)`;
        // The first row pops in; the next pops in as the grid starts to move; the rest scroll in from below.
        const popAt = row === 0 ? 0 : row === 1 ? SCROLL_AT_MS : -Infinity;
        blocks.forEach((block, column) => {
          const age = ms - popAt - column * POP_STAGGER_MS;
          block.style.transform = Number.isFinite(popAt) ? `scale(${popIn(age)})` : "";
          block.style.opacity = Number.isFinite(popAt) ? String(Math.min(1, Math.max(0, age / 80))) : "";
        });
      }
      if (collapse >= 1) break;
    }
  } finally {
    grid.remove(); stage.querySelector(".og-reel-filters")?.remove();
  }
}
