import type MatterJS from "matter-js";
import { releaseDelay, smoothstep } from "@/lib/glyph-physics";
import type { Point } from "@/lib/glyph-physics";

const STEP = 1000 / 60;
/** The swarm's air while letters pop out and float, then almost none once they are kicked loose to bounce. */
const FLOAT_AIR = 0.035;
const LOOSE_AIR = 0.006;
/** Slows everything back to a float before the letters turn for home, mirroring the kick. */
const SETTLE_AIR = 0.07;
const BOUNCE = 0.9;
/** Letters pop out across this window, nearest the centre first, as the swarm does. */
const RELEASE_SPREAD_MS = 600;
const LOOSE_MS = 3000;
const FLICKER_MS = 55;
/** A pumped character passes through its parent until it has grown out of it. */
const EMERGE_MS = 260;
const DISSOLVE_MS = 380;

interface Sample { x: number; y: number; angle: number }
interface Tint { start: number; end: number; to: string; flickAt: number }
interface Piece {
  element: HTMLSpanElement;
  body: MatterJS.Body;
  width: number;
  height: number;
  bornAt: number;
  tint?: Tint;
  /** When this piece last pumped, which drives its squeeze and spring. */
  pumpedAt?: number;
  gone?: boolean;
  /** Only the original letters have a home; pumped characters dissolve. */
  home?: Home;
  dissolveAt?: number;
}
interface Home {
  span: HTMLElement;
  releaseAt: number;
  kickAt: number;
  kicked?: boolean;
  /** Its pop-out and float, recorded step by step, so the way home is the same path played backwards. */
  path: Sample[];
  nextPumpAt: number;
  pumpsLeft: number;
  returnAt: number;
  rewind?: { at: number; duration: number; offset: Sample };
}

/** A pump: the letter squeezes in, springs past its size, and rings out. 1 at rest. */
export function pumpScale(ms: number) {
  if (ms <= 0) return 1;
  const t = ms / 1000;
  return 1 - 0.32 * Math.exp(-t * 7) * Math.sin(t * 22);
}

/** A pumped character grows out of its parent: from nothing, past full size, ringing in to 1. */
export function emergeScale(ms: number) {
  const t = Math.max(0, ms) / 1000;
  return 1 - Math.exp(-t * 8) * Math.cos(t * 18);
}

/**
 * A recorded path played backwards: t = 0 is its last sample, t = 1 its first. Time eases in and out, so the letter
 * leaves its float gently and slows into its slot rather than landing at its pop-out speed.
 */
export function rewind(path: readonly Sample[], t: number): Sample {
  if (!path.length) return { x: 0, y: 0, angle: 0 };
  const at = (1 - smoothstep(t)) * (path.length - 1), index = Math.floor(at), mix = at - index;
  const from = path[index], to = path[Math.min(path.length - 1, index + 1)];
  return { x: from.x + (to.x - from.x) * mix, y: from.y + (to.y - from.y) * mix, angle: from.angle + (to.angle - from.angle) * mix };
}

/** The shortest turn between two angles, so a letter that spun many times doesn't unwind them all on the way home. */
export function turnBetween(from: number, to: number) {
  const turn = (to - from) % (Math.PI * 2);
  return turn > Math.PI ? turn - Math.PI * 2 : turn < -Math.PI ? turn + Math.PI * 2 : turn;
}

const centerOf = (rect: DOMRect) => ({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });

/**
 * The link-preview card's burst. Each letter pops out and floats like the swarm's entry, then is kicked loose to bounce
 * freely off the card's edges and each other, pumping out new characters as it goes. Then the new characters glitch
 * and dissolve, and every letter plays its pop-out backwards into place. Resolves once the text is whole again.
 */
