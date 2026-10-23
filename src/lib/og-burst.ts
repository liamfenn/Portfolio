import type MatterJS from "matter-js";
import { releaseDelay, smoothstep, springStep } from "@/lib/glyph-physics";
import type { Point } from "@/lib/glyph-physics";

const STEP = 1000 / 60;
/** The swarm's air while letters pop out and float, then almost none once they are kicked loose to bounce. */
const FLOAT_AIR = 0.035;
const LOOSE_AIR = 0.006;
/** Slows a letter back to a float just before it turns for home, mirroring its kick. */
const SETTLE_AIR = 0.07;
const SETTLE_LEAD_MS = 450;
const BOUNCE = 0.9;
/** Matter only bounces contacts faster than about 4px a step; slower pieces slide along a wall and park there. Loose
 * pieces are topped back up toward this speed so they keep ricocheting until it is their turn to settle. */
const CRUISE = 5;
/** Letters pop out across this window, nearest the centre first, as the swarm does. */
const RELEASE_SPREAD_MS = 600;
const LOOSE_MS = 4000;
/** Letters turn for home across this window, the swarm's own release spread, last out first home with some jitter. */
const RETURN_SPREAD_MS = 1400;
/** A letter still gliding this long gives up on reaching its float exactly and starts home from wherever it is. */
const GLIDE_TIMEOUT_MS = 2500;
/** Reading-order landings: each word starts this long after the one before, overlapping it, and its letters land this
 * far apart, left to right. Letters turn for home early enough to glide back and wait at their float for their turn. */
const WORD_GAP_MS = 320;
const LETTER_GAP_MS = 90;
const LAND_AFTER_MS = 3000;
const GLIDE_BUDGET_MS = 1800;
const FLICKER_MS = 55;
/** A pump: the letter flickers between itself and the character it is about to give off, until its squeeze bottoms out
 * (see pumpScale) and the new character splits off its edge. */
const MORPH_MS = 70;
/** A pumped character passes through its parent for a moment after splitting off, so they don't knock apart. */
const EMERGE_MS = 160;
/** On exit, a pumped character swells for this long, glitching, then is simply gone. */
const POP_MS = 120;
/** Until it is kicked loose, a letter collides only with the walls. Letters start shoulder to shoulder, so otherwise
 * their pop-outs record nudges from their neighbours, which the way home would replay just as they settle. */
const WALL = 0x0002;
const EVERYTHING = 0xffffffff;

interface Sample { x: number; y: number; angle: number }
interface Tint { start: number; end: number; to: string; flickAt: number }
interface Piece {
  element: HTMLSpanElement;
  body: MatterJS.Body;
  width: number;
  height: number;
  bornAt: number;
  char: string;
  tint?: Tint;
  /** When this piece last pumped, which drives its squeeze and spring. */
  pumpedAt?: number;
  /** A pump under way: the character it is turning into, briefly, before that character splits off. */
  morph?: { at: number; char: string; flickAt: number };
  gone?: boolean;
  /** Only the original letters have a home; pumped characters pop. */
  home?: Home;
  popAt?: number;
  popping?: boolean;
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
  /** The colour it left with, which it glitches back to on the way home. */
  color: string;
  settleAt: number;
  returnAt: number;
  /** In reading order, when this letter starts its rewind, so it lands in its turn whatever its glide did. */
  rewindAt?: number;
  landAt?: number;
  /** First it glides on its own spring back to where its float ended, keeping the speed it had... */
  glide?: { at: number; x: number; vx: number; y: number; vy: number; angle: number; spin: number; omega: number; target: number };
  /** ...then plays its pop-out backwards into its slot. */
  rewind?: { at: number; duration: number; offset: Sample };
}

/** A pump: the letter squeezes in, springs past its size, and rings out. 1 at rest. */
export function pumpScale(ms: number) {
  if (ms <= 0) return 1;
  const t = ms / 1000;
  return 1 - 0.32 * Math.exp(-t * 7) * Math.sin(t * 22);
}

/** A pumped character's exit: it swells quickly, easing out, then is gone (null) rather than fading. */
export function popScale(ms: number, duration = POP_MS) {
  if (ms >= duration) return null;
  const t = Math.max(0, ms) / duration;
  return 1 + 0.45 * (1 - Math.pow(1 - t, 3));
}

