import type MatterJS from "matter-js";
import { SPACING, captureStrength, entryPoint, pocketForce, touchIntent, pushImpulse, releaseDelay, separationForce, springStep, swarmCount, wanderForce, zoneForce, zoneRadius } from "@/lib/glyph-physics";
import type { Point } from "@/lib/glyph-physics";
import type { GlyphSettings } from "@/lib/palette-toy";

const MASK_ONLY = "[role='menu'],.homepage-project-overlay";
const SKIP = ".homepage-project-overlay,.glyph-globe,.glyph-exit,.homepage-project-tooltip,.design-inspector,.spacing-overlay,.palette-lab,.inspectable-label,.sr-only,.homepage-track-time-reserve,[role='menu'],script,style";
const STEP = 1000 / 60;
const AIR = 0.035;
/**
 * The exit is the entry in reverse. Entry: the globe bursts and forms the ring, then page letters pop out.
 * Exit: page letters go home first, then the globe's own letters converge back into it while the ring folds in.
 * The ring starts folding back this far into the exit.
 */
export const EXIT_RETURN_DELAY_MS = 1300;
/** Intro: letters pop out of the text across this window, nearest to the globe tending to go first. */
const RELEASE_SPREAD_MS = 1400;
/** Exit: letters let go of the swarm and turn for home across this window. */
const LET_GO_MS = 900;
const LANDING_TIMEOUT_MS = 5000;
/** A page letter's colour glitch: it flickers between palette colours this often, for 300-750ms, then settles. */
const FLICKER_MS = 55;
/** A pointer hitting a letter sometimes knocks it into a new colour: this chance per hit, with a hit being a fresh contact. */
const HIT_RECOLOR_CHANCE = 0.22;
const HIT_GAP_MS = 300;
/** Text must hold a new character this long (a new song, a clock tick) before a floating letter becomes it; scrambles pass by. */
const MORPH_AFTER_MS = 400;
const ANCHOR_LEVELS = 3;
/** Globe letters fade into the globe; this close, they are gone. */
const GLOBE_LANDING_PX = 6;

/** A character position inside an element's text, which survives the element's text nodes being replaced. */
interface Anchor { element: Element; index: number }
interface Source {
  node: Text; offset: number; parent: HTMLElement; range: Range; rect: DOMRect;
  /** The letter's parent and two ancestors, nearest first; the first still on the page decides where the letter lives. */
  anchors: Anchor[];
  /** True when the letter's place no longer exists, such as a shorter song title. */
  orphan: boolean;
  /** A new character waiting to settle before the floating letter takes it on. */
  pending?: { char: string; at: number };
}
interface Flight {
  x: number; y: number; vx: number; vy: number; angle: number; spin: number; omega: number;
  /** A page letter homes on a spot just off its slot, still a little tilted, then settles the rest of the way. */
  offset: Point; tilt: number; upright: number;
  settle?: { at: number; duration: number; x: number; y: number; angle: number };
}
interface Glyph {
  element: HTMLSpanElement;
  body: MatterJS.Body;
  /** Page letters return to their text; globe letters return to the globe. */
  source?: Source;
  patch?: HTMLSpanElement;
  width: number;
  height: number;
  wander: number;
  /** For a globe letter, its place in the globe: it flies out of it on entry and back into it on exit. */
  globeChar?: HTMLElement;
  /** Intro timing: each letter floats loose for a while, then its pull fades in over its own ramp. */
  bornAt: number;
  floatMs: number;
  captureMs: number;
  /** How hard this letter is drawn in, so the swarm arrives at different speeds. */
  pullScale: number;
  /** Each letter circles its own spot in the zone, which keeps the cloud flowing and uneven. */
  orbit: number;
  orbitSpeed: number;
  reach: number;
  /** Exit timing: when this letter turns for home. */
  departAt: number;
  flight?: Flight;
  /** A page letter's own text colour, which it glitches back to on the way home. */
  baseColor: string;
  /** When the pointer last pushed this letter, so a sweep through it counts as one hit. */
  lastHitAt?: number;
  /** A colour glitch in progress: flickering between palette colours until `end`, then settling on `to`. */
  tint?: { start: number; end: number; to: string; flickAt: number };
  landed?: boolean;
}
export interface GlyphSwarm {
  isActive(): boolean;
  update(settings: GlyphSettings): void;
  collapse(): Promise<void>;
  cancel(): void;
}

/** Warms the physics module before the globe is tapped, so the burst starts on the same frame. */
export function preloadSwarm() { void import("matter-js"); }

