import type MatterJS from "matter-js";
import { SPACING, entryPoint, pushImpulse, releaseDelay, separationForce, springStep, swarmCount, wanderForce, zoneForce, zoneRadius } from "@/lib/glyph-physics";
import type { Point } from "@/lib/glyph-physics";
import type { GlyphSettings } from "@/lib/palette-toy";

const SKIP = ".glyph-globe,.glyph-esc,.homepage-project-tooltip,.design-inspector,.spacing-overlay,.palette-lab,.inspectable-label,.sr-only,.homepage-track-time-reserve,[role='menu'],script,style";
const STEP = 1000 / 60;
const AIR = 0.035;
/** How long the swarm gathers at Esc before the letters glide home. Esc's own letters leave for the globe at the same moment. */
export const GATHER_MS = 300;
const HOMEWARD_STAGGER_MS = 220;
const LANDING_TIMEOUT_MS = 3200;

interface Source { node: Text; offset: number; parent: HTMLElement; range: Range; rect: DOMRect; home: Point }
interface Flight { x: number; y: number; vx: number; vy: number; angle: number; spin: number; gather: Point; homewardAt: number }
interface Glyph {
  element: HTMLSpanElement;
  body: MatterJS.Body;
  /** Page letters return to their text; globe letters return to the globe. */
  source?: Source;
  patch?: HTMLSpanElement;
  width: number;
  height: number;
  wander: number;
  flight?: Flight;
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
const centerOf = (rect: DOMRect) => ({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
const fontOf = (style: CSSStyleDeclaration, size = style.fontSize) => `${style.fontStyle} ${style.fontWeight} ${size} ${style.fontFamily}`;

/**
 * The globe bursts and pulls a share of every letter on the page into a zero-gravity swarm, wherever the page is scrolled.
 * The swarm floats in a loose zone around the pointer (or the viewport centre). The original text stays mounted; released characters are only masked.
 */
export async function startSwarm(root: Element, globe: HTMLElement, initial: GlyphSettings,
  options: { signal: AbortSignal; onFinish: () => void; exit: () => Element | null }): Promise<GlyphSwarm> {
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
      if (rect && rect.width >= 1 && rect.height >= 1) sources.push({ node, offset, parent, range, rect, home: { x: rect.left + window.scrollX, y: rect.top + window.scrollY } });
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
  const farthest = chosen.reduce((max, source) => Math.max(max, distance(source)), 0);
  const queue = chosen.map(source => ({ source, at: releaseDelay(distance(source), farthest) + Math.random() * 60 })).sort((a, b) => a.at - b.at);
  let queued = 0;

  // The viewport edges are the walls. Esc sits above the swarm rather than in it, so letters never pin beneath it.
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
  const spawn = (character: string, rect: DOMRect, at: Point, font: string, color: string, velocity: Point, source?: Source) => {
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
    const glyph: Glyph = { element, body, source, patch, width: rect.width, height: rect.height, wander: Math.random() * Math.PI * 2 };
    glyphs.push(glyph); layer.append(element); Composite.add(engine.world, body);
    return glyph;
  };
  // Each letter is thrown at its own spot inside the zone, hard enough to glide there and stop: drag over n steps sums to v / AIR.
  const throwToward = (from: Point) => {
    const angle = Math.random() * Math.PI * 2, reach = Math.sqrt(Math.random()) * radius() * 0.8;
    const dx = anchor.x + Math.cos(angle) * reach - from.x, dy = anchor.y + Math.sin(angle) * reach - from.y;
    const length = Math.hypot(dx, dy) || 1, speed = Math.max(3, Math.min(22, length * AIR * 1.1));
    return { x: dx / length * speed, y: dy / length * speed };
  };
  const release = (source: Source) => {
    const { node, offset, parent, range } = source;
    if (!node.isConnected || node.length <= offset) return;
    range.setStart(node, offset); range.setEnd(node, offset + 1);
    const rect = range.getClientRects()[0];
    if (!rect || rect.width < 1) return;
    source.rect = rect; source.home = { x: rect.left + window.scrollX, y: rect.top + window.scrollY };
    // Letters scrolled out of view stream in from the nearest edge.
    const at = entryPoint(centerOf(rect), window.innerWidth, window.innerHeight);
    const style = getComputedStyle(parent);
    spawn(node.data[offset], rect, at, fontOf(style), style.color, throwToward(at), source);
  };

  // The globe's own characters burst outward from its centre. Esc's three letters are animated by the component.
  for (const char of globe.querySelectorAll<HTMLElement>(".glyph-globe-char:not([data-esc])")) {
    const rect = char.getBoundingClientRect();
    if (!rect.width || !char.textContent) continue;
    const style = getComputedStyle(char), scale = rect.height / (char.offsetHeight || rect.height);
    const at = centerOf(rect), dx = at.x - origin.x, dy = at.y - origin.y, length = Math.hypot(dx, dy) || 1, speed = 4 + Math.random() * 4;
    spawn(char.textContent, rect, at, fontOf(style, `${parseFloat(style.fontSize) * scale}px`), style.color, { x: dx / length * speed, y: dy / length * speed - 2 });
  }

  let phase: "loose" | "collapse" | "done" = "loose", removed = false;
  let last: Point | null = null, touchId: number | null = null;
  const push = (from: Point, to: Point) => {
    if (phase !== "loose") return;
    for (const glyph of glyphs) {
      const impulse = pushImpulse(glyph.body.position, from, to, settings.push);
      if (!impulse.x && !impulse.y) continue;
      Body.setVelocity(glyph.body, { x: Math.max(-16, Math.min(16, glyph.body.velocity.x + impulse.x)), y: Math.max(-16, Math.min(16, glyph.body.velocity.y + impulse.y)) });
      Body.setAngularVelocity(glyph.body, glyph.body.angularVelocity + impulse.x * 0.004);
    }
  };
  const excluded = (event: PointerEvent) => (event.target as Element | null)?.closest?.(".glyph-esc,.palette-lab,.design-inspector,[role='menu']");
  // Desktop: the cursor anchors the zone and its movement pushes. Touch: a dragging finger is both.
  const onDown = (event: PointerEvent) => {
    if (event.pointerType === "mouse" || excluded(event)) return;
    touchId = event.pointerId; pointer = last = { x: event.clientX, y: event.clientY };
  };
  const onMove = (event: PointerEvent) => {
    if (event.pointerType !== "mouse" && event.pointerId !== touchId) return;
    const next = { x: event.clientX, y: event.clientY };
    if (last) push(last, next);
    pointer = last = next;
  };
  const onUp = (event: PointerEvent) => { if (event.pointerId === touchId) { touchId = null; pointer = last = null; } };
  const onLeave = () => { if (touchId === null) pointer = last = null; };
  const preventSelection = (event: Event) => event.preventDefault();
  window.addEventListener("pointerdown", onDown, { capture: true });
  window.addEventListener("pointermove", onMove, { capture: true });
  window.addEventListener("pointerup", onUp); window.addEventListener("pointercancel", onUp);
  document.documentElement.addEventListener("pointerleave", onLeave);
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
  document.documentElement.classList.add("is-glyph-swarm");

  // Neighbour spacing on a coarse grid: each letter only checks the cells around it.
  const cells = new Map<number, Glyph[]>();
  const separate = (gap: number) => {
    cells.clear();
    const key = (cx: number, cy: number) => cx * 4096 + cy;
    for (const glyph of glyphs) {
      const k = key(Math.floor(glyph.body.position.x / gap), Math.floor(glyph.body.position.y / gap));
      const cell = cells.get(k);
      if (cell) cell.push(glyph); else cells.set(k, [glyph]);
    }
    for (const glyph of glyphs) {
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
  };
  // Exit: every letter rides a critically damped spring, first toward Esc, then home. Retargeting a spring keeps
  // its velocity, so the gather and the return read as one continuous glide; each letter reappears in its text as it lands.
  const fly = (time: number, dt: number) => {
    const elapsed = time - collapseStartedAt, globeBox = globe.getBoundingClientRect(), globeCenter = centerOf(globeBox);
    let flying = 0;
    for (const glyph of glyphs) {
      const flight = glyph.flight;
      if (!flight || glyph.landed) continue;
      const homeward = elapsed >= flight.homewardAt;
      const target = !homeward ? flight.gather
        : glyph.source ? { x: glyph.source.home.x - window.scrollX + glyph.width / 2, y: glyph.source.home.y - window.scrollY + glyph.height / 2 } : globeCenter;
      const omega = homeward ? 10 : 14;
      const x = springStep(flight.x, flight.vx, target.x, omega, dt), y = springStep(flight.y, flight.vy, target.y, omega, dt);
      const spinTarget = homeward ? Math.round(flight.angle / (Math.PI * 2)) * Math.PI * 2 : flight.angle;
      const turn = springStep(flight.angle, flight.spin, spinTarget, homeward ? 12 : 4, dt);
      Object.assign(flight, { x: x.position, vx: x.velocity, y: y.position, vy: y.velocity, angle: turn.position, spin: turn.velocity });
      const away = Math.hypot(target.x - flight.x, target.y - flight.y);
      if (homeward && (elapsed > LANDING_TIMEOUT_MS || (away < 0.5 && Math.hypot(flight.vx, flight.vy) < 20))) { land(glyph); continue; }
      flying++;
      // Globe letters shrink and fade as they sink back into it.
      const fade = glyph.source || !homeward ? 1 : Math.min(1, away / 60);
      glyph.element.style.transform = `translate(${flight.x - glyph.width / 2}px,${flight.y - glyph.height / 2}px) rotate(${flight.angle}rad) scale(${0.4 + 0.6 * fade})`;
      glyph.element.style.opacity = String(fade);
      if (glyph.patch && patchesStale) {
        const box = glyph.source!.range.getClientRects()[0];
        Object.assign(glyph.patch.style, box ? { left: `${box.left}px`, top: `${box.top}px`, width: `${box.width}px`, height: `${box.height}px` } : { width: "0", height: "0" });
      }
    }
    patchesStale = false;
    if (!flying) finishLanding();
  };

  const startedAt = performance.now();
  let frame = 0, previousTime = startedAt, pending = 0;
  const render = (time: number) => {
    const dt = Math.min(64, time - previousTime) / 1000;
    pending = Math.min(pending + time - previousTime, STEP * 4); previousTime = time;
    if (phase === "collapse") { fly(time, dt); frame = requestAnimationFrame(render); return; }
    const elapsed = time - startedAt;
    while (queued < queue.length && queue[queued].at <= elapsed) release(queue[queued++].source);
    const goal = pointer ?? viewportCenter(), zone = radius(), gap = spacing();
    while (pending >= STEP) {
      anchor.x += (goal.x - anchor.x) * 0.08; anchor.y += (goal.y - anchor.y) * 0.08;
      for (const glyph of glyphs) {
        const { body } = glyph;
        const pull = zoneForce({ x: anchor.x - body.position.x, y: anchor.y - body.position.y }, zone, settings.pull);
        glyph.wander += (Math.random() - 0.5) * 0.3;
        const drift = wanderForce(glyph.wander, settings.drift);
        Body.applyForce(body, body.position, { x: (pull.x + drift.x) * body.mass, y: (pull.y + drift.y) * body.mass });
      }
      separate(gap);
      Engine.update(engine, STEP); pending -= STEP;
    }
    for (const glyph of glyphs) {
      const { x, y } = glyph.body.position;
      glyph.element.style.transform = `translate(${x - glyph.width / 2}px,${y - glyph.height / 2}px) rotate(${glyph.body.angle}rad)`;
      if (glyph.patch && patchesStale) {
        const box = glyph.source!.range.getClientRects()[0];
        Object.assign(glyph.patch.style, box ? { left: `${box.left}px`, top: `${box.top}px`, width: `${box.width}px`, height: `${box.height}px` } : { width: "0", height: "0" });
      }
    }
    patchesStale = false;
    frame = requestAnimationFrame(render);
  };
  frame = requestAnimationFrame(render);

  const unlisten = () => {
    window.removeEventListener("pointerdown", onDown, true); window.removeEventListener("pointermove", onMove, true);
    window.removeEventListener("pointerup", onUp); window.removeEventListener("pointercancel", onUp);
    document.documentElement.removeEventListener("pointerleave", onLeave);
    window.removeEventListener("resize", onResize);
  };
  const cleanup = () => {
    if (removed) return;
    removed = true; phase = "done"; cancelAnimationFrame(frame); unlisten(); Engine.clear(engine);
    window.removeEventListener("scroll", onScroll);
    if (highlight) CSS.highlights.delete("glyph-swarm-taken");
    highlightStyle.remove(); layer.remove();
    document.removeEventListener("selectstart", preventSelection);
    document.documentElement.classList.remove("is-glyph-swarm");
    options.signal.removeEventListener("abort", cleanup); finishLanding(); options.onFinish();
  };
  options.signal.addEventListener("abort", cleanup, { once: true });

  return {
    isActive: () => phase === "loose",
    update(next) { settings = next; glyphs.forEach(glyph => { glyph.body.restitution = next.bounce; }); },
    cancel: cleanup,
    collapse() {
      if (phase !== "loose") return landing ?? Promise.resolve();
      phase = "collapse"; queued = queue.length; collapseStartedAt = performance.now();
      unlisten(); Engine.clear(engine);
      document.documentElement.classList.remove("is-glyph-swarm");
      const exit = options.exit()?.getBoundingClientRect(), center = exit?.width ? centerOf(exit) : viewportCenter();
      for (const glyph of glyphs) {
        const { position, velocity, angle, angularVelocity } = glyph.body;
        // A loose knot around Esc, not a single point; letters turn for home at slightly different moments.
        const knot = Math.random() * Math.PI * 2, spread = Math.sqrt(Math.random()) * 34;
        glyph.flight = { x: position.x, y: position.y, vx: velocity.x * 60, vy: velocity.y * 60, angle, spin: angularVelocity * 60,
          gather: { x: center.x + Math.cos(knot) * spread, y: center.y + Math.sin(knot) * spread * 0.6 },
          homewardAt: GATHER_MS + Math.random() * HOMEWARD_STAGGER_MS };
      }
      landing = new Promise<void>(resolve => { finishLanding = resolve; }).then(cleanup);
      return landing;
    },
  };
}