/** A pumped character splits off its parent at under half size, springs past full size, and rings in to 1. */
export function emergeScale(ms: number) {
  const t = Math.max(0, ms) / 1000;
  return 1 - 0.55 * Math.exp(-t * 8) * Math.cos(t * 18);
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

/** A Fisher–Yates shuffle into a new array. */
export function shuffled<T>(items: readonly T[], random = Math.random) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index--) {
    const pick = Math.floor(random() * (index + 1));
    [copy[index], copy[pick]] = [copy[pick], copy[index]];
  }
  return copy;
}

const centerOf = (rect: DOMRect) => ({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });

/**
 * The link-preview card's burst. Each letter pops out and floats like the swarm's entry, then is kicked loose to bounce
 * freely off the card's edges and each other, pumping out new characters as it goes. Then the new characters glitch
 * and pop, and every letter glides back to where its float ended and plays its pop-out backwards into place, each on its
 * own schedule and spring. Resolves once the text is whole again, in the colours it started with.
 */
export async function burst(letters: HTMLElement[], options: { signal: AbortSignal; palette: () => string[]; chars: readonly string[];
  /** "reverse" (the default): last out, first home. "reading": each word lands left to right, words overlapping. */
  landing?: "reverse" | "reading" }) {
  const { Bodies, Body, Composite, Engine } = (await import("matter-js")).default;
  const { signal } = options;
  signal.throwIfAborted();
  const engine = Engine.create({ positionIterations: 6, velocityIterations: 4 });
  engine.gravity.x = 0; engine.gravity.y = 0;
  const w = window.innerWidth, h = window.innerHeight, t = 400, center = { x: w / 2, y: h / 2 };
  const walls = [Bodies.rectangle(w / 2, -t / 2, w + t * 2, t), Bodies.rectangle(w / 2, h + t / 2, w + t * 2, t),
    Bodies.rectangle(-t / 2, h / 2, t, h + t * 2), Bodies.rectangle(w + t / 2, h / 2, t, h + t * 2)];
  walls.forEach(wall => { Body.setStatic(wall, true); wall.collisionFilter.category = WALL; });
  Composite.add(engine.world, walls);
  const layer = document.createElement("div");
  layer.className = "glyph-swarm-layer"; layer.setAttribute("aria-hidden", "true");
  document.body.append(layer);

  const random = (list: readonly string[]) => list[Math.floor(Math.random() * list.length)];
  // Pumped characters come out of a shuffled bag, so none repeats until every one has had a turn.
  let bag: string[] = [];
  const draw = () => {
    if (!bag.length) bag = shuffled(options.chars);
    return bag.pop()!;
  };
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
    const piece: Piece = { element, body, width: size.width, height: size.height, bornAt: time, char };
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
  // Where each letter lands in reading order: its word's start plus its place in the word.
  const readingLand = new Map<HTMLElement, number>();
  for (let index = 0, word = 0, place = 0; index < letters.length; index++) {
    if (!letters[index].textContent?.trim()) { if (place) { word++; place = 0; } continue; }
    readingLand.set(letters[index], exitAt + LAND_AFTER_MS + word * WORD_GAP_MS + place++ * LETTER_GAP_MS);
  }
  let queued = 0;

  const release = (span: HTMLElement, rect: DOMRect, releaseOffset: number, time: number) => {
    const style = getComputedStyle(span), at = centerOf(rect);
    const piece = spawn(span.textContent ?? "", rect, at, `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`, style.color, time);
    span.style.visibility = "hidden"; piece.body.collisionFilter.mask = WALL;
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.3, speed = 1.2 + Math.random() * 3;
    Body.setVelocity(piece.body, { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed });
    Body.setAngularVelocity(piece.body, (Math.random() - 0.5) * 0.2);
    const kickAt = time + 250 + Math.random() * 450;
    // Last out, first home: the exit runs the release order backwards, loosely, across a wider window than the entry.
    const returnAt = exitAt + 400 + (1 - releaseOffset / Math.max(1, lastRelease)) * RETURN_SPREAD_MS * 0.6 + Math.random() * RETURN_SPREAD_MS * 0.4;
    piece.home = { span, releaseAt: time, kickAt, path: [{ ...at, angle: 0 }], nextPumpAt: kickAt + Math.random() * 300,
      pumpsLeft: 2 + Math.floor(Math.random() * 3), color: style.color, settleAt: returnAt - SETTLE_LEAD_MS, returnAt,
      landAt: options.landing === "reading" ? readingLand.get(span) : undefined };
  };
  const kick = (piece: Piece, time: number) => {
    const { position } = piece.body, away = Math.atan2(position.y - center.y, position.x - center.x) + (Math.random() - 0.5) * 1.2;
    const speed = 7 + Math.random() * 6;
    const home = piece.home!;
    home.kicked = true; piece.body.frictionAir = LOOSE_AIR; piece.body.collisionFilter.mask = EVERYTHING;
    // Its pop-out is fully recorded now, so the rewind's length is known: work back from its landing to its departure.
    if (home.landAt) {
      home.rewindAt = home.landAt - rewindMs(home);
      home.returnAt = home.rewindAt - GLIDE_BUDGET_MS; home.settleAt = home.returnAt - SETTLE_LEAD_MS;
    }
    Body.setVelocity(piece.body, { x: Math.cos(away) * speed, y: Math.sin(away) * speed });
    Body.setAngularVelocity(piece.body, (Math.random() - 0.5) * 0.3);
    glitchTo(piece, time, random(options.palette()), 300, 450);
  };
  const pump = (parent: Piece, time: number) => {
    parent.pumpedAt = time; parent.morph = { at: time, char: draw(), flickAt: 0 };
    glitchTo(parent, time, random(options.palette()), 120, 120);
  };
  // The new character leaves from the parent's edge, already moving out, and the parent recoils a little.
  const split = (parent: Piece, char: string, time: number) => {
    const { position, velocity } = parent.body, angle = Math.random() * Math.PI * 2, speed = 4 + Math.random() * 4;
    const direction = { x: Math.cos(angle), y: Math.sin(angle) }, reach = parent.height * 0.5;
    const child = spawn(char, parent, { x: position.x + direction.x * reach, y: position.y + direction.y * reach }, parent.element.style.font, random(options.palette()), time);
    Body.setVelocity(parent.body, { x: velocity.x - direction.x * 1.2, y: velocity.y - direction.y * 1.2 });
    child.body.frictionAir = LOOSE_AIR;
    child.body.collisionFilter.mask = 0;
    Body.setVelocity(child.body, { x: velocity.x + direction.x * speed, y: velocity.y + direction.y * speed });
    Body.setAngularVelocity(child.body, (Math.random() - 0.5) * 0.3);
    glitchTo(child, time, random(options.palette()), 200, 200);
    child.popAt = exitAt + Math.random() * 900;
  };
  const remove = (piece: Piece) => { piece.gone = true; piece.element.remove(); Composite.remove(engine.world, piece.body); };

  const rewindMs = (home: Home) => home.path.length * STEP * 1.6;
  const startRewind = (piece: Piece, home: Home, at: Point & { angle: number }, time: number) => {
    const end = home.path.at(-1)!;
    home.rewind = { at: time, duration: rewindMs(home), offset: { x: at.x - end.x, y: at.y - end.y, angle: at.angle - end.angle } };
  };

  let frame = 0, previous = startedAt, pending = 0;
  return new Promise<void>((resolve, reject) => {
    const cleanup = () => { cancelAnimationFrame(frame); Engine.clear(engine); layer.remove(); letters.forEach(span => { span.style.visibility = ""; }); };
    signal.addEventListener("abort", () => { cleanup(); reject(signal.reason); }, { once: true });
    const render = (time: number) => {
      const dt = Math.min(64, time - previous) / 1000;
      pending = Math.min(pending + time - previous, STEP * 4); previous = time;
      while (queued < queue.length && queue[queued].at <= time - startedAt) { const { span, rect, at } = queue[queued++]; release(span, rect, at, time); }
      for (const piece of pieces) {
        const home = piece.home;
        if (piece.gone) continue;
        if (home && !home.glide && !home.rewind) {
          if (time >= home.kickAt && !home.kicked) kick(piece, time);
          if (home.pumpsLeft && time >= home.nextPumpAt && time < exitAt - 400) {
            pump(piece, time); home.pumpsLeft--; home.nextPumpAt = time + 500 + Math.random() * 600;
          }
          if (time >= home.settleAt && home.kicked) piece.body.frictionAir = SETTLE_AIR;
          if (time >= home.returnAt) {
            // Leaves the physics where it floats, keeping its speed, and turns the short way toward its float's end.
            const end = home.path.at(-1)!, { position, velocity, angle, angularVelocity } = piece.body;
            home.glide = { at: time, x: position.x, vx: velocity.x * 60, y: position.y, vy: velocity.y * 60, angle, spin: angularVelocity * 60,
              omega: 3 + Math.random() * 3, target: angle + turnBetween(angle, end.angle) };
            Composite.remove(engine.world, piece.body);
            glitchTo(piece, time, home.color, 300, 400);
          }
        }
        const morph = piece.morph;
        if (morph && time - morph.at >= MORPH_MS) { piece.element.textContent = piece.char; piece.morph = undefined; split(piece, morph.char, time); }
        else if (morph && time - morph.flickAt >= FLICKER_MS) {
          morph.flickAt = time; piece.element.textContent = piece.element.textContent === morph.char ? piece.char : morph.char;
        }
        if (!home && piece.popAt && time >= piece.popAt && !piece.popping) { piece.popping = true; glitchTo(piece, time, random(options.palette()), POP_MS, 0); }
        if (!home && time - piece.bornAt >= EMERGE_MS && !piece.body.collisionFilter.mask) piece.body.collisionFilter.mask = EVERYTHING;
      }
      for (const piece of pieces) {
        const home = piece.home, loose = home ? home.kicked && time < home.settleAt : !piece.popping;
        const { velocity } = piece.body, speed = Math.hypot(velocity.x, velocity.y);
        if (piece.gone || !loose || speed >= CRUISE || speed < 0.01) continue;
        const boost = Math.min(CRUISE / speed, 1.04);
        Body.setVelocity(piece.body, { x: velocity.x * boost, y: velocity.y * boost });
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
        let { x, y } = piece.body.position, angle = piece.body.angle, scale = pumpScale(time - (piece.pumpedAt ?? time));
        if (home?.glide && !home.rewind) {
          const glide = home.glide, end = home.path.at(-1)!;
          const gx = springStep(glide.x, glide.vx, end.x, glide.omega, dt), gy = springStep(glide.y, glide.vy, end.y, glide.omega, dt);
          const turn = springStep(glide.angle, glide.spin, glide.target, glide.omega * 0.8, dt);
          Object.assign(glide, { x: gx.position, vx: gx.velocity, y: gy.position, vy: gy.velocity, angle: turn.position, spin: turn.velocity });
          x = glide.x; y = glide.y; angle = glide.angle;
          // Close and nearly still, it hands over to the rewind, which starts from rest, so there is no hitch. In reading
          // order it hovers there until its turn, and if its turn comes first it starts from wherever it is.
          const arrived = Math.hypot(end.x - x, end.y - y) < 3 && Math.hypot(glide.vx, glide.vy) < 40;
          const ready = home.rewindAt === undefined ? arrived || time - glide.at > GLIDE_TIMEOUT_MS : time >= home.rewindAt;
          if (ready) startRewind(piece, home, { x, y, angle: angle - (glide.target - end.angle) }, time);
        }
        if (home?.rewind) {
          const { at, duration, offset } = home.rewind, progress = Math.min(1, (time - at) / duration), fade = 1 - smoothstep(Math.min(1, progress * 2));
          const sample = rewind(home.path, progress), spins = home.glide ? home.glide.target - home.path.at(-1)!.angle : 0;
          x = sample.x + offset.x * fade; y = sample.y + offset.y * fade; angle = sample.angle + spins + offset.angle * fade;
          if (progress >= 1) { remove(piece); home.span.style.visibility = ""; continue; }
        }
        if (!home) {
          scale *= emergeScale(time - piece.bornAt);
          if (piece.popAt && time >= piece.popAt) {
            const swell = popScale(time - piece.popAt);
            if (swell === null) { remove(piece); continue; }
            scale *= swell;
          }
        }
        remaining++;
        piece.element.style.transform = `translate(${x - piece.width / 2}px,${y - piece.height / 2}px) rotate(${angle}rad) scale(${scale})`;
      }
      if (time > exitAt && !remaining) { cleanup(); resolve(); return; }
      frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);
  });
}
