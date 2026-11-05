import { glitchLetters, hoverGlitchSettings } from "@/lib/color-glitch";
import { currentGlyphPalette } from "@/lib/palette-toy";

function letterRanges(link: HTMLElement) {
  const ranges: Range[] = [];
  const segments = new Intl.Segmenter(undefined, { granularity: "grapheme" });
  const walker = document.createTreeWalker(link, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
    const parent = node.parentElement;
    if (!parent || parent.closest("svg, .sr-only, .inspectable-label, .inspectable-original.is-concealed, [data-hover-glitch-skip]")) continue;
    if (parent.closest("[aria-hidden='true']") && !parent.closest("[data-hover-glitch-text]")) continue;
    // Inspector wrappers have no box of their own; visibility belongs to their first real ancestor.
    let box = parent;
    while (box.parentElement && getComputedStyle(box).display === "contents") box = box.parentElement;
    if (!box.checkVisibility({ visibilityProperty: true, opacityProperty: true })) continue;
    for (const { segment, index } of segments.segment(node.data)) {
      if (!/\p{L}/u.test(segment)) continue;
      const range = document.createRange();
      range.setStart(node, index);
      range.setEnd(node, index + segment.length);
      ranges.push(range);
    }
  }
  return ranges;
}

/** Paint native text ranges so React, selection, line breaks and the swarm keep their original text nodes. */
export function installLinkHoverGlitch() {
  if (!globalThis.Highlight || !CSS.highlights) return () => {};
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const hover = matchMedia("(any-hover: hover)");
  const { duration, pauseMin, pauseMax, fraction, maxLetters, markChance } = hoverGlitchSettings();
  const style = document.createElement("style");
  document.head.append(style);
  let hovered: HTMLElement | null = null, focused: HTMLElement | null = null;
  let active: HTMLElement | null = null;
  let timer = 0;
  let palette: string[] = [];
  const highlights: Highlight[] = [];
  const name = (index: number) => `portfolio-link-glitch-${index}`;
  const clear = () => {
    highlights.forEach(highlight => highlight.clear());
    active?.querySelector<HTMLElement>("[data-hover-glitch-mark]")?.style.removeProperty("background-color");
  };
  const stop = () => {
    window.clearTimeout(timer);
    clear();
    active?.removeAttribute("data-link-glitch-active");
    active = null;
  };
  const linkAt = (target: EventTarget | null) => {
    const link = target instanceof Element ? target.closest<HTMLElement>("main a[href], main [data-hover-glitch]") : null;
    return link && !link.closest("[inert], .design-inspector, .palette-lab") ? link : null;
  };
  const wanted = () => !reducedMotion.matches && !document.hidden && document.hasFocus()
    ? (hover.matches && hovered?.matches(":hover") ? hovered : focused?.matches(":focus-visible") ? focused : null)
    : null;
  const pulse = () => {
    if (!active?.isConnected || wanted() !== active) { stop(); return; }
    const ranges = letterRanges(active);
    const selected = glitchLetters(ranges.length, fraction, maxLetters);
    clear();
    if (!selected.length) { stop(); return; }
    const colors = currentGlyphPalette();
    if (colors.join() !== palette.join()) {
      highlights.forEach((_, index) => CSS.highlights.delete(name(index)));
      highlights.length = 0;
      palette = [...colors];
      palette.forEach((_, index) => {
        const highlight = new Highlight();
        // The swarm's transparent masks must always paint over a colored link letter.
        highlight.priority = -1;
        highlights.push(highlight);
        CSS.highlights.set(name(index), highlight);
      });
      style.textContent = palette.map((color, index) => `::highlight(${name(index)}) { color: ${color}; }`).join("\n");
    }
    if (!highlights.length) { stop(); return; }
    active.setAttribute("data-link-glitch-active", "");
    selected.forEach(index => highlights[Math.floor(Math.random() * highlights.length)].add(ranges[index]));
    const mark = active.querySelector<HTMLElement>("[data-hover-glitch-mark]");
    // A solid mark is far louder than a single letter, so it sits out most pulses.
    if (mark && Math.random() < markChance) mark.style.backgroundColor = palette[Math.floor(Math.random() * palette.length)];
    timer = window.setTimeout(() => {
      clear();
      timer = window.setTimeout(pulse, pauseMin + Math.random() * (pauseMax - pauseMin));
    }, duration);
  };
  const update = () => {
    const next = wanted();
    if (next === active) return;
    stop();
    if (next) { active = next; pulse(); }
  };
  const over = (event: PointerEvent) => {
    if (event.pointerType === "touch") return;
    hovered = linkAt(event.target);
    update();
  };
  const out = (event: PointerEvent) => {
    if (event.pointerType === "touch") return;
    hovered = linkAt(event.relatedTarget);
    update();
  };
  const focus = (event: FocusEvent) => { focused = linkAt(event.target); update(); };
  const blur = (event: FocusEvent) => { focused = linkAt(event.relatedTarget); update(); };
  const preventControlSelection = (event: Event) => {
    if (event.target instanceof Element && event.target.closest("[data-hover-glitch]")) event.preventDefault();
  };
  document.addEventListener("selectstart", preventControlSelection);
  document.addEventListener("pointerover", over, true);
  document.addEventListener("pointerout", out, true);
  document.addEventListener("focusin", focus, true);
  document.addEventListener("focusout", blur, true);
  document.addEventListener("visibilitychange", update);
  window.addEventListener("blur", stop);
  window.addEventListener("focus", update);
  reducedMotion.addEventListener("change", update);
  hover.addEventListener("change", update);
  hovered = linkAt(document.querySelector("main a[href]:hover, main [data-hover-glitch]:hover"));
  focused = linkAt(document.activeElement);
  update();
  return () => {
    stop();
    highlights.forEach((_, index) => CSS.highlights.delete(name(index)));
    style.remove();
    document.removeEventListener("selectstart", preventControlSelection);
    document.removeEventListener("pointerover", over, true);
    document.removeEventListener("pointerout", out, true);
    document.removeEventListener("focusin", focus, true);
    document.removeEventListener("focusout", blur, true);
    document.removeEventListener("visibilitychange", update);
    window.removeEventListener("blur", stop);
    window.removeEventListener("focus", update);
    reducedMotion.removeEventListener("change", update);
    hover.removeEventListener("change", update);
  };
}
