import { smoothstep } from "@/lib/glyph-physics";

/**
 * The work reel's interlude (storyboard 442:1405): while the office name is off the card, the work appears on a wheel
 * seen head-on, which drifts, then spins ever faster, smearing with motion blur, and eases away. The wheel carries
 * exactly the twelve projects (six rows of two on a wide card, twelve on a tall one), so nothing past them is shown.
 * Its curve only shows near the top and bottom edges, where the cards turn away. Placeholder blocks for now.
 */

export const PROJECTS = 12;
/** The wheel eases in, drifts slowly, ramps up from about midway, then eases out still spinning. */
export const APPEAR_MS = 450;
export const SPIN_MS = 3600;
export const VANISH_MS = 450;
export const REEL_MS = SPIN_MS + VANISH_MS;
/** The drift, and the speed the ramp builds to by the end, in px of travel along the wheel per second. */
const DRIFT_SPEED = 70;
const TOP_SPEED = 5500;
/** The ramp's curve: a higher power stays slow for longer, then takes off. */
const RAMP_POWER = 3;

/** How far the wheel has turned, in px along its rim, `ms` after it appears. */
export function scrollOffset(ms: number) {
  const t = Math.max(0, ms) / 1000, total = SPIN_MS / 1000;
  return DRIFT_SPEED * t + TOP_SPEED * total / (RAMP_POWER + 1) * Math.pow(t / total, RAMP_POWER + 1);
}
/** Its speed then, in px per second. */
export function scrollSpeed(ms: number) {
  const t = Math.max(0, ms) / SPIN_MS;
  return DRIFT_SPEED + TOP_SPEED * Math.pow(t, RAMP_POWER);
}
/** How strongly the spin blurs at a speed: none while drifting, fully by 1,500 px/s. */
export function speedIntensity(speed: number) {
  return smoothstep((speed - DRIFT_SPEED) / 1500);
}
/** The wheel appearing: eases out of a slightly smaller, transparent start. `ms` from 0 to APPEAR_MS. */
export function appear(ms: number) {
  const p = 1 - Math.pow(1 - Math.max(0, Math.min(1, ms / APPEAR_MS)), 3);
  return { scale: 0.92 + 0.08 * p, opacity: p };
}
/** And going: the appearance in reverse, easing in. `progress` from 0 to 1. */
export function vanish(progress: number) {
  return appear((1 - Math.max(0, Math.min(1, progress))) * APPEAR_MS);
}

export interface ReelLayout { columns: number; rows: number; size: number; gap: number }
/** Two columns of the storyboard's 469px blocks on a wide card; one column with 60px side margins on a tall one. */
export function reelLayout(width: number, height: number): ReelLayout {
  return width >= height ? { columns: 2, rows: PROJECTS / 2, size: 469.33, gap: 8 } : { columns: 1, rows: PROJECTS, size: width - 120, gap: 8 };
}
/**
 * Where a row sits on the wheel, as an angle from the front, in (-π, π]: the rows go round once in `rows` steps, so
 * after the last project the first comes round again.
 */
export function rowAngle(row: number, offset: number, layout: ReelLayout) {
  const pitch = layout.size + layout.gap, around = layout.rows * pitch, radius = around / (Math.PI * 2);
  const along = ((row * pitch - offset) % around + around * 1.5) % around - around / 2;
  return along / radius;
}

const nextFrame = () => new Promise<number>(resolve => requestAnimationFrame(resolve));

/** Plays the interlude in `stage` (which fills the card), resolving once the wheel has eased away. */
export async function playReel(stage: HTMLElement, signal: AbortSignal) {
  const width = stage.clientWidth, height = stage.clientHeight, layout = reelLayout(width, height), { columns, rows, size, gap } = layout;
  const radius = rows * (size + gap) / (Math.PI * 2), rowWidth = columns * size + (columns - 1) * gap;
  const wheel = document.createElement("div"), blurId = "og-reel-blur";
  wheel.className = "og-reel-grid";
  // A vertical-only blur, which CSS's own blur() can't do: the smear follows the spin.
  stage.insertAdjacentHTML("beforeend", `<svg class="og-reel-filters" aria-hidden="true"><filter id="${blurId}" x="-5%" y="-30%" width="110%" height="160%"><feGaussianBlur stdDeviation="0 0"/></filter></svg>`);
  const blur = stage.querySelector("feGaussianBlur")!;
  const elements = Array.from({ length: rows }, () => {
    const element = document.createElement("div");
    element.className = "og-reel-row";
    element.style.cssText = `left:${(width - rowWidth) / 2}px;top:${(height - size) / 2}px;width:${rowWidth}px;height:${size}px;gap:${gap}px`;
    for (let column = 0; column < columns; column++) {
      const block = document.createElement("div");
      block.className = "og-reel-block";
      block.style.width = `${size}px`;
      element.append(block);
    }
    wheel.append(element);
    return element;
  });
  stage.append(wheel);
  try {
    const start = await nextFrame();
    for (let time = start; ; time = await nextFrame()) {
      signal.throwIfAborted();
      const ms = time - start, offset = scrollOffset(ms), speed = scrollSpeed(ms), intensity = speedIntensity(speed);
      const going = (ms - SPIN_MS) / VANISH_MS, { scale, opacity } = going > 0 ? vanish(going) : appear(ms);
      blur.setAttribute("stdDeviation", `0 ${(Math.min(36, speed / 60 * 0.4) * intensity).toFixed(2)}`);
      wheel.style.filter = intensity > 0.01 ? `url(#${blurId})` : "";
      wheel.style.transform = `scale(${scale})`;
      wheel.style.opacity = String(opacity);
      elements.forEach((element, row) => {
        // Each row sits on the rim, turned to face out from the axle; those round the back are hidden.
        const angle = rowAngle(row, offset, layout);
        element.style.visibility = Math.abs(angle) < Math.PI / 2 ? "" : "hidden";
        element.style.transform = `translateZ(${-radius}px) rotateX(${-angle}rad) translateZ(${radius}px)`;
      });
      if (going >= 1) break;
    }
  } finally {
    wheel.remove(); stage.querySelector(".og-reel-filters")?.remove();
  }
}
