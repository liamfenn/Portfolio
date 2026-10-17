import type MatterJS from "matter-js";
import { cursorAttraction, flingVelocity, segmentDistance, scrollKick, initialReleaseCount } from "@/lib/glyph-physics";
import type { Point } from "@/lib/glyph-physics";
import type { GlyphSettings } from "@/lib/palette-toy";

const SKIP = ".homepage-project-tooltip,.design-inspector,.spacing-overlay,.palette-lab,.glyph-toy-trigger,.inspectable-label,.sr-only,.homepage-track-time-reserve,[role='menu'],script,style";
const STEP = 1000 / 60;
const WORLD = 1, LETTER = 2;
interface Candidate {
  node: Text;
  offset: number;
  parent: HTMLElement;
  range: Range;
  rect: DOMRect;
  released: boolean;
  visitedAt: number;
}
interface Glyph {
  element: HTMLSpanElement;
  body: MatterJS.Body;
  source: Candidate;
  patch?: HTMLSpanElement;
  origin: Point;
  width: number;
  height: number;
  crossing: boolean;
}
export interface GlyphDrop {
  isActive(): boolean;
  update(settings: GlyphSettings): void;
  restore(): Promise<void>;
  cancel(): void;
}
function shown(parent: HTMLElement) {
  let box: HTMLElement | null = parent;
  while (box && getComputedStyle(box).display === "contents") box = box.parentElement;
  return !box || box.checkVisibility({ visibilityProperty: true, opacityProperty: true });
}

