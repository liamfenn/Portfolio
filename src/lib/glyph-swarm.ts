import type MatterJS from "matter-js";
import { anchorPull, pushImpulse, releaseDelay, swarmCount, wanderForce } from "@/lib/glyph-physics";
import type { Point } from "@/lib/glyph-physics";
import type { GlyphSettings } from "@/lib/palette-toy";

const SKIP = ".glyph-globe,.glyph-esc,.homepage-project-tooltip,.design-inspector,.spacing-overlay,.palette-lab,.inspectable-label,.sr-only,.homepage-track-time-reserve,[role='menu'],script,style";
const STEP = 1000 / 60;
const AIR = 0.035;
/** How long the swarm takes to ball up at Esc before the letters fly home. */
export const COLLAPSE_MS = 700;
const FLIGHT_MS = 800;

interface Source { node: Text; offset: number; parent: HTMLElement; range: Range; rect: DOMRect }
interface Glyph {
  element: HTMLSpanElement;
  body: MatterJS.Body;
  /** Page letters return to their text; globe letters return to the globe. */
  source?: Source;
  patch?: HTMLSpanElement;
  width: number;
  height: number;
  wander: number;
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
const onScreen = (rect: DOMRect) => rect.width >= 1 && rect.height >= 1 && rect.bottom > 0 && rect.right > 0 && rect.top < window.innerHeight && rect.left < window.innerWidth;
const centerOf = (rect: DOMRect) => ({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
const fontOf = (style: CSSStyleDeclaration, size = style.fontSize) => `${style.fontStyle} ${style.fontWeight} ${size} ${style.fontFamily}`;

/**
 * The globe bursts and pulls a share of the on-screen letters into a zero-gravity swarm.
 * The pointer (or the viewport centre) is the swarm's gravity. The original text stays mounted; released characters are only masked.
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

  // Every character currently on screen; a random share of them leaves for the swarm.
  const sources: Source[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
    const parent = node.parentElement;
    const box = parent && !parent.closest(SKIP) ? boxOf(parent) : null;
    if (!parent || !box || !onScreen(box.getBoundingClientRect()) || !shown(box)) continue;
    for (let offset = 0; offset < node.length; offset++) {
      if (!node.data[offset].trim()) continue;
      const range = document.createRange(); range.setStart(node, offset); range.setEnd(node, offset + 1);
      const rect = range.getClientRects()[0];
      if (rect && onScreen(rect)) sources.push({ node, offset, parent, range, rect });
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
  const queue = chosen.map(source => ({ source, at: releaseDelay(distance(source), farthest) + Math.random() * 90 })).sort((a, b) => a.at - b.at);
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
  const glyphs: Glyph[] = [];
  const spawn = (character: string, rect: DOMRect, font: string, color: string, velocity: Point, source?: Source) => {
    const element = document.createElement("span"); element.className = "glyph-swarm-glyph"; element.textContent = character;
    element.style.cssText = `width:${rect.width}px;height:${rect.height}px;font:${font};line-height:${rect.height}px;color:${color}`;
    const { x, y } = centerOf(rect);
    const body = Bodies.rectangle(x, y, Math.max(2, rect.width * 0.9), Math.max(2, rect.height * 0.72),
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
    glyphs.push({ element, body, source, patch, width: rect.width, height: rect.height, wander: Math.random() * Math.PI * 2 });
    layer.append(element); Composite.add(engine.world, body);
  };
  const release = (source: Source) => {
    const { node, offset, parent, range } = source;
    if (!node.isConnected || node.length <= offset) return;
    range.setStart(node, offset); range.setEnd(node, offset + 1);
    const rect = range.getClientRects()[0];
    if (!rect || rect.width < 1) return;
    source.rect = rect;
    const style = getComputedStyle(parent), { x, y } = centerOf(rect);
    const dx = anchor.x - x, dy = anchor.y - y, length = Math.hypot(dx, dy) || 1, speed = 1.5 + Math.random() * 2.5;
    spawn(node.data[offset], rect, fontOf(style), style.color, { x: dx / length * speed, y: dy / length * speed }, source);
  };

  // The globe's own characters burst outward from its centre. Esc's three letters are animated by the component.
  for (const char of globe.querySelectorAll<HTMLElement>(".glyph-globe-char:not([data-esc])")) {
    const rect = char.getBoundingClientRect();
    if (!rect.width || !char.textContent) continue;
    const style = getComputedStyle(char), scale = rect.height / (char.offsetHeight || rect.height);
    const { x, y } = centerOf(rect), dx = x - origin.x, dy = y - origin.y, length = Math.hypot(dx, dy) || 1, speed = 4 + Math.random() * 4;
    spawn(char.textContent, rect, fontOf(style, `${parseFloat(style.fontSize) * scale}px`), style.color, { x: dx / length * speed, y: dy / length * speed - 2 });
  }

  const viewportCenter = () => ({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  let phase: "loose" | "collapse" | "done" = "loose", removed = false;
  // A mouse is still over the globe after the click. A tap has already lifted, so on touch the anchor eases to the centre.
  const anchor = { ...origin };
  let pointer: Point | null = window.matchMedia("(hover: hover)").matches ? { ...origin } : null, last: Point | null = null, touchId: number | null = null, collapseTarget: Point | null = null;
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
  // Desktop: the cursor is the magnet and its movement pushes. Touch: a dragging finger is both.
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
  let patchesStale = false;
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

  const startedAt = performance.now();
  let frame = 0, previousTime = startedAt, pending = 0;
  const render = (time: number) => {
    pending = Math.min(pending + time - previousTime, STEP * 4); previousTime = time;
    const elapsed = time - startedAt;
    while (queued < queue.length && queue[queued].at <= elapsed) release(queue[queued++].source);
    const goal = collapseTarget ?? pointer ?? viewportCenter();
    // The pull starts strong so the page visibly drains toward the globe, then relaxes to an ambient float.
    const boost = collapseTarget ? 5 : 1 + 1.4 * Math.max(0, 1 - elapsed / 1400);
    while (pending >= STEP) {
      const ease = collapseTarget ? 0.3 : 0.06;
      anchor.x += (goal.x - anchor.x) * ease; anchor.y += (goal.y - anchor.y) * ease;
      for (const glyph of glyphs) {
        const { body } = glyph;
        const pull = anchorPull({ x: anchor.x - body.position.x, y: anchor.y - body.position.y }, settings.pull);
        glyph.wander += (Math.random() - 0.5) * 0.3;
        const drift = collapseTarget ? { x: 0, y: 0 } : wanderForce(glyph.wander, settings.drift);
        Body.applyForce(body, body.position, { x: (pull.x * boost + drift.x) * body.mass, y: (pull.y * boost + drift.y) * body.mass });
      }
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
  patchesStale = true;
  frame = requestAnimationFrame(render);

  let flights: Animation[] = [];
  const stop = () => {
    cancelAnimationFrame(frame);
    window.removeEventListener("pointerdown", onDown, true); window.removeEventListener("pointermove", onMove, true);
    window.removeEventListener("pointerup", onUp); window.removeEventListener("pointercancel", onUp);
    document.documentElement.removeEventListener("pointerleave", onLeave);
    window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onResize);
    Engine.clear(engine);
  };
  const cleanup = () => {
    if (removed) return;
    removed = true; phase = "done"; stop(); flights.forEach(flight => flight.cancel());
    if (highlight) CSS.highlights.delete("glyph-swarm-taken");
    highlightStyle.remove(); layer.remove();
    document.removeEventListener("selectstart", preventSelection);
    document.documentElement.classList.remove("is-glyph-swarm");
    options.signal.removeEventListener("abort", cleanup); options.onFinish();
  };
  options.signal.addEventListener("abort", cleanup, { once: true });

  return {
    isActive: () => phase === "loose",
    update(next) { settings = next; glyphs.forEach(glyph => { glyph.body.restitution = next.bounce; }); },
    cancel: cleanup,
    async collapse() {
      if (phase !== "loose") return;
      // The swarm balls up at Esc, then every page letter flies home and the globe letters return to the globe.
      phase = "collapse"; queued = queue.length;
      const exit = options.exit()?.getBoundingClientRect();
      collapseTarget = exit?.width ? centerOf(exit) : viewportCenter();
      glyphs.forEach(glyph => { glyph.body.frictionAir = 0.09; });
      await new Promise(resolve => setTimeout(resolve, COLLAPSE_MS));
      if (removed) return;
      stop();
      const home = centerOf(globe.getBoundingClientRect());
      flights = glyphs.map(glyph => {
        const { source, width, height } = glyph;
        const rect = source?.node.isConnected ? source.range.getClientRects()[0] : undefined;
        const to = source ? `translate(${(rect ?? source.rect).left}px,${(rect ?? source.rect).top}px) rotate(0rad)`
          : `translate(${home.x - width / 2}px,${home.y - height / 2}px) rotate(0rad) scale(.4)`;
        return glyph.element.animate([
          { transform: glyph.element.style.transform, opacity: 1 },
          { transform: to, opacity: source ? 1 : 0 },
        ], { duration: FLIGHT_MS, delay: Math.random() * 180, easing: "cubic-bezier(.2,.8,.2,1)", fill: "forwards" });
      });
      await Promise.allSettled(flights.map(flight => flight.finished));
      cleanup();
    },
  };
}