/** The nearest ancestor that draws a box; inspector wrappers use display: contents and measure 0×0. */
function boxOf(parent: HTMLElement) {
  let box: HTMLElement | null = parent;
  while (box && getComputedStyle(box).display === "contents") box = box.parentElement;
  return box;
}
function shown(box: HTMLElement | null) {
  return !box || box.checkVisibility({ visibilityProperty: true, opacityProperty: true });
}
/** The text nodes inside an element that the swarm can take from, in reading order. */
function textNodesIn(element: Element, skip = SKIP) {
  const nodes: Text[] = [], walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) if (!node.parentElement?.closest(skip)) nodes.push(node);
  return nodes;
}
function indexIn(element: Element, node: Text, offset: number) {
  let index = 0;
  for (const text of textNodesIn(element)) { if (text === node) return index + offset; index += text.length; }
  return -1;
}
function locate(element: Element, index: number) {
  let start = 0;
  for (const node of textNodesIn(element)) { if (index < start + node.length) return { node, offset: index - start }; start += node.length; }
  return null;
}
const centerOf = (rect: DOMRect) => ({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
const fontOf = (style: CSSStyleDeclaration, size = style.fontSize) => `${style.fontStyle} ${style.fontWeight} ${size} ${style.fontFamily}`;

/**
 * The globe bursts and pulls a share of every letter on the page into a zero-gravity swarm, wherever the page is scrolled.
 * The swarm floats in a loose zone around the pointer (or the viewport centre). The original text stays mounted; released characters are only masked.
 */
export async function startSwarm(root: Element, globe: HTMLElement, initial: GlyphSettings,
  options: { signal: AbortSignal; onFinish: () => void; keepClear: () => Element | null; palette: () => string[] }): Promise<GlyphSwarm> {
  const { Bodies, Body, Composite, Engine } = (await import("matter-js")).default;
  options.signal.throwIfAborted();
  let settings = initial;
  const engine = Engine.create({ positionIterations: 6, velocityIterations: 4 });
  engine.gravity.x = 0; engine.gravity.y = 0;
  const layer = document.createElement("div");
  layer.className = "glyph-swarm-layer"; layer.setAttribute("aria-hidden", "true");
  const highlight = typeof Highlight !== "undefined" && CSS.highlights ? new Highlight() : null;
  const highlightStyle = document.createElement("style");
  if (highlight) {
    // Next 16's CSS parser rejects this browser-supported pseudo-element in compiled CSS.
    highlightStyle.textContent = "::highlight(glyph-swarm-taken) { color: transparent; text-shadow: none; }";
    document.head.append(highlightStyle); CSS.highlights.set("glyph-swarm-taken", highlight);
  }

  // Transient UI loses random letters too, but these ranges never become sources or physics bodies.
  const maskedUI = new Map<Element, { choices: Map<number, boolean>; ranges: Range[] }>();
  const refreshUIMasks = () => {
    if (!highlight) return;
    for (const [element, mask] of maskedUI) {
      mask.ranges.forEach(range => highlight.delete(range));
      mask.ranges = [];
      if (!root.contains(element)) maskedUI.delete(element);
    }
    root.querySelectorAll(MASK_ONLY).forEach(element => {
      let mask = maskedUI.get(element);
      if (!mask) {
        mask = { choices: new Map(), ranges: [] };
        maskedUI.set(element, mask);
      }
      let position = 0;
      for (const node of textNodesIn(element, ".inspectable-label,.sr-only,script,style")) {
        for (let offset = 0; offset < node.length; offset++, position++) {
          if (!node.data[offset].trim()) continue;
          if (!mask.choices.has(position)) mask.choices.set(position, Math.random() < settings.amount);
          if (!mask.choices.get(position)) continue;
          const range = document.createRange();
          range.setStart(node, offset); range.setEnd(node, offset + 1);
          highlight.add(range); mask.ranges.push(range);
        }
      }
    });
    // Re-register after dynamic text changes so browsers invalidate the highlight's paint.
    CSS.highlights.set("glyph-swarm-taken", highlight);
  };

  // Every visible character on the page, on screen or not; a random share of them leaves for the swarm.
  const sources: Source[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
    const parent = node.parentElement;
    const box = parent && !parent.closest(SKIP) ? boxOf(parent) : null;
    if (!parent || !box || !shown(box)) continue;
    for (let offset = 0; offset < node.length; offset++) {
      if (!node.data[offset].trim()) continue;
      const range = document.createRange(); range.setStart(node, offset); range.setEnd(node, offset + 1);
      const rect = range.getClientRects()[0];
      if (rect && rect.width >= 1 && rect.height >= 1) sources.push({ node, offset, parent, range, rect, anchors: [], orphan: false });
    }
  }
  const origin = centerOf(globe.getBoundingClientRect());
  const count = swarmCount(sources.length, settings.amount);
  for (let index = 0; index < count; index++) {
    const pick = index + Math.floor(Math.random() * (sources.length - index));
    [sources[index], sources[pick]] = [sources[pick], sources[index]];
  }
  const distance = (source: Source) => Math.hypot(centerOf(source.rect).x - origin.x, centerOf(source.rect).y - origin.y);
  const chosen = sources.slice(0, count);
  for (const source of chosen) {
    for (let element: Element | null = source.parent, level = 0; element && level < ANCHOR_LEVELS && root.contains(element); element = element.parentElement, level++) {
      source.anchors.push({ element, index: indexIn(element, source.node, source.offset) });
    }
  }
  // Re-attaches a letter's mask after its text is re-rendered (hover scrambles, a new song, the clock). Returns the
  // character now at its place, or null when that place is gone.
  const resolve = (source: Source) => {
    for (const { element, index } of source.anchors) {
      if (!element.isConnected || index < 0) continue;
      const spot = locate(element, index);
      if (!spot) break;
      source.node = spot.node; source.offset = spot.offset; source.orphan = false;
      source.range.setStart(spot.node, spot.offset); source.range.setEnd(spot.node, spot.offset + 1);
      return spot.node.data[spot.offset];
    }
    source.orphan = true;
    source.range.setStart(document.body, 0); source.range.collapse(true);
    return null;
  };
  const farthest = chosen.reduce((max, source) => Math.max(max, distance(source)), 0);
  const queue = chosen.map(source => ({ source, at: releaseDelay(distance(source), farthest, RELEASE_SPREAD_MS * 0.4) + Math.random() * RELEASE_SPREAD_MS * 0.6 })).sort((a, b) => a.at - b.at);
  let queued = 0;

  // The viewport edges are the walls. The exit ring sits above the swarm rather than in it, so letters never pin beneath it.
  let walls: MatterJS.Body[] = [];
  const placeWalls = () => {
    Composite.remove(engine.world, walls);
    const w = window.innerWidth, h = window.innerHeight, t = 400;
    walls = [Bodies.rectangle(w / 2, -t / 2, w + t * 2, t), Bodies.rectangle(w / 2, h + t / 2, w + t * 2, t),
      Bodies.rectangle(-t / 2, h / 2, t, h + t * 2), Bodies.rectangle(w + t / 2, h / 2, t, h + t * 2)];
    walls.forEach(wall => Body.setStatic(wall, true));
    Composite.add(engine.world, walls);
  };
  placeWalls();

  const viewportCenter = () => ({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const spacing = () => SPACING * settings.spacing;
  // Globe letters count too, so the zone has room for everyone.
  const radius = () => zoneRadius(count + 22, spacing());
  // A mouse is still over the globe after the click. A tap has already lifted, so on touch the anchor eases to the centre.
  const anchor = { ...origin };
  let pointer: Point | null = window.matchMedia("(hover: hover)").matches ? { ...origin } : null;

  const glyphs: Glyph[] = [];
  const randomColor = () => { const colors = options.palette(); return colors[Math.floor(Math.random() * colors.length)]; };
  // Runs a letter's colour glitch: a quick flicker through palette colours (now and then its destination), then it settles.
  const tintStep = (glyph: Glyph, time: number) => {
    const tint = glyph.tint;
    if (!tint || time < tint.start) return;
    if (time >= tint.end) { glyph.element.style.color = tint.to; glyph.tint = undefined; return; }
    if (time - tint.flickAt < FLICKER_MS) return;
    tint.flickAt = time;
    glyph.element.style.color = Math.random() < 0.25 ? tint.to : randomColor();
  };
  const spawn = (character: string, rect: DOMRect, at: Point, font: string, color: string, velocity: Point, floatMs: number, source?: Source) => {
    const element = document.createElement("span"); element.className = "glyph-swarm-glyph"; element.textContent = character;
    element.style.cssText = `width:${rect.width}px;height:${rect.height}px;font:${font};line-height:${rect.height}px;color:${color}`;
    const body = Bodies.rectangle(at.x, at.y, Math.max(2, rect.width * 0.9), Math.max(2, rect.height * 0.72),
      { restitution: settings.bounce, friction: 0.05, frictionStatic: 0.2, frictionAir: AIR, slop: 0.02 });
    Body.setVelocity(body, velocity); Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.2);
    let patch: HTMLSpanElement | undefined;
    if (source && highlight) highlight.add(source.range);
    else if (source) {
      patch = document.createElement("span"); patch.className = "glyph-swarm-patch";
      let background: Element | null = source.parent, fill = "transparent";
      while (background && (fill === "transparent" || fill === "rgba(0, 0, 0, 0)")) { fill = getComputedStyle(background).backgroundColor; background = background.parentElement; }
      patch.style.backgroundColor = fill; layer.append(patch);
    }
    const glyph: Glyph = { element, body, source, patch, width: rect.width, height: rect.height, wander: Math.random() * Math.PI * 2,
      bornAt: performance.now(), floatMs, captureMs: 500 + Math.random() * 1000, pullScale: 0.55 + Math.random() * 0.9,
      orbit: Math.random() * Math.PI * 2, orbitSpeed: (Math.random() - 0.5) * 0.012, reach: Math.sqrt(Math.random()), departAt: 0, baseColor: color };
    // Page letters glitch into a random palette colour as the suction catches them.
    if (source) glyph.tint = { start: glyph.bornAt + floatMs, end: glyph.bornAt + floatMs + 300 + Math.random() * 450, to: randomColor(), flickAt: 0 };
    glyphs.push(glyph); layer.append(element); Composite.add(engine.world, body);
    return glyph;
  };
  // Each letter hops out of its text in its own direction, mostly up and away; letters entering at a screen edge hop inward.
  const pop = (at: Point) => {
    const w = window.innerWidth, h = window.innerHeight, edge = at.x <= 8 || at.y <= 8 || at.x >= w - 8 || at.y >= h - 8;
    const angle = edge ? Math.atan2(h / 2 - at.y, w / 2 - at.x) + (Math.random() - 0.5) * 1.4 : -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.3;
    const speed = 1.2 + Math.random() * 3;
    return { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed };
  };
  const release = (source: Source) => {
    const char = resolve(source);
    if (char === null || !char.trim()) return;
    const rect = source.range.getClientRects()[0];
    if (!rect || rect.width < 1) return;
    source.rect = rect;
    // Letters scrolled out of view stream in from the nearest edge.
    const at = entryPoint(centerOf(rect), window.innerWidth, window.innerHeight);
    const style = getComputedStyle(source.node.parentElement ?? source.parent);
    spawn(char, rect, at, fontOf(style), style.color, pop(at), 300 + Math.random() * 1300, source);
  };

  // The globe's own characters burst outward from its centre; the ones that form the exit ring stay behind.
  for (const char of globe.querySelectorAll<HTMLElement>(".glyph-globe-char:not([data-ring])")) {
    const rect = char.getBoundingClientRect();
    if (!rect.width || !char.textContent) continue;
    const style = getComputedStyle(char), scale = rect.height / (char.offsetHeight || rect.height);
    const at = centerOf(rect), dx = at.x - origin.x, dy = at.y - origin.y, length = Math.hypot(dx, dy) || 1, speed = 4 + Math.random() * 4;
    const glyph = spawn(char.textContent, rect, at, fontOf(style, `${parseFloat(style.fontSize) * scale}px`), style.color, { x: dx / length * speed, y: dy / length * speed - 2 }, 200 + Math.random() * 800);
    // Its place in the globe stays empty until it comes back.
    glyph.globeChar = char; char.dataset.away = "";
  }

  let phase: "loose" | "collapse" | "done" = "loose", removed = false;
  let last: Point | null = null, touchId: number | null = null, penId: number | null = null;
  const push = (from: Point, to: Point) => {
    if (phase !== "loose") return;
    for (const glyph of glyphs) {
      const impulse = pushImpulse(glyph.body.position, from, to, settings.push);
      if (!impulse.x && !impulse.y) continue;
      // Now and then a hit knocks the letter into a new colour with a quick glitch; not every hit, and never mid-glitch.
      const now = performance.now();
      if (now - (glyph.lastHitAt ?? -Infinity) > HIT_GAP_MS && !glyph.tint && Math.random() < HIT_RECOLOR_CHANCE) {
        glyph.tint = { start: now, end: now + 120 + Math.random() * 160, to: randomColor(), flickAt: 0 };
      }
      glyph.lastHitAt = now;
      Body.setVelocity(glyph.body, { x: Math.max(-16, Math.min(16, glyph.body.velocity.x + impulse.x)), y: Math.max(-16, Math.min(16, glyph.body.velocity.y + impulse.y)) });
      Body.setAngularVelocity(glyph.body, glyph.body.angularVelocity + impulse.x * 0.004);
    }
  };
  const excluded = (target: EventTarget | null) => (target as Element | null)?.closest?.(".glyph-exit,.palette-lab,.design-inspector,[role='menu']");
  const steer = (next: Point) => {
    if (last) push(last, next);
    pointer = last = next;
  };
  // Desktop: the cursor anchors the zone and its movement pushes. A pen drag does the same.
  const onDown = (event: PointerEvent) => {
    if (event.pointerType !== "pen" || excluded(event.target)) return;
    penId = event.pointerId; pointer = last = { x: event.clientX, y: event.clientY };
  };
  const onMove = (event: PointerEvent) => {
    if (event.pointerType === "mouse" || event.pointerId === penId) steer({ x: event.clientX, y: event.clientY });
  };
  const onUp = (event: PointerEvent) => { if (event.pointerId === penId) { penId = null; pointer = last = null; } };
  const onLeave = () => { if (touchId === null && penId === null) pointer = last = null; };
  // Touch: a moving finger is both the anchor and the push. These are touch events rather than pointer events,
  // because the page stays scrollable: browsers cancel a pointer once it starts scrolling the page, but keep
  // reporting touch moves, so a vertical scroll still sweeps through the swarm. Each touch is read once, on its
  // first move (see touchIntent): play holds the page still for the whole touch, so drawing circles through the
  // letters doesn't scroll; a flick, or a vertical drag from open space, scrolls as usual.
  let gesture: "pending" | "play" | "scroll" = "pending", touchStart: Point = { x: 0, y: 0 }, touchStartedAt = 0, touchOnSwarm = false;
  const touchOf = (event: TouchEvent) => Array.from(event.changedTouches).find(touch => touch.identifier === touchId);
  const onTouchStart = (event: TouchEvent) => {
    const touch = event.changedTouches[0];
    if (touchId !== null || !touch || excluded(touch.target)) return;
    touchId = touch.identifier; pointer = last = touchStart = { x: touch.clientX, y: touch.clientY };
    touchStartedAt = event.timeStamp; gesture = "pending";
    touchOnSwarm = glyphs.some(glyph => !glyph.flight && Math.hypot(glyph.body.position.x - touch.clientX, glyph.body.position.y - touch.clientY) < 28);
  };
  const onTouchMove = (event: TouchEvent) => {
    const touch = touchOf(event);
    if (!touch) return;
    const next = { x: touch.clientX, y: touch.clientY };
    if (gesture === "pending" && (next.x !== touchStart.x || next.y !== touchStart.y)) {
      gesture = touchIntent({ delta: { x: next.x - touchStart.x, y: next.y - touchStart.y }, elapsedMs: event.timeStamp - touchStartedAt, onSwarm: touchOnSwarm });
    }
    // Only cancellable before the browser starts scrolling, which is why the decision comes on the first move.
    if (gesture === "play" && event.cancelable) event.preventDefault();
    steer(next);
  };
  const onTouchEnd = (event: TouchEvent) => { if (touchOf(event)) { touchId = null; pointer = last = null; gesture = "pending"; } };
  const preventSelection = (event: Event) => event.preventDefault();
  window.addEventListener("pointerdown", onDown, { capture: true });
  window.addEventListener("pointermove", onMove, { capture: true });
  window.addEventListener("pointerup", onUp); window.addEventListener("pointercancel", onUp);
  document.documentElement.addEventListener("pointerleave", onLeave);
  window.addEventListener("touchstart", onTouchStart, { capture: true, passive: true });
  // Not passive: a play gesture cancels the scroll.
  window.addEventListener("touchmove", onTouchMove, { capture: true, passive: false });
  window.addEventListener("touchend", onTouchEnd, { passive: true }); window.addEventListener("touchcancel", onTouchEnd, { passive: true });
  document.addEventListener("selectstart", preventSelection);
  let patchesStale = true;
  const onScroll = () => { patchesStale = true; };
  const onResize = () => {
    placeWalls(); patchesStale = true;
    for (const glyph of glyphs) {
      const { x, y } = glyph.body.position;
      Body.setPosition(glyph.body, { x: Math.max(8, Math.min(window.innerWidth - 8, x)), y: Math.max(8, Math.min(window.innerHeight - 8, y)) });
    }
  };
  window.addEventListener("scroll", onScroll, { passive: true }); window.addEventListener("resize", onResize);
  document.body.append(layer);

  // Letters still in the physics world: everything except those already gliding home.
  const floating = () => glyphs.filter(glyph => !glyph.flight);
  // Neighbour spacing on a coarse grid: each letter only checks the cells around it.
  const cells = new Map<number, Glyph[]>();
  const separate = (members: Glyph[], gap: number) => {
    cells.clear();
    const key = (cx: number, cy: number) => cx * 4096 + cy;
    for (const glyph of members) {
      const k = key(Math.floor(glyph.body.position.x / gap), Math.floor(glyph.body.position.y / gap));
      const cell = cells.get(k);
      if (cell) cell.push(glyph); else cells.set(k, [glyph]);
    }
    for (const glyph of members) {
      const { position, mass } = glyph.body, cx = Math.floor(position.x / gap), cy = Math.floor(position.y / gap);
      let fx = 0, fy = 0;
      for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) {
        for (const other of cells.get(key(cx + ox, cy + oy)) ?? []) {
          if (other === glyph) continue;
          const force = separationForce(position.x - other.body.position.x, position.y - other.body.position.y, gap);
          fx += force.x; fy += force.y;
        }
      }
      if (fx || fy) Body.applyForce(glyph.body, position, { x: fx * mass, y: fy * mass });
    }
  };

  let landing: Promise<void> | null = null, finishLanding = () => {}, collapseStartedAt = 0;
  const land = (glyph: Glyph) => {
    glyph.landed = true; glyph.element.remove(); glyph.patch?.remove();
    if (glyph.source && highlight) highlight.delete(glyph.source.range);
    // A globe letter brings home whatever colour it ended up with.
    if (glyph.globeChar) { delete glyph.globeChar.dataset.away; glyph.globeChar.style.color = glyph.element.style.color; }
  };
  // Exit, mirroring the entry: once a letter lets go, it rides a critically damped spring at its own speed toward a
  // spot just off its slot, still tilted and turning, so nothing lines up early. The spring starts from the letter's
  // current velocity, so letting go has no jolt. Near that spot it settles the last few pixels on its own short ease,
  // turning upright as it slides in, and reappears in its text.
  // Where a returning letter goes: its place in the text as it reads now, measured live so a re-rendered or scrolled
  // line is still met exactly. Globe letters, and letters whose place no longer exists, sink into the globe or the end
  // of their line and fade instead of settling.
  const homeOf = (glyph: Glyph, globeCenter: Point): { point: Point; settles: boolean } => {
    if (glyph.globeChar) return { point: centerOf(glyph.globeChar.getBoundingClientRect()), settles: true };
    const source = glyph.source;
    // A place that is now a space (a different song) has no letter to settle into.
    const rect = source && !source.orphan && source.range.toString().trim() ? source.range.getClientRects()[0] : undefined;
    if (rect) return { point: centerOf(rect), settles: true };
    const line = source?.anchors.find(anchor => anchor.element.isConnected)?.element.getBoundingClientRect();
    return { point: line ? { x: line.right, y: line.top + line.height / 2 } : globeCenter, settles: false };
  };
  const fly = (time: number, dt: number) => {
    const elapsed = time - collapseStartedAt, globeCenter = centerOf(globe.getBoundingClientRect());
    for (const glyph of glyphs) {
      if (glyph.flight || glyph.landed || elapsed < glyph.departAt) continue;
      const { position, velocity, angle, angularVelocity } = glyph.body;
      glyph.flight = { x: position.x, y: position.y, vx: velocity.x * 60, vy: velocity.y * 60, angle, spin: angularVelocity * 60,
        omega: 3.5 + Math.random() * 5, offset: { x: (Math.random() - 0.5) * 10, y: -(2 + Math.random() * 8) },
        tilt: (Math.random() - 0.5) * 0.6, upright: Math.round(angle / (Math.PI * 2)) * Math.PI * 2 };
      Composite.remove(engine.world, glyph.body);
    }
    let remaining = 0;
    for (const glyph of glyphs) {
      const flight = glyph.flight;
      if (glyph.landed) continue;
      remaining++;
      if (!flight) continue;
      if (elapsed > LANDING_TIMEOUT_MS) { land(glyph); remaining--; continue; }
      const { point: home, settles } = homeOf(glyph, globeCenter);
      if (flight.settle) {
        const t = Math.min(1, (time - flight.settle.at) / flight.settle.duration), ease = 1 - Math.pow(1 - t, 3);
        flight.x = flight.settle.x + (home.x - flight.settle.x) * ease;
        flight.y = flight.settle.y + (home.y - flight.settle.y) * ease;
        flight.angle = flight.settle.angle + (flight.upright - flight.settle.angle) * ease;
        if (t >= 1) { land(glyph); remaining--; continue; }
      } else {
        const aim = settles && !glyph.globeChar ? { x: home.x + flight.offset.x, y: home.y + flight.offset.y } : home;
        const x = springStep(flight.x, flight.vx, aim.x, flight.omega, dt), y = springStep(flight.y, flight.vy, aim.y, flight.omega, dt);
        // The turn lags the travel, so letters are still rotating as they arrive.
        const turn = springStep(flight.angle, flight.spin, flight.upright + (settles && !glyph.globeChar ? flight.tilt : 0), flight.omega * 0.7, dt);
        Object.assign(flight, { x: x.position, vx: x.velocity, y: y.position, vy: y.velocity, angle: turn.position, spin: turn.velocity });
        const away = Math.hypot(aim.x - flight.x, aim.y - flight.y);
        if (!settles && away < GLOBE_LANDING_PX) { land(glyph); remaining--; continue; }
        if (settles && away < 2.5) flight.settle = { at: time, duration: 250 + Math.random() * 400, x: flight.x, y: flight.y, angle: flight.angle };
      }
      // Letters with no place to settle shrink and fade as they sink in. A globe letter settles into its spot's
      // depth-shaded opacity, so the spot takes over without a step.
      const fade = settles || flight.settle ? 1 : Math.min(1, Math.hypot(home.x - flight.x, home.y - flight.y) / 60);
      const shade = glyph.globeChar && flight.settle ? 1 + (Number(glyph.globeChar.style.opacity || 1) - 1) * Math.min(1, (time - flight.settle.at) / flight.settle.duration) : fade;
      glyph.element.style.transform = `translate(${flight.x - glyph.width / 2}px,${flight.y - glyph.height / 2}px) rotate(${flight.angle}rad) scale(${0.4 + 0.6 * fade})`;
      glyph.element.style.opacity = String(shade);
    }
    if (!remaining) finishLanding();
  };

  // Any re-render of the page's text (a label rewriting itself on hover, a new song, the clock) re-attaches the masks.
  // The observer runs right after the change and before the browser paints, so the original letter never flashes back.
  let morphing = false;
  const reattach = (time: number) => {
    morphing = false; patchesStale = true;
    refreshUIMasks();
    for (const glyph of glyphs) {
      const source = glyph.source;
      if (!source || glyph.landed || glyph.flight?.settle) continue;
      const char = resolve(source);
      if (char === null || !char.trim() || char === glyph.element.textContent) { source.pending = undefined; continue; }
      // Settled text renames the floating letter; a scramble passing through does not.
      if (source.pending?.char !== char) source.pending = { char, at: time };
      if (time - source.pending.at >= MORPH_AFTER_MS) { glyph.element.textContent = char; source.pending = undefined; } else morphing = true;
    }
  };
  refreshUIMasks();
  const textObserver = new MutationObserver(() => reattach(performance.now()));
  textObserver.observe(root, { subtree: true, childList: true, characterData: true });

  const startedAt = performance.now();
  let frame = 0, previousTime = startedAt, pending = 0;
  const render = (time: number) => {
    const dt = Math.min(64, time - previousTime) / 1000;
    pending = Math.min(pending + time - previousTime, STEP * 4); previousTime = time;
    const elapsed = time - startedAt, loose = phase === "loose";
    while (loose && queued < queue.length && queue[queued].at <= elapsed) release(queue[queued++].source);
    // The anchor trails the pointer lazily and never quite sits still, so the cloud sways rather than snapping into place.
    const target = pointer ?? viewportCenter();
    const goal = { x: target.x + Math.sin(time * 0.00071) * 24, y: target.y + Math.cos(time * 0.00053) * 18 };
    const zone = radius(), gap = spacing(), members = floating();
    // Letters drift out of the exit ring's way so it always reads, wherever the swarm is.
    const clearBox = options.keepClear()?.getBoundingClientRect();
    const clear = clearBox?.width ? { center: centerOf(clearBox), radius: Math.max(clearBox.width, clearBox.height) / 2 + 18 } : null;
    while (pending >= STEP) {
      anchor.x += (goal.x - anchor.x) * 0.035; anchor.y += (goal.y - anchor.y) * 0.035;
      for (const glyph of members) {
        const { body } = glyph;
        glyph.wander += (Math.random() - 0.5) * 0.3;
        glyph.orbit += glyph.orbitSpeed;
        // Until its pull fades in (and again while letting go on exit), a letter only drifts, a little more than usual.
        // Once caught, a brief suction carries it across the screen before it relaxes into the cloud.
        const capture = loose ? captureStrength(time - glyph.bornAt, glyph.floatMs, glyph.captureMs) : 0, caught = Math.min(1, capture);
        const drift = wanderForce(glyph.wander, settings.drift * (1 + 1.5 * (1 - caught)));
        let fx = drift.x, fy = drift.y;
        if (clear) {
          const away = pocketForce({ x: body.position.x - clear.center.x, y: body.position.y - clear.center.y }, clear.radius);
          fx += away.x * 6; fy += away.y * 6;
        }
        if (capture > 0) {
          const reach = glyph.reach * zone * 0.45;
          const spot = { x: anchor.x + Math.cos(glyph.orbit) * reach, y: anchor.y + Math.sin(glyph.orbit) * reach };
          const pull = zoneForce({ x: spot.x - body.position.x, y: spot.y - body.position.y }, zone * 0.6, settings.pull * glyph.pullScale);
          const pocket = pointer ? pocketForce({ x: body.position.x - pointer.x, y: body.position.y - pointer.y }) : { x: 0, y: 0 };
          fx += pull.x * capture + pocket.x * caught; fy += pull.y * capture + pocket.y * caught;
        }
        Body.applyForce(body, body.position, { x: fx * body.mass, y: fy * body.mass });
      }
      separate(members, gap);
      Engine.update(engine, STEP); pending -= STEP;
    }
    if (morphing) reattach(time);
    if (!loose) fly(time, dt);
    for (const glyph of glyphs) if (glyph.tint && !glyph.landed) tintStep(glyph, time);
    for (const glyph of glyphs) {
      if (glyph.landed) continue;
      if (!glyph.flight) {
        const { x, y } = glyph.body.position;
        glyph.element.style.transform = `translate(${x - glyph.width / 2}px,${y - glyph.height / 2}px) rotate(${glyph.body.angle}rad)`;
      }
      if (glyph.patch && patchesStale) {
        const box = glyph.source!.range.getClientRects()[0];
        Object.assign(glyph.patch.style, box ? { left: `${box.left}px`, top: `${box.top}px`, width: `${box.width}px`, height: `${box.height}px` } : { width: "0", height: "0" });
      }
    }
    patchesStale = false;
    if (phase !== "done") frame = requestAnimationFrame(render);
  };
  frame = requestAnimationFrame(render);

  const unlisten = () => {
    window.removeEventListener("pointerdown", onDown, true); window.removeEventListener("pointermove", onMove, true);
    window.removeEventListener("pointerup", onUp); window.removeEventListener("pointercancel", onUp);
    document.documentElement.removeEventListener("pointerleave", onLeave);
    window.removeEventListener("touchstart", onTouchStart, true); window.removeEventListener("touchmove", onTouchMove, true);
    window.removeEventListener("touchend", onTouchEnd); window.removeEventListener("touchcancel", onTouchEnd);
    window.removeEventListener("resize", onResize);
  };
  const cleanup = () => {
    if (removed) return;
    removed = true; phase = "done"; cancelAnimationFrame(frame); unlisten(); Engine.clear(engine); textObserver.disconnect();
    window.removeEventListener("scroll", onScroll);
    maskedUI.clear();
    if (highlight) CSS.highlights.delete("glyph-swarm-taken");
    highlightStyle.remove(); layer.remove();
    globe.querySelectorAll<HTMLElement>("[data-away]").forEach(char => { delete char.dataset.away; });
    document.removeEventListener("selectstart", preventSelection);
    options.signal.removeEventListener("abort", cleanup); finishLanding(); options.onFinish();
  };
  options.signal.addEventListener("abort", cleanup, { once: true });

  return {
    isActive: () => phase === "loose",
    update(next) { settings = next; glyphs.forEach(glyph => { glyph.body.restitution = next.bounce; }); },
    cancel: cleanup,
    collapse() {
      if (phase !== "loose") return landing ?? Promise.resolve();
      // Letters not yet released simply stay in their text.
      phase = "collapse"; queued = queue.length; collapseStartedAt = performance.now();
      unlisten(); pointer = null;
      // Each letter loosens with a small nudge, floats free for its own moment, then turns for home.
      for (const glyph of glyphs) {
        // Globe letters left first on entry, so they come home last, alongside the ring folding back.
        glyph.departAt = glyph.globeChar ? LET_GO_MS * 0.8 + Math.random() * LET_GO_MS * 0.5 : Math.random() * LET_GO_MS;
        // Page letters glitch back to their own colour as they turn for home, well before they land.
        if (glyph.source) {
          const start = collapseStartedAt + glyph.departAt;
          glyph.tint = { start, end: start + 300 + Math.random() * 400, to: glyph.baseColor, flickAt: 0 };
        }
        const angle = Math.random() * Math.PI * 2, nudge = 0.5 + Math.random() * 1.5;
        Body.setVelocity(glyph.body, { x: glyph.body.velocity.x + Math.cos(angle) * nudge, y: glyph.body.velocity.y + Math.sin(angle) * nudge });
      }
      landing = new Promise<void>(resolve => { finishLanding = resolve; }).then(cleanup);
      return landing;
    },
  };
}