/** Only released letters leave the live React text. The rest of the page remains usable. */
export async function dropGlyphs(root: Element, initial: GlyphSettings, options: { signal: AbortSignal; onFinish: () => void }): Promise<GlyphDrop> {
  const { Bodies, Body, Composite, Engine, Vertices } = (await import("matter-js")).default;
  options.signal.throwIfAborted();
  let settings = initial;
  const engine = Engine.create({ positionIterations: 8, velocityIterations: 8 });
  engine.gravity.y = 0.65 * settings.gravity;
  const layer = document.createElement("div");
  layer.className = "glyph-drop-layer"; layer.dataset.phase = "loose"; layer.setAttribute("aria-hidden", "true");
  const highlight = typeof Highlight !== "undefined" && CSS.highlights ? new Highlight() : null;
  const highlightStyle = document.createElement("style");
  if (highlight) {
    // Next 16's CSS parser rejects this browser-supported pseudo-element in compiled CSS.
    highlightStyle.textContent = "::highlight(glyph-toy-selected) { color: transparent; text-shadow: none; }";
    document.head.append(highlightStyle); CSS.highlights.set("glyph-toy-selected", highlight);
  }
  const glyphs: Glyph[] = [], candidates: Candidate[] = [];
  const registered = new WeakSet<Text>();
  const collect = () => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
      const parent = node.parentElement;
      if (!parent || registered.has(node) || parent.closest(SKIP) || !shown(parent)) continue;
      registered.add(node);
      for (let offset = 0; offset < node.length; offset++) {
        if (!node.data[offset].trim()) continue;
        const range = document.createRange(); range.setStart(node, offset); range.setEnd(node, offset + 1);
        const rect = range.getClientRects()[0];
        if (rect && rect.width >= 1 && rect.height >= 1) candidates.push({ node, offset, parent, range, rect, released: false, visitedAt: -Infinity });
      }
    }
  };
  collect();
  const sourceObserver = new MutationObserver(collect);
  sourceObserver.observe(root, { childList: true, subtree: true });
  document.body.append(layer);
  root.classList.add("is-glyph-play");
  // Safari suppresses custom highlights on user-select:none text. Prevent native drag-selection
  // through its event instead, keeping the selected-character mask available on desktop and iOS.
  const preventSelection = (event: Event) => event.preventDefault();
  root.addEventListener("selectstart", preventSelection);

  // Convex ink outlines produce tumbling, rolling letters rather than identical thin rectangles.
  const canvas = document.createElement("canvas"); canvas.width = canvas.height = 96;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  const hulls = new Map<string, Point[]>();
  const inkHull = (character: string, font: string) => {
    const key = `${font}:${character}`;
    if (hulls.has(key)) return hulls.get(key)!;
    const points: Point[] = [];
    if (context) {
      context.setTransform(1, 0, 0, 1, 0, 0); context.clearRect(0, 0, 96, 96);
      context.scale(2, 2); context.font = font; context.fillStyle = "black"; context.textBaseline = "top";
      context.fillText(character, 8, 8);
      const { data } = context.getImageData(0, 0, 96, 96);
      for (let y = 0; y < 96; y += 2) {
        let first = -1, last = -1;
        for (let x = 0; x < 96; x++) if (data[(y * 96 + x) * 4 + 3] > 90) { if (first < 0) first = x; last = x; }
        if (first >= 0) { points.push({ x: first / 2, y: y / 2 }, { x: last / 2, y: y / 2 }); }
      }
    }
    const hull = points.length >= 3 ? Vertices.hull(points as MatterJS.Vertex[]) : [];
    const outline = hull.length >= 3 && Vertices.area(hull, false) >= 3 ? hull : [];
    hulls.set(key, outline); return outline;
  };
  const player = root.querySelector<HTMLElement>(".homepage-spotify");
  const album = root.querySelector<HTMLElement>(".homepage-album");
  const brand = root.querySelector<HTMLElement>(".homepage-spotify-brand");
  const badge = root.querySelector<HTMLElement>(".homepage-album-badge");
  const obstacle = () => Bodies.rectangle(-10000, -10000, 1, 1, { isStatic: true, friction: 0.85, collisionFilter: { category: WORLD, mask: LETTER } });
  const floor = obstacle(), cover = obstacle(), spotify = obstacle(), left = obstacle(), right = obstacle();
  Composite.add(engine.world, [floor, cover, spotify, left, right]);
  let cameraShift = 0;
  const moveObstacle = (body: MatterJS.Body, x: number, y: number, width: number, height: number) => {
    const w = body.bounds.max.x - body.bounds.min.x, h = body.bounds.max.y - body.bounds.min.y;
    Body.scale(body, Math.max(1, width) / w, Math.max(1, height) / h);
    const next = { x: x + width / 2, y: y + height / 2 }, appeared = body.position.x < -1000;
    Body.setVelocity(body, { x: appeared ? 0 : next.x - body.position.x, y: appeared ? 0 : next.y - body.position.y + cameraShift });
    Body.setPosition(body, next);
  };
  const syncObstacles = () => {
    const floorY = player?.getBoundingClientRect().top ?? window.innerHeight - 24;
    moveObstacle(floor, -1000, floorY, window.innerWidth + 2000, Math.max(3000, document.documentElement.scrollHeight));
    moveObstacle(left, -100, -10000, 108, 20000); moveObstacle(right, window.innerWidth - 8, -10000, 108, 20000);
    Body.setVelocity(left, { x: 0, y: 0 }); Body.setVelocity(right, { x: 0, y: 0 });
    for (const [body, element] of [[cover, album], [spotify, brand]] as const) {
      const box = element?.getBoundingClientRect(), clip = badge?.getBoundingClientRect();
      const x = box && clip ? Math.max(box.left, clip.left, body === spotify ? (album?.getBoundingClientRect().right ?? 0) : 0) : 0;
      const width = box && clip ? Math.max(0, Math.min(box.right, clip.right) - x) : 0;
      if (!box || !width || !shown(element!)) moveObstacle(body, -10000, -10000, 1, 1);
      else moveObstacle(body, x, box.top, width, box.height);
    }
    return floorY;
  };
  let floorY = syncObstacles();
  const release = (source: Candidate, delta: Point, seed = false) => {
    if (source.released || !source.node.isConnected || !shown(source.parent) || source.node.length <= source.offset) return;
    source.range.setStart(source.node, source.offset); source.range.setEnd(source.node, source.offset + 1);
    const rect = source.range.getClientRects()[0];
    if (!rect || rect.width < 1) return;
    source.released = true;
    const style = getComputedStyle(source.parent), character = source.node.data[source.offset];
    const element = document.createElement("span"); element.className = "glyph-drop-glyph"; element.textContent = character;
    element.style.cssText = `width:${rect.width}px;height:${rect.height}px;font:${style.font};line-height:${rect.height}px;letter-spacing:0;color:${style.color}`;
    element.dataset.source = source.parent.closest(".homepage-spotify") ? "player" : source.parent.closest(".work-toolbar") ? "filters" : source.parent.closest(".portfolio-footer") ? "footer" : "page";
    const origin = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    const crossing = origin.y > floorY - 12;
    const hull = inkHull(character, style.font);
    const properties: MatterJS.IBodyDefinition = { restitution: settings.bounce, friction: settings.friction, frictionStatic: 1, frictionAir: 0.018,
      slop: 0.015, collisionFilter: { category: LETTER, mask: crossing ? LETTER : WORLD | LETTER } };
    const body = hull.length >= 3 ? Bodies.fromVertices(origin.x, origin.y, [hull], properties) : Bodies.circle(origin.x, origin.y, 2, properties);
    const fling = seed ? { x: (Math.random() - 0.5) * 2, y: 0 } : flingVelocity(delta);
    // Letters below the player arc up above it before gravity brings them onto the pile.
    if (crossing) fling.y = -Math.max(10, Math.sqrt((origin.y - floorY + 100) * 0.5 * settings.gravity) * 1.4);
    Body.setVelocity(body, fling); Body.setAngularVelocity(body, (Math.random() - 0.5) * (seed ? 0.12 : 0.35));
    let patch: HTMLSpanElement | undefined;
    if (highlight) highlight.add(source.range);
    else {
      patch = document.createElement("span"); patch.className = "glyph-drop-patch";
      let background: Element | null = source.parent, color = "transparent";
      while (background && (color === "transparent" || color === "rgba(0, 0, 0, 0)")) { color = getComputedStyle(background).backgroundColor; background = background.parentElement; }
      patch.style.backgroundColor = color; layer.append(patch);
    }
    const glyph = { element, body, source, patch, origin, width: rect.width, height: rect.height, crossing };
    glyphs.push(glyph); layer.append(element); Composite.add(engine.world, body);
    layer.dataset.released = String(glyphs.length);
  };
  // A quiet hint on activation: only a handful of random letters currently on screen.
  const seeds = candidates.filter(c => c.rect.bottom > 0 && c.rect.top < window.innerHeight && c.rect.left >= 0 && c.rect.right <= window.innerWidth);
  for (let count = 0, amount = initialReleaseCount(seeds.length); count < amount && seeds.length; count++) {
    const [seed] = seeds.splice(Math.floor(Math.random() * seeds.length), 1); release(seed, { x: 0, y: 0 }, true);
  }

  let finished = false, removed = false;
  let pointer: Point | null = null, pointerAt = 0, dragId: number | null = null;
  let lastRelease = 0, geometryAt = 0, scrollY = window.scrollY;
  const surface = document.createElement("div"); surface.className = "glyph-pile-touch"; layer.append(surface);
  const excluded = (event: PointerEvent) => (event.target as Element).closest(".glyph-toy-trigger,.palette-lab,.design-inspector,[role='menu']");
  const onDown = (event: PointerEvent) => {
    if (finished || event.button !== 0 || excluded(event)) return;
    const p = { x: event.clientX, y: event.clientY };
    const hit = glyphs.some(g => Math.hypot(g.body.position.x - p.x, g.body.position.y - p.y) < 35);
    if (hit) { dragId = event.pointerId; surface.setPointerCapture(event.pointerId); event.preventDefault(); }
    else if (event.pointerType !== "mouse" && (event.target as Element).closest(".portfolio-bio,.homepage-contact,.work-toolbar,.homepage-track-info,.homepage-track-time,.portfolio-footer-row")) {
      dragId = event.pointerId;
    }
    pointer = p; pointerAt = performance.now();
  };
  const onMove = (event: PointerEvent) => {
    if (finished || excluded(event) || (event.pointerType !== "mouse" && !event.buttons && event.pointerId !== dragId)) return;
    const next = { x: event.clientX, y: event.clientY }, time = performance.now();
    const previous = pointer ?? next, dt = Math.max(8, time - pointerAt);
    const delta = { x: (next.x - previous.x) * Math.min(1, 24 / dt), y: (next.y - previous.y) * Math.min(1, 24 / dt) };
    if (event.pointerId === dragId) {
      if (Math.hypot(next.x - previous.x, next.y - previous.y) > 3 && !surface.hasPointerCapture(event.pointerId)) surface.setPointerCapture(event.pointerId);
      event.preventDefault();
    }
    if (time - geometryAt > 180) {
      for (const c of candidates) if (!c.released && c.node.isConnected && c.node.length > c.offset) {
        c.range.setStart(c.node, c.offset); c.range.setEnd(c.node, c.offset + 1);
        c.rect = c.range.getClientRects()[0] ?? c.rect;
      }
      geometryAt = time;
    }
    if (time - lastRelease > 85) {
      const nearby = candidates.filter(c => !c.released && c.node.isConnected && c.rect.bottom > 0 && c.rect.top < window.innerHeight &&
        time - c.visitedAt > 900 && segmentDistance({ x: c.rect.left + c.rect.width / 2, y: c.rect.top + c.rect.height / 2 }, previous, next) < 15);
      // Each pass samples letters again; resting over a word does not strip it bare.
      for (const c of nearby) c.visitedAt = time;
      const chosen = nearby.filter(() => Math.random() < settings.share).sort(() => Math.random() - 0.5).slice(0, 2);
      chosen.forEach(c => release(c, delta));
      if (chosen.length) lastRelease = time;
    }
    if (event.buttons || event.pointerId === dragId) for (const glyph of glyphs) {
      const near = segmentDistance(glyph.body.position, previous, next);
      if (near > 55) continue;
      const push = (1 - near / 55) * settings.pull;
      Body.setVelocity(glyph.body, { x: glyph.body.velocity.x + Math.max(-10, Math.min(10, delta.x * 0.2)) * push,
        y: glyph.body.velocity.y + Math.max(-10, Math.min(8, delta.y * 0.2)) * push });
      Body.setAngularVelocity(glyph.body, glyph.body.angularVelocity + delta.x * 0.002 * push);
    }
    pointer = next; pointerAt = time;
  };
  const onUp = () => { dragId = null; };
  const onLeave = () => { pointer = null; dragId = null; };
  window.addEventListener("pointerdown", onDown, { passive: false, capture: true });
  window.addEventListener("pointermove", onMove, { passive: false, capture: true });
  window.addEventListener("pointerup", onUp); window.addEventListener("pointercancel", onLeave);
  document.documentElement.addEventListener("pointerleave", onLeave);

  let frame = 0, previousTime = performance.now(), pending = 0;
  const render = (time: number) => {
    pending = Math.min(pending + time - previousTime, STEP * 4); previousTime = time;
    const scrollDelta = window.scrollY - scrollY; scrollY = window.scrollY;
    cameraShift = scrollDelta; floorY = syncObstacles(); cameraShift = 0;
    if (scrollDelta) {
      geometryAt = 0;
      for (const glyph of glyphs) {
        Body.translate(glyph.body, { x: 0, y: -scrollDelta });
        Body.setVelocity(glyph.body, { x: glyph.body.velocity.x, y: glyph.body.velocity.y + scrollKick(scrollDelta, settings.scroll) });
      }
    }
    engine.gravity.y = 0.65 * settings.gravity;
    while (pending >= STEP) {
      for (const glyph of glyphs) {
        if (glyph.crossing) {
          // Footer letters temporarily pass through the bar, but must stay inside the page walls.
          const x = Math.max(20, Math.min(window.innerWidth - 20, glyph.body.position.x));
          if (x !== glyph.body.position.x) {
            Body.setPosition(glyph.body, { x, y: glyph.body.position.y });
            Body.setVelocity(glyph.body, { x: -glyph.body.velocity.x * 0.3, y: glyph.body.velocity.y });
          }
          if (glyph.body.bounds.max.y < floorY - 2) { glyph.crossing = false; glyph.body.collisionFilter.mask = WORLD | LETTER; }
        }
        if (pointer) {
          const force = cursorAttraction({ x: pointer.x - glyph.body.position.x, y: pointer.y - glyph.body.position.y }, settings.pull);
          Body.applyForce(glyph.body, glyph.body.position, { x: force.x * glyph.body.mass, y: force.y * glyph.body.mass });
        }
      }
      Engine.update(engine, STEP); pending -= STEP;
    }
    for (const glyph of glyphs) {
      const { node, offset, range } = glyph.source;
      if (node.isConnected && node.length > offset) { range.setStart(node, offset); range.setEnd(node, offset + 1); }
      if (glyph.patch) {
        const box = range.getClientRects()[0];
        Object.assign(glyph.patch.style, box ? { left: `${box.left}px`, top: `${box.top}px`, width: `${box.width}px`, height: `${box.height}px` } : { width: "0", height: "0" });
      }
      const { x, y } = glyph.body.position;
      glyph.element.style.transform = `translate(${x - glyph.width / 2}px,${y - glyph.height / 2}px) rotate(${glyph.body.angle}rad)`;
    }
    surface.style.cssText = `left:8px;top:${floorY-90}px;width:calc(100% - 16px);height:90px`;
    frame = requestAnimationFrame(render);
  };
  frame = requestAnimationFrame(render);
  let flights: Animation[] = [];
  const stop = () => {
    cancelAnimationFrame(frame); sourceObserver.disconnect();
    root.removeEventListener("selectstart", preventSelection);
    window.removeEventListener("pointerdown", onDown, true); window.removeEventListener("pointermove", onMove, true);
    window.removeEventListener("pointerup", onUp); window.removeEventListener("pointercancel", onLeave);
    document.documentElement.removeEventListener("pointerleave", onLeave); surface.remove(); Engine.clear(engine);
  };
  const cleanup = () => {
    if (removed) return;
    removed = finished = true; stop(); flights.forEach(flight => flight.cancel());
    if (highlight) CSS.highlights.delete("glyph-toy-selected"); highlightStyle.remove(); layer.remove(); root.classList.remove("is-glyph-play");
    window.removeEventListener("resize", onResize); options.signal.removeEventListener("abort", cleanup); options.onFinish();
  };
  const width = window.innerWidth;
  function onResize() { if (width !== window.innerWidth) cleanup(); }
  window.addEventListener("resize", onResize); options.signal.addEventListener("abort", cleanup, { once: true });
  return {
    isActive: () => !finished,
    update(next) { settings = next; glyphs.forEach(g => { g.body.restitution = next.bounce; g.body.friction = next.friction; }); },
    cancel: cleanup,
    async restore() {
      if (finished) return;
      finished = true; stop();
      flights = glyphs.map(glyph => {
        const rect = glyph.source.range.getClientRects()[0];
        return glyph.element.animate([
          { transform: glyph.element.style.transform },
          { transform: `translate(${rect?.left ?? glyph.origin.x}px,${rect?.top ?? glyph.origin.y}px) rotate(0rad)` },
        ], { duration: 850, delay: Math.random() * 150, easing: "cubic-bezier(.2,.8,.2,1)", fill: "forwards" });
      });
      await Promise.allSettled(flights.map(f => f.finished)); cleanup();
    },
  };
}
