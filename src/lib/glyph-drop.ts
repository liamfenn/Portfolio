import { settlePile } from "@/lib/glyph-pile";

/** Text that changes on its own (clocks, the scrolling song title) or floats over the page never drops. */
const SKIP = [
  ".homepage-spotify", ".footer-weather", ".homepage-project-tooltip", ".design-inspector", ".spacing-overlay",
  ".palette-lab", ".palette-toy-trigger", ".inspectable-label", ".sr-only", "[aria-hidden='true']",
].join(", ");
const SHARE = 0.4;
const MAX_GLYPHS = 360;
const GRAVITY = 2600; // px/s²
const FRAME = 8;

interface Glyph {
  element: HTMLSpanElement;
  originX: number;
  originY: number;
  width: number;
  height: number;
  targetX: number;
  targetY: number;
  angle: number;
  delay: number;
  x: number;
  y: number;
  velocity: number;
  landed: boolean;
}

export interface GlyphDrop {
  /** False once the letters are back (or a resize cleared them). */
  isActive(): boolean;
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

/** Drops a random share of the page's letters into a pile at the bottom of the page. */
export function dropGlyphs(root: Element): GlyphDrop {
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;
  const pageWidth = document.documentElement.scrollWidth;
  const pageHeight = document.documentElement.scrollHeight;
  const layer = document.createElement("div");
  layer.className = "glyph-drop-layer";
  layer.setAttribute("aria-hidden", "true");
  layer.style.width = `${pageWidth}px`;
  layer.style.height = `${pageHeight}px`;

  const characters = collectCharacters(root).filter(() => Math.random() < SHARE).slice(0, MAX_GLYPHS);
  const range = document.createRange();
  const glyphs: Glyph[] = [];
  for (const { node, offset, parent } of characters) {
    range.setStart(node, offset);
    range.setEnd(node, offset + 1);
    const rect = range.getClientRects()[0];
    if (!rect || rect.width < 1) continue;
    const style = getComputedStyle(parent);
    const originX = rect.left + scrollX;
    const originY = rect.top + scrollY;

    // A patch in the background color hides the original letter, so the page's own DOM is never touched.
    const patch = document.createElement("span");
    patch.className = "glyph-drop-patch";
    patch.style.cssText = `left:${originX}px;top:${originY}px;width:${rect.width}px;height:${rect.height}px;background:${backgroundBehind(parent)}`;
    layer.append(patch);

    const element = document.createElement("span");
    element.className = "glyph-drop-glyph";
    element.textContent = node.textContent![offset];
    element.style.cssText = `left:${originX}px;top:${originY}px;width:${rect.width}px;height:${rect.height}px;font:${style.font};letter-spacing:0;color:${style.color}`;
    layer.append(element);
    glyphs.push({
      element, originX, originY, width: rect.width, height: rect.height,
      targetX: 0, targetY: 0, angle: (Math.random() * 2 - 1) * 28, delay: Math.random() * 700,
      x: 0, y: 0, velocity: 0, landed: false,
    });
  }

  // Letters land in roughly the order they reach the floor, which is roughly lowest first.
  const order = [...glyphs].sort((a, b) => (b.originY + b.delay) - (a.originY + a.delay));
  const floorLeft = FRAME;
  const spots = settlePile(order.map(glyph => ({ x: glyph.originX - floorLeft, width: glyph.width * 0.8, height: glyph.height * 0.75 })), pageWidth - FRAME * 2);
  order.forEach((glyph, index) => {
    glyph.targetX = floorLeft + spots[index].x;
    glyph.targetY = pageHeight - FRAME - glyph.height - spots[index].y;
  });
  document.body.append(layer);

  let frame = 0;
  let previous = performance.now();
  const started = previous;
  const fall = (time: number) => {
    const seconds = Math.min(0.05, (time - previous) / 1000);
    previous = time;
    let moving = false;
    for (const glyph of glyphs) {
      if (glyph.landed) continue;
      moving = true;
      if (time - started < glyph.delay) continue;
      const drop = glyph.targetY - glyph.originY;
      glyph.velocity += GRAVITY * seconds;
      glyph.y = Math.min(drop, glyph.y + glyph.velocity * seconds);
      const progress = drop > 0 ? glyph.y / drop : 1;
      glyph.x = (glyph.targetX - glyph.originX) * Math.min(1, progress * 1.4);
      if (glyph.y >= drop) {
        // One small bounce, then rest.
        if (Math.abs(glyph.velocity) > 300) glyph.velocity *= -0.18;
        else { glyph.landed = true; glyph.x = glyph.targetX - glyph.originX; }
      }
      glyph.element.style.transform = `translate(${glyph.x}px, ${glyph.y}px) rotate(${glyph.angle * Math.min(1, progress)}deg)`;
    }
    if (moving) frame = requestAnimationFrame(fall);
  };
  frame = requestAnimationFrame(fall);

  let finished = false;
  const cancel = () => {
    if (finished) return;
    finished = true;
    cancelAnimationFrame(frame);
    window.removeEventListener("resize", cancel);
    layer.remove();
  };
  // A new layout would leave the patches in the wrong places.
  window.addEventListener("resize", cancel);

  const restore = async () => {
    if (finished) return;
    cancelAnimationFrame(frame);
    window.removeEventListener("resize", cancel);
    const flights = glyphs.map(glyph => {
      const from = glyph.element.style.transform || "translate(0px, 0px)";
      const lift = 40 + Math.random() * 80;
      // Float up out of the pile, then snap home with a slight overshoot.
      return glyph.element.animate([
        { transform: from, easing: "cubic-bezier(.3, 0, .2, 1)" },
        { transform: `translate(${glyph.x * 0.6}px, ${glyph.y - lift}px) rotate(${glyph.angle * 0.4}deg)`, offset: 0.45, easing: "cubic-bezier(.2, 1.4, .4, 1)" },
        { transform: "translate(0px, 0px) rotate(0deg)" },
      ], { duration: 900 + Math.random() * 300, delay: Math.random() * 350, fill: "forwards" }).finished;
    });
    await Promise.allSettled(flights);
    cancel();
  };

  return { restore, cancel, isActive: () => !finished };
}
