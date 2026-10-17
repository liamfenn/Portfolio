import type MatterJS from "matter-js";
import { COLLIDE, cursorPull, glyphCollision, gravityFromTilt, scrollKick } from "@/lib/glyph-physics";
import type { GlyphSettings } from "@/lib/palette-toy";

/** Text that changes on its own (clocks, the scrolling song title) or floats over the page never drops. */
const SKIP = [
  ".homepage-spotify", ".footer-weather", ".homepage-project-tooltip", ".design-inspector", ".spacing-overlay",
  ".palette-lab", ".palette-toy-trigger", ".inspectable-label", ".sr-only", "[aria-hidden='true']",
].join(", ");
/** Some glyphs catch on top of these (the project cards). */
const LEDGES = ".project-grid > li";
/** Everything above the music player lands on it. */
const FLOORS = ".homepage-spotify";
const FRAME = 8;
const STEP_MS = 1000 / 60;
const WALL = 200;

interface Glyph {
  element: HTMLSpanElement;
  body: MatterJS.Body;
  originX: number;
  originY: number;
  releaseAt: number;
  released: boolean;
}

export interface GlyphDrop {
  /** False once the letters are back (or a width change cleared them). */
  isActive(): boolean;
  /** Apply new settings to the running simulation. */
  update(settings: GlyphSettings): void;
  /** Float every glyph back to where it came from, then clean up. */
  restore(): Promise<void>;
  /** Remove everything immediately. */
  cancel(): void;
}

function backgroundBehind(element: Element) {
  for (let node: Element | null = element; node; node = node.parentElement) {
    const color = getComputedStyle(node).backgroundColor;
    if (color !== "rgba(0, 0, 0, 0)" && color !== "transparent") return color;
  }
  return getComputedStyle(document.body).backgroundColor;
}

/** display: contents wrappers (InspectableText) have no box, so check visibility on the nearest one that does. */
function isShown(element: HTMLElement) {
  let node: HTMLElement | null = element;
  while (node && getComputedStyle(node).display === "contents") node = node.parentElement;
  return !node || (node.checkVisibility?.({ visibilityProperty: true, opacityProperty: true }) ?? true);
}

function collectCharacters(root: Element) {
  const characters: { node: Text; offset: number; parent: HTMLElement }[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
    const parent = node.parentElement;
    if (!parent || parent.closest(SKIP) || !isShown(parent)) continue;
    const text = node.textContent ?? "";
    for (let offset = 0; offset < text.length; offset++) {
      if (text[offset].trim()) characters.push({ node, offset, parent });
    }
  }
  return characters;
}

/**
 * Drops a random share of the page's letters (anywhere on the page, not just in view) with real physics:
 * some catch on the project cards, the rest land on the music player or, below it, the bottom of the page.
 * On a phone, tilting sets gravity; with a mouse, letters slide toward the cursor. Scrolling nudges them.
 * They stay put until restore(); the page's own text is never touched (copies sit over background patches).
 */