export async function burst(letters: HTMLElement[], options: { signal: AbortSignal; palette: () => string[]; chars: readonly string[] }) {
  const { Bodies, Body, Composite, Engine } = (await import("matter-js")).default;
  const { signal } = options;
  signal.throwIfAborted();
  const engine = Engine.create({ positionIterations: 6, velocityIterations: 4 });
  engine.gravity.x = 0; engine.gravity.y = 0;
  const w = window.innerWidth, h = window.innerHeight, t = 400, center = { x: w / 2, y: h / 2 };
  const walls = [Bodies.rectangle(w / 2, -t / 2, w + t * 2, t), Bodies.rectangle(w / 2, h + t / 2, w + t * 2, t),
    Bodies.rectangle(-t / 2, h / 2, t, h + t * 2), Bodies.rectangle(w + t / 2, h / 2, t, h + t * 2)];
  walls.forEach(wall => Body.setStatic(wall, true));
  Composite.add(engine.world, walls);
  const layer = document.createElement("div");
  layer.className = "glyph-swarm-layer"; layer.setAttribute("aria-hidden", "true");
  document.body.append(layer);

  const random = (list: readonly string[]) => list[Math.floor(Math.random() * list.length)];
  const base = getComputedStyle(letters[0]?.parentElement ?? document.body).color;
  const tintStep = (piece: Piece, time: number) => {
    const tint = piece.tint;
    if (!tint || time < tint.start) return;
    if (time >= tint.end) { piece.element.style.color = tint.to; piece.tint = undefined; return; }
    if (time - tint.flickAt < FLICKER_MS) return;
    tint.flickAt = time;
    piece.element.style.color = Math.random() < 0.25 ? tint.to : random(options.palette());
  };
  const glitchTo = (piece: Piece, start: number, to: string, min: number, spread: number) => {
    piece.tint = { start, end: start + min + Math.random() * spread, to, flickAt: 0 };
  };

  const pieces: Piece[] = [];
  const spawn = (char: string, size: { width: number; height: number }, at: Point, font: string, color: string, time: number) => {
    const element = document.createElement("span"); element.className = "glyph-swarm-glyph"; element.textContent = char;
    element.style.cssText = `width:${size.width}px;height:${size.height}px;font:${font};line-height:${size.height}px;color:${color}`;
    const body = Bodies.rectangle(at.x, at.y, Math.max(2, size.width * 0.9), Math.max(2, size.height * 0.72),
      { restitution: BOUNCE, friction: 0.05, frictionStatic: 0.2, frictionAir: FLOAT_AIR, slop: 0.02 });
    const piece: Piece = { element, body, width: size.width, height: size.height, bornAt: time };
    pieces.push(piece); layer.append(element); Composite.add(engine.world, body);
    return piece;
  };

  // The same order and pop as the swarm's entry: nearest the centre first, each hopping mostly up and away.
  const startedAt = performance.now();
  const rects = letters.map(span => span.getBoundingClientRect());
  const distance = (rect: DOMRect) => Math.hypot(centerOf(rect).x - center.x, centerOf(rect).y - center.y);
  const farthest = rects.reduce((max, rect) => Math.max(max, distance(rect)), 0);
  const queue = letters.map((span, index) => ({ span, rect: rects[index],
    at: releaseDelay(distance(rects[index]), farthest, RELEASE_SPREAD_MS * 0.4) + Math.random() * RELEASE_SPREAD_MS * 0.6 }))
    .filter(entry => entry.span.textContent?.trim() && entry.rect.width >= 1).sort((a, b) => a.at - b.at);
  const lastRelease = queue.at(-1)?.at ?? 0;
  const exitAt = startedAt + RELEASE_SPREAD_MS + 700 + LOOSE_MS;
  let queued = 0;

  const release = (span: HTMLElement, rect: DOMRect, releaseOffset: number, time: number) => {
    const style = getComputedStyle(span), at = centerOf(rect);
    const piece = spawn(span.textContent ?? "", rect, at, `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`, style.color, time);
    span.style.visibility = "hidden";
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.3, speed = 1.2 + Math.random() * 3;
    Body.setVelocity(piece.body, { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed });
    Body.setAngularVelocity(piece.body, (Math.random() - 0.5) * 0.2);
    const kickAt = time + 250 + Math.random() * 450;
    // Last out, first home: the exit runs the release order backwards.
    piece.home = { span, releaseAt: time, kickAt, path: [{ ...at, angle: 0 }], nextPumpAt: kickAt + Math.random() * 300,
      pumpsLeft: 1 + Math.floor(Math.random() * 3), returnAt: exitAt + 350 + (lastRelease - releaseOffset) };
  };
  const kick = (piece: Piece, time: number) => {
    const { position } = piece.body, away = Math.atan2(position.y - center.y, position.x - center.x) + (Math.random() - 0.5) * 1.2;
    const speed = 7 + Math.random() * 6;
    piece.home!.kicked = true; piece.body.frictionAir = LOOSE_AIR;
    Body.setVelocity(piece.body, { x: Math.cos(away) * speed, y: Math.sin(away) * speed });
    Body.setAngularVelocity(piece.body, (Math.random() - 0.5) * 0.3);
    glitchTo(piece, time, random(options.palette()), 300, 450);
  };
  const pump = (parent: Piece, time: number) => {
    parent.pumpedAt = time;
    glitchTo(parent, time, random(options.palette()), 120, 120);
    const { position, velocity } = parent.body, angle = Math.random() * Math.PI * 2, speed = 4 + Math.random() * 4;
    const child = spawn(random(options.chars), parent, position, parent.element.style.font, random(options.palette()), time);
    child.body.frictionAir = LOOSE_AIR;
    child.body.collisionFilter.mask = 0;
    Body.setVelocity(child.body, { x: velocity.x + Math.cos(angle) * speed, y: velocity.y + Math.sin(angle) * speed });
    Body.setAngularVelocity(child.body, (Math.random() - 0.5) * 0.3);
    glitchTo(child, time, random(options.palette()), 200, 200);
    child.dissolveAt = exitAt + Math.random() * 500;
  };
  const remove = (piece: Piece) => { piece.gone = true; piece.element.remove(); Composite.remove(engine.world, piece.body); };

  let frame = 0, previous = startedAt, pending = 0, settled = false;
  return new Promise<void>((resolve, reject) => {
    const cleanup = () => { cancelAnimationFrame(frame); Engine.clear(engine); layer.remove(); letters.forEach(span => { span.style.visibility = ""; }); };
    signal.addEventListener("abort", () => { cleanup(); reject(signal.reason); }, { once: true });
    const render = (time: number) => {
      pending = Math.min(pending + time - previous, STEP * 4); previous = time;
      while (queued < queue.length && queue[queued].at <= time - startedAt) { const { span, rect, at } = queue[queued++]; release(span, rect, at, time); }
      if (!settled && time >= exitAt) {
        settled = true;
        for (const piece of pieces) if (piece.home) piece.body.frictionAir = SETTLE_AIR;
      }
      for (const piece of pieces) {
        const home = piece.home;
        if (piece.gone) continue;
        if (home && !home.rewind) {
          if (time >= home.kickAt && !home.kicked) kick(piece, time);
          if (home.pumpsLeft && time >= home.nextPumpAt && time < exitAt - 400) {
            pump(piece, time); home.pumpsLeft--; home.nextPumpAt = time + 400 + Math.random() * 500;
          }
          if (time >= home.returnAt) {
            // Leaves the physics where it floats, and blends from there onto its recorded pop-out, played backwards.
            const end = home.path.at(-1)!, { position, angle } = piece.body;
            const offset = { x: position.x - end.x, y: position.y - end.y, angle: -turnBetween(angle, end.angle) };
            home.rewind = { at: time, duration: home.path.length * STEP * 1.3 + Math.hypot(offset.x, offset.y) * 0.9, offset };
            Composite.remove(engine.world, piece.body);
            glitchTo(piece, time, base, 300, 300);
          }
        }
        if (!home && piece.dissolveAt && time >= piece.dissolveAt && !piece.tint) glitchTo(piece, time, random(options.palette()), DISSOLVE_MS, 0);
        if (!home && time - piece.bornAt >= EMERGE_MS && !piece.body.collisionFilter.mask) piece.body.collisionFilter.mask = 0xffffffff;
      }
      while (pending >= STEP) {
        Engine.update(engine, STEP); pending -= STEP;
        for (const piece of pieces) {
          const home = piece.home;
          if (home && !piece.gone && !home.kicked) home.path.push({ x: piece.body.position.x, y: piece.body.position.y, angle: piece.body.angle });
        }
      }
      let remaining = queue.length - queued;
      for (const piece of pieces) {
        if (piece.gone) continue;
        tintStep(piece, time);
        const home = piece.home;
        let { x, y } = piece.body.position, angle = piece.body.angle, scale = pumpScale(time - (piece.pumpedAt ?? time)), opacity = 1;
        if (home?.rewind) {
          const { at, duration, offset } = home.rewind, progress = Math.min(1, (time - at) / duration), fade = 1 - smoothstep(Math.min(1, progress * 1.6));
          const sample = rewind(home.path, progress);
          x = sample.x + offset.x * fade; y = sample.y + offset.y * fade; angle = sample.angle + offset.angle * fade;
          if (progress >= 1) { remove(piece); home.span.style.visibility = ""; home.span.style.color = ""; continue; }
        }
        if (!home) {
          scale *= emergeScale(time - piece.bornAt);
          if (piece.dissolveAt && time >= piece.dissolveAt) {
            const gone = Math.min(1, (time - piece.dissolveAt) / DISSOLVE_MS);
            if (gone >= 1) { remove(piece); continue; }
            opacity = 1 - smoothstep(gone); scale *= 1 - 0.5 * gone;
          }
        }
        remaining++;
        piece.element.style.transform = `translate(${x - piece.width / 2}px,${y - piece.height / 2}px) rotate(${angle}rad) scale(${scale})`;
        piece.element.style.opacity = String(opacity);
      }
      if (time > exitAt && !remaining) { cleanup(); resolve(); return; }
      frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);
  });
}
