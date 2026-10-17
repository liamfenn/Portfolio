import type MatterJS from "matter-js";
import { agitationAfter, COLLAPSE_ENERGY, segmentDistance, shapeAt, shapePoint, scrollKick } from "@/lib/glyph-physics";
import type { Point } from "@/lib/glyph-physics";
import type { GlyphSettings } from "@/lib/palette-toy";

// Menus, hidden accessibility copies, and debugging UI keep their own text.
const SKIP = ".homepage-project-tooltip,.design-inspector,.spacing-overlay,.palette-lab,.palette-toy-trigger,.inspectable-label,.sr-only,.homepage-track-time-reserve,[role='menu'],script,style";
const STEP = 1000 / 60;
interface Glyph {
  element: HTMLSpanElement;
  body: MatterJS.Body;
  range: Range;
  node: Text;
  offset: number;
  patch?: HTMLSpanElement;
  origin: Point;
  width: number;
  height: number;
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

/** Originals remain mounted and keep updating; only their ink is hidden until the toy ends. */
export async function dropGlyphs(root: Element, initial: GlyphSettings, options: { signal: AbortSignal; onFinish: () => void }): Promise<GlyphDrop> {
  const { Bodies, Body, Composite, Engine } = (await import("matter-js")).default;
  options.signal.throwIfAborted();
  let settings = initial;
  const engine = Engine.create();
  engine.gravity.y = 0;
  const layer = document.createElement("div");
  layer.className = "glyph-drop-layer";
  layer.dataset.phase = "shape";
  layer.setAttribute("aria-hidden", "true");
  const highlight = typeof Highlight !== "undefined" && CSS.highlights ? new Highlight() : null;
  const glyphs: Glyph[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
    const parent = node.parentElement;
    if (!parent || parent.closest(SKIP) || !shown(parent)) continue;
    const style = getComputedStyle(parent);
    for (let offset = 0; offset < node.length; offset++) {
      if (!node.data[offset].trim() || Math.random() >= settings.share) continue;
      const range = document.createRange();
      range.setStart(node, offset); range.setEnd(node, offset + 1);
      const rect = range.getClientRects()[0];
      if (!rect || rect.width < 1 || rect.height < 1) continue;
      const element = document.createElement("span");
      element.className = "glyph-drop-glyph";
      element.textContent = node.data[offset];
      element.style.cssText = `width:${rect.width}px;height:${rect.height}px;font:${style.font};letter-spacing:0;color:${style.color}`;
      element.dataset.source = parent.closest(".homepage-spotify") ? "player" : parent.closest(".work-toolbar") ? "filters" : parent.closest(".portfolio-footer") ? "footer" : "page";
      const origin = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      const body = Bodies.rectangle(origin.x, origin.y, Math.max(4, rect.width * 0.85), Math.max(5, rect.height * 0.65), {
        restitution: settings.bounce, friction: settings.friction, frictionAir: 0.08,
        collisionFilter: { mask: 0 },
      });
      let patch: HTMLSpanElement | undefined;
      if (!highlight) {
        patch = document.createElement("span"); patch.className = "glyph-drop-patch";
        let background: Element | null = parent;
        let color = "transparent";
        while (background && (color === "transparent" || color === "rgba(0, 0, 0, 0)")) {
          color = getComputedStyle(background).backgroundColor; background = background.parentElement;
        }
        patch.style.backgroundColor = color; layer.append(patch);
      }
      glyphs.push({ element, body, range, node, offset, patch, origin, width: rect.width, height: rect.height });
      highlight?.add(range); layer.append(element);
    }
  }
  if (highlight) CSS.highlights.set("glyph-toy-selected", highlight);
  Composite.add(engine.world, glyphs.map(glyph => glyph.body));
  document.body.append(layer);

  const player = root.querySelector<HTMLElement>(".homepage-spotify");
  const album = root.querySelector<HTMLElement>(".homepage-album");
  const brand = root.querySelector<HTMLElement>(".homepage-spotify-brand");
  const badge = root.querySelector<HTMLElement>(".homepage-album-badge");
  const obstacle = () => Bodies.rectangle(-10000, -10000, 1, 1, { isStatic: true, friction: 0.7 });
  const floor = obstacle(), cover = obstacle(), spotify = obstacle(), left = obstacle(), right = obstacle();
  const obstacles = [floor, cover, spotify, left, right];
  let cameraShift = 0;
  // Obstacles do not touch the floating shape. They become live when it collapses.
  const moveObstacle = (body: MatterJS.Body, x: number, y: number, width: number, height: number) => {
    const w = body.bounds.max.x - body.bounds.min.x, h = body.bounds.max.y - body.bounds.min.y;
    Body.scale(body, Math.max(1, width) / w, Math.max(1, height) / h);
    const next = { x: x + width / 2, y: y + height / 2 };
    const appeared = body.position.x < -1000;
    Body.setVelocity(body, { x: appeared ? 0 : next.x - body.position.x, y: appeared ? 0 : next.y - body.position.y + cameraShift });
    Body.setPosition(body, next);
  };
  const syncObstacles = () => {
    const rect = player?.getBoundingClientRect();
    const floorY = rect?.top ?? window.innerHeight - 24;
    moveObstacle(floor, -1000, floorY, window.innerWidth + 2000, Math.max(3000, document.documentElement.scrollHeight));
    moveObstacle(left, -100, -10000, 108, 20000);
    moveObstacle(right, window.innerWidth - 8, -10000, 108, 20000);
    Body.setVelocity(left, { x: 0, y: 0 }); Body.setVelocity(right, { x: 0, y: 0 });
    for (const [body, element] of [[cover, album], [spotify, brand]] as const) {
      const box = element?.getBoundingClientRect();
      const clip = badge?.getBoundingClientRect();
      const visibleLeft = box && clip ? Math.max(box.left, clip.left, body === spotify ? (album?.getBoundingClientRect().right ?? 0) : 0) : 0;
      const visibleWidth = box && clip ? Math.max(0, Math.min(box.right, clip.right) - visibleLeft) : 0;
      if (!box || !visibleWidth || !shown(element!)) moveObstacle(body, -10000, -10000, 1, 1);
      else moveObstacle(body, visibleLeft, box.top, visibleWidth, box.height);
    }
    return floorY;
  };

  let collapsed = false, finished = false, removed = false;
  let energy = 0, energyAt = performance.now();
  let pointer: Point | null = null, pointerAt = 0, dragId: number | null = null;
  let dragGravity = { x: 0, y: 0 }, gravityAt = 0;
  let scrollY = window.scrollY;
  const center = () => ({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const radius = () => Math.min(window.innerWidth * 0.33, window.innerHeight * 0.26, 165);
  const collapse = () => {
    if (collapsed) return;
    collapsed = true; layer.dataset.phase = "collapsed";
    Composite.add(engine.world, obstacles);
    const floorY = syncObstacles();
    // Even footer letters start above the player, rather than underneath its collision plane.
    const highest = Math.max(...glyphs.map(g => g.body.position.y));
    const shift = Math.min(0, floorY - 75 - highest);
    for (const glyph of glyphs) {
      glyph.body.collisionFilter.mask = 0xffffffff;
      glyph.body.frictionAir = 0.018;
      Body.setPosition(glyph.body, { x: Math.max(20, Math.min(window.innerWidth - 20, glyph.body.position.x)), y: glyph.body.position.y + shift });
      Body.setAngularVelocity(glyph.body, (Math.random() - 0.5) * 0.1);
    }
  };
  const isHit = (p: Point) => collapsed
    ? glyphs.some(g => Math.hypot(g.body.position.x - p.x, g.body.position.y - p.y) < 70)
    : Math.hypot(p.x - center().x, p.y - center().y) < radius() + 55;
  const onDown = (event: PointerEvent) => {
    if (finished || event.button !== 0 || (event.target as Element).closest(".palette-toy-trigger,.palette-lab,.design-inspector")) return;
    const p = { x: event.clientX, y: event.clientY };
    if (!isHit(p)) return;
    dragId = event.pointerId; pointer = p; pointerAt = performance.now();
    touchSurface.setPointerCapture(event.pointerId); touchSurface.style.cursor = "grabbing";
    event.preventDefault();
  };
  const onMove = (event: PointerEvent) => {
    if (event.pointerId !== dragId || !pointer || finished) return;
    event.preventDefault();
    const next = { x: event.clientX, y: event.clientY }, time = performance.now();
    const dx = next.x - pointer.x, dy = next.y - pointer.y;
    const distance = Math.hypot(dx, dy), dt = Math.max(8, time - pointerAt);
    let hits = 0;
    for (const glyph of glyphs) {
      const near = segmentDistance(glyph.body.position, pointer, next);
      if (near > 65) continue;
      hits++;
      const push = (1 - near / 65) * settings.pull;
      Body.setVelocity(glyph.body, {
        x: glyph.body.velocity.x + Math.max(-18, Math.min(18, dx * 0.24)) * push,
        y: glyph.body.velocity.y + Math.max(-18, Math.min(18, dy * 0.24)) * push,
      });
    }
    if (!collapsed && hits) {
      energy = agitationAfter(energy, time - energyAt, distance, distance / dt);
      energyAt = time;
      if (energy >= COLLAPSE_ENERGY) collapse();
    }
    if (collapsed) {
      dragGravity = { x: Math.max(-1.5, Math.min(1.5, dx / dt)) * settings.pull, y: Math.max(-1.3, Math.min(1, dy / dt)) * settings.pull };
      gravityAt = time;
    }
    pointer = next; pointerAt = time;
  };
  const onUp = () => { dragId = null; pointer = null; touchSurface.style.cursor = "grab"; };
  window.addEventListener("pointerdown", onDown, { passive: false, capture: true });
  window.addEventListener("pointermove", onMove, { passive: false, capture: true });
  window.addEventListener("pointerup", onUp);
  window.addEventListener("pointercancel", onUp);
  // Touch gestures belong to the shape only; page scrolling outside it stays available.
  const touchSurface = document.createElement("div");
  touchSurface.className = "glyph-shape-touch";
  layer.append(touchSurface);

  let frame = 0, previous = performance.now(), pending = 0;
  const startedAt = previous;
  let currentShape = shapeAt(0);
  let targets = glyphs.map((_, i) => shapePoint(i, glyphs.length, currentShape));
  const render = (time: number) => {
    pending = Math.min(pending + time - previous, STEP * 4); previous = time;
    const elapsed = time - startedAt;
    const nextShape = shapeAt(elapsed);
    if (nextShape !== currentShape && !collapsed) {
      currentShape = nextShape; targets = glyphs.map((_, i) => shapePoint(i, glyphs.length, currentShape));
    }
    layer.dataset.shape = currentShape;
    const c = center(), r = radius();
    const scrollDelta = window.scrollY - scrollY; scrollY = window.scrollY;
    if (collapsed) {
      // Camera motion moves the entire world together; only the small scroll kick is physical.
      cameraShift = scrollDelta; syncObstacles(); cameraShift = 0;
      const decay = Math.exp(-Math.max(0, time - gravityAt) / 180);
      engine.gravity.x = dragGravity.x * decay * settings.gravity;
      engine.gravity.y = (1 + dragGravity.y * decay) * settings.gravity;
      if (scrollDelta) for (const glyph of glyphs) {
        Body.translate(glyph.body, { x: 0, y: -scrollDelta });
        Body.setVelocity(glyph.body, { x: glyph.body.velocity.x, y: glyph.body.velocity.y + scrollKick(scrollDelta, settings.scroll) });
      }
    }
    while (pending >= STEP) {
      if (!collapsed) glyphs.forEach((glyph, i) => {
        const target = targets[i];
        const ambient = elapsed / 1800 + i * 1.7;
        const x = c.x + target.x * r + Math.sin(ambient) * 3;
        const y = c.y + target.y * r + Math.cos(ambient * 0.8) * 3;
        Body.applyForce(glyph.body, glyph.body.position, {
          x: (x - glyph.body.position.x) * glyph.body.mass * 0.000055,
          y: (y - glyph.body.position.y) * glyph.body.mass * 0.000055,
        });
        Body.setAngularVelocity(glyph.body, (Math.sin(ambient) * 0.12 - glyph.body.angle) * 0.08);
      });
      Engine.update(engine, STEP); pending -= STEP;
    }
    for (const glyph of glyphs) {
      // Text nodes such as the clock update in place. Keep each selected range on its original character.
      if (glyph.node.isConnected && glyph.node.length > glyph.offset) {
        glyph.range.setStart(glyph.node, glyph.offset); glyph.range.setEnd(glyph.node, glyph.offset + 1);
      }
      if (glyph.patch) {
        const box = glyph.range.getClientRects()[0];
        glyph.patch.style.cssText += box ? `;left:${box.left}px;top:${box.top}px;width:${box.width}px;height:${box.height}px` : ";width:0;height:0";
      }
      const { x, y } = glyph.body.position;
      glyph.element.style.transform = `translate(${x - glyph.width / 2}px,${y - glyph.height / 2}px) rotate(${glyph.body.angle}rad)`;
    }
    if (!collapsed) touchSurface.style.cssText = `left:${c.x-r-40}px;top:${c.y-r-40}px;width:${2*r+80}px;height:${2*r+80}px`;
    else {
      const rect = player?.getBoundingClientRect();
      touchSurface.style.cssText = `left:8px;top:${(rect?.top ?? window.innerHeight)-200}px;width:calc(100% - 16px);height:200px`;
    }
    frame = requestAnimationFrame(render);
  };
  frame = requestAnimationFrame(render);
  let flights: Animation[] = [];
  const stop = () => {
    cancelAnimationFrame(frame);
    window.removeEventListener("pointerdown", onDown, true);
    window.removeEventListener("pointermove", onMove, true);
    window.removeEventListener("pointerup", onUp); window.removeEventListener("pointercancel", onUp);
    touchSurface.remove(); Engine.clear(engine);
  };
  const cleanup = () => {
    if (removed) return;
    removed = finished = true; stop(); flights.forEach(flight => flight.cancel());
    if (highlight) CSS.highlights.delete("glyph-toy-selected");
    layer.remove(); window.removeEventListener("resize", onResize);
    options.signal.removeEventListener("abort", cleanup); options.onFinish();
  };
  const width = window.innerWidth;
  function onResize() { if (width !== window.innerWidth) cleanup(); }
  window.addEventListener("resize", onResize);
  options.signal.addEventListener("abort", cleanup, { once: true });
  return {
    isActive: () => !finished,
    update(next) { settings = next; glyphs.forEach(g => { g.body.restitution = next.bounce; g.body.friction = next.friction; }); },
    cancel: cleanup,
    async restore() {
      if (finished) return;
      finished = true; stop();
      flights = glyphs.map(glyph => {
        const rect = glyph.range.getClientRects()[0];
        const x = rect?.left ?? glyph.origin.x, y = rect?.top ?? glyph.origin.y;
        return glyph.element.animate([
          { transform: glyph.element.style.transform },
          { transform: `translate(${x}px,${y}px) rotate(0rad)` },
        ], { duration: 850, delay: Math.random() * 150, easing: "cubic-bezier(.2,.8,.2,1)", fill: "forwards" });
      });
      await Promise.allSettled(flights.map(f => f.finished)); cleanup();
    },
  };
}