export async function dropGlyphs(root: Element, initial: GlyphSettings, options: { signal: AbortSignal; onFinish: () => void }): Promise<GlyphDrop> {
  const { Bodies, Body, Composite, Engine } = (await import("matter-js")).default;
  options.signal.throwIfAborted();
  let settings = initial;
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;
  const pageWidth = document.documentElement.scrollWidth;
  const pageHeight = document.documentElement.scrollHeight;
  const toPage = (rect: DOMRect) => ({ left: rect.left + scrollX, top: rect.top + scrollY, width: rect.width, height: rect.height });

  const engine = Engine.create({ enableSleeping: false });
  engine.gravity.y = settings.gravity;
  const solid = (box: { left: number; top: number; width: number; height: number }, category: number) =>
    Bodies.rectangle(box.left + box.width / 2, box.top + box.height / 2, box.width, box.height, {
      isStatic: true,
      friction: 0.6,
      collisionFilter: { category, mask: category === COLLIDE.ledge ? COLLIDE.catching : COLLIDE.catching | COLLIDE.falling },
    });
  const world = COLLIDE.world;
  Composite.add(engine.world, [
    // Page walls, floor, and ceiling sit on the 8px frame.
    solid({ left: FRAME - WALL, top: -pageHeight, width: WALL, height: pageHeight * 3 }, world),
    solid({ left: pageWidth - FRAME, top: -pageHeight, width: WALL, height: pageHeight * 3 }, world),
    solid({ left: -pageWidth, top: pageHeight - FRAME, width: pageWidth * 3, height: WALL }, world),
    solid({ left: -pageWidth, top: -WALL, width: pageWidth * 3, height: WALL }, world),
    ...Array.from(document.querySelectorAll(FLOORS), element => solid(toPage(element.getBoundingClientRect()), world)),
    ...Array.from(document.querySelectorAll(LEDGES), element => solid(toPage(element.getBoundingClientRect()), COLLIDE.ledge)),
  ]);

  const layer = document.createElement("div");
  layer.className = "glyph-drop-layer";
  layer.setAttribute("aria-hidden", "true");
  layer.style.width = `${pageWidth}px`;
  layer.style.height = `${pageHeight}px`;

  const range = document.createRange();
  const startedAt = performance.now();
  const glyphs: Glyph[] = [];
  for (const { node, offset, parent } of collectCharacters(root)) {
    if (Math.random() >= settings.share) continue;
    range.setStart(node, offset);
    range.setEnd(node, offset + 1);
    const rect = range.getClientRects()[0];
    if (!rect || rect.width < 1) continue;
    const box = toPage(rect);
    const style = getComputedStyle(parent);

    // A patch in the background color hides the original letter.
    const patch = document.createElement("span");
    patch.className = "glyph-drop-patch";
    patch.style.cssText = `left:${box.left}px;top:${box.top}px;width:${box.width}px;height:${box.height}px;background:${backgroundBehind(parent)}`;
    const element = document.createElement("span");
    element.className = "glyph-drop-glyph";
    element.textContent = node.textContent![offset];
    element.style.cssText = `left:${box.left}px;top:${box.top}px;width:${box.width}px;height:${box.height}px;font:${style.font};letter-spacing:0;color:${style.color}`;
    layer.append(patch, element);

    const originX = box.left + box.width / 2;
    const originY = box.top + box.height / 2;
    // The line box is taller than the letter, so the body is trimmed to roughly the glyph's ink.
    const body = Bodies.rectangle(originX, originY, Math.max(3, box.width * 0.85), Math.max(4, box.height * 0.6), {
      restitution: settings.bounce,
      friction: settings.friction,
      frictionStatic: settings.friction + 0.2,
      frictionAir: 0.012,
      slop: 0.02,
      collisionFilter: glyphCollision(Math.random() < settings.catchChance),
    });
    Body.setStatic(body, true);
    glyphs.push({ element, body, originX, originY, releaseAt: startedAt + Math.random() * 700, released: false });
  }
  Composite.add(engine.world, glyphs.map(glyph => glyph.body));
  document.body.append(layer);

  // Drivers: tilt on touch screens, the cursor with a mouse, and scroll everywhere.
  const usesTilt = window.matchMedia("(pointer: coarse)").matches;
  let tilt: { x: number; y: number } | null = null;
  let cursorX: number | null = null;
  let lastScrollY = window.scrollY;
  const applyGravity = () => {
    engine.gravity.x = tilt ? tilt.x * settings.pull * settings.gravity : 0;
    engine.gravity.y = tilt ? tilt.y * settings.gravity : settings.gravity;
  };
  const onOrientation = (event: DeviceOrientationEvent) => {
    tilt = gravityFromTilt(event.beta, event.gamma);
    applyGravity();
  };
  const onPointerMove = (event: PointerEvent) => { if (event.pointerType === "mouse") cursorX = event.clientX; };
  const onPointerLeave = () => { cursorX = null; };
  const onScroll = () => {
    const kick = scrollKick(window.scrollY - lastScrollY, settings.scroll);
    lastScrollY = window.scrollY;
    for (const glyph of glyphs) {
      if (glyph.released) Body.setVelocity(glyph.body, { x: glyph.body.velocity.x, y: glyph.body.velocity.y + kick });
    }
  };
  if (usesTilt) window.addEventListener("deviceorientation", onOrientation);
  else {
    window.addEventListener("pointermove", onPointerMove);
    document.documentElement.addEventListener("pointerleave", onPointerLeave);
  }
  window.addEventListener("scroll", onScroll, { passive: true });

  let frame = 0;
  let previous = performance.now();
  let pending = 0;
  const run = (time: number) => {
    pending = Math.min(pending + (time - previous), STEP_MS * 4);
    previous = time;
    for (const glyph of glyphs) {
      if (!glyph.released && time >= glyph.releaseAt) { Body.setStatic(glyph.body, false); glyph.released = true; }
    }
    while (pending >= STEP_MS) {
      if (cursorX !== null && settings.pull > 0) {
        const pageCursor = cursorX + window.scrollX;
        for (const glyph of glyphs) {
          if (!glyph.released) continue;
          const force = cursorPull(pageCursor - glyph.body.position.x, settings.pull) * glyph.body.mass * engine.gravity.scale;
          Body.applyForce(glyph.body, glyph.body.position, { x: force, y: 0 });
        }
      }
      Engine.update(engine, STEP_MS);
      pending -= STEP_MS;
    }
    for (const glyph of glyphs) {
      const { position, angle } = glyph.body;
      glyph.element.style.transform = `translate(${position.x - glyph.originX}px, ${position.y - glyph.originY}px) rotate(${angle}rad)`;
    }
    frame = requestAnimationFrame(run);
  };
  frame = requestAnimationFrame(run);

  let finished = false;
  let removed = false;
  let flights: Animation[] = [];
  let width = window.innerWidth;
  const stopSimulation = () => {
    cancelAnimationFrame(frame);
    window.removeEventListener("deviceorientation", onOrientation);
    window.removeEventListener("pointermove", onPointerMove);
    document.documentElement.removeEventListener("pointerleave", onPointerLeave);
    window.removeEventListener("scroll", onScroll);
    Engine.clear(engine);
  };
  const cleanup = () => {
    if (removed) return;
    removed = true;
    finished = true;
    stopSimulation();
    flights.forEach(flight => flight.cancel());
    window.removeEventListener("resize", onResize);
    options.signal.removeEventListener("abort", cleanup);
    layer.remove();
    options.onFinish();
  };
  const cancel = cleanup;
  // A new width reflows the text under the patches; height changes (a phone's address bar) don't.
  function onResize() { if (window.innerWidth !== width) cancel(); else width = window.innerWidth; }
  window.addEventListener("resize", onResize);
  options.signal.addEventListener("abort", cleanup, { once: true });

  return {
    isActive: () => !finished,
    update(next) {
      settings = next;
      applyGravity();
      for (const glyph of glyphs) {
        glyph.body.restitution = next.bounce;
        glyph.body.friction = next.friction;
        glyph.body.frictionStatic = next.friction + 0.2;
      }
    },
    async restore() {
      if (finished) return;
      finished = true;
      stopSimulation();
      flights = glyphs.map(glyph => {
        const from = glyph.element.style.transform || "translate(0px, 0px)";
        const dx = glyph.body.position.x - glyph.originX;
        const dy = glyph.body.position.y - glyph.originY;
        const lift = 40 + Math.random() * 80;
        // Float up out of the pile, then snap home with a slight overshoot.
        return glyph.element.animate([
          { transform: from, easing: "cubic-bezier(.3, 0, .2, 1)" },
          { transform: `translate(${dx * 0.6}px, ${dy - lift}px) rotate(${glyph.body.angle * 0.4}rad)`, offset: 0.45, easing: "cubic-bezier(.2, 1.4, .4, 1)" },
          { transform: "translate(0px, 0px) rotate(0rad)" },
        ], { duration: 900 + Math.random() * 300, delay: Math.random() * 350, fill: "forwards" });
      });
      await Promise.allSettled(flights.map(flight => flight.finished));
      cleanup();
    },
    cancel,
  };
}
