"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useReducedMotion } from "motion/react";
import { InspectableText } from "@/components/design-inspector";
import type { ProjectPreview } from "@/lib/project-previews";
import { FILTER_SCRAMBLE } from "@/lib/text-scramble";
import { currentGlyphPalette } from "@/lib/palette-toy";

export type ProjectFocusSelection = { preview: ProjectPreview; trigger: HTMLButtonElement; origin: DOMRect; keyboard: boolean };

function FocusGlitch({ text }: { text: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const node = ref.current!;
    const root = node.closest(".project-focus-root");
    const characters = Array.from(text);
    const choices = characters.map(character => FILTER_SCRAMBLE.range.filter(code => String.fromCharCode(code) !== character));
    const colors = currentGlyphPalette();
    const interval = 1000 / (60 * FILTER_SCRAMBLE.speed);
    const cycles = FILTER_SCRAMBLE.scramble + Math.ceil(FILTER_SCRAMBLE.scramble / 2);
    let frame = 0, disposed = false, resolved = 0;
    // Keep resolved letters in one native text run so the font retains its shaping and kerning.
    const prefix = document.createTextNode("");
    const active = document.createElement("span");
    const tail = document.createTextNode(" ".repeat(text.length));
    node.replaceChildren(prefix, active, tail);
    node.dataset.reveal = "streaming";

    const media = root?.querySelector(".homepage-project-media");
    const opening = media?.getAnimations() ?? [];
    // Tie the reveal to the real media handoff instead of racing its animation with a timer.
    void Promise.all(opening.map(animation => animation.finished)).then(() => {
      if (disposed || !root || root.getAttribute("data-phase") === "closing") return;
      let started: number | undefined, previousTick = -1;
      const draw = (now: number) => {
        started ??= now;
        const tick = Math.floor((now - started) / interval);
        if (tick !== previousTick) {
          const resolvedCount = Math.min(characters.length, Math.max(0, tick - cycles + 1));
          while (resolved < resolvedCount) prefix.appendData(characters[resolved++]);
          const visibleCount = Math.min(characters.length, tick + 1);
          const glyphs = characters.slice(resolved, visibleCount).map((character, position) => {
            if (!character.trim()) return document.createTextNode(character);
            const index = resolved + position;
            const glyph = document.createElement("span");
            const range = choices[index];
            // A random match must not look settled for a frame and then glitch again.
            glyph.textContent = String.fromCharCode(range[Math.floor(Math.random() * range.length)]) + " ".repeat(character.length - 1);
            if (colors.length) glyph.style.color = colors[(index + tick) % colors.length];
            return glyph;
          });
          active.replaceChildren(...glyphs);
          tail.data = " ".repeat(characters.slice(visibleCount).join("").length);
          if (resolved === characters.length) {
            active.remove();
            tail.remove();
            node.dataset.reveal = "settled";
          }
          previousTick = tick;
        }
        if (tick < characters.length - 1 + cycles) frame = requestAnimationFrame(draw);
      };
      frame = requestAnimationFrame(draw);
    }).catch(() => {});
    return () => { disposed = true; cancelAnimationFrame(frame); };
  }, [text]);
  return <span ref={ref} className="project-focus-glyphs" aria-hidden="true">{" ".repeat(text.length)}</span>;
}

function FocusText({ text }: { text: string }) {
  const reducedMotion = useReducedMotion();
  return <InspectableText text={text}><span className="project-focus-text" data-focus-text={text}>
    <span className="project-focus-text-reserve" aria-hidden="true">{text}</span>
    {reducedMotion ? <span className="project-focus-glyphs" data-reveal="settled" aria-hidden="true">{text}</span> : <FocusGlitch text={text} />}
    <span className="sr-only">{text}</span>
  </span></InspectableText>;
}

export function ProjectFocusDetails({ preview }: { preview: ProjectPreview }) {
  const period = `${preview.quarter ? `Q${preview.quarter} ` : ""}${String(preview.year).slice(-2)}`;
  return <div className="project-focus-details text-bodySans">
    <div className="project-focus-heading">
      <div className="project-focus-name">
        <h2 id="project-focus-title"><FocusText text={preview.company} /></h2>
        <p className="project-focus-description"><FocusText text={preview.label} /></p>
      </div>
      <p className="project-focus-period text-captionSans"><FocusText text={period} /></p>
    </div>
    {Boolean(preview.team?.length) && <div className="project-focus-team">
      <h3 className="text-captionSans"><FocusText text="Team" /></h3>
      <ul>{preview.team!.map(member => <li key={member.href}>
        <a href={member.href} target="_blank" rel="noreferrer"><FocusText text={member.name} /></a>
      </li>)}</ul>
    </div>}
  </div>;
}

export function ProjectFocus({ selection, onClose }: { selection: ProjectFocusSelection; onClose: () => void }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const slotRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const topEdgeRef = useRef<HTMLDivElement>(null);
  const bottomEdgeRef = useRef<HTMLDivElement>(null);
  const dismissRef = useRef<() => void>(() => {});

  useLayoutEffect(() => {
    const root = rootRef.current!, slot = slotRef.current!;
    const { trigger, origin } = selection;
    const media = trigger.querySelector<HTMLElement>(".homepage-project-media")!;
    const backdrop = root.querySelector<HTMLElement>(".project-focus-backdrop")!;
    const blur = root.querySelector<HTMLElement>(".project-focus-blur")!;
    const details = root.querySelector<HTMLElement>(".project-focus-details")!;
    const close = closeRef.current!;
    const topEdge = topEdgeRef.current!, bottomEdge = bottomEdgeRef.current!;
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const tokens = getComputedStyle(root);
    const milliseconds = (property: string) => {
      const value = tokens.getPropertyValue(property).trim();
      return parseFloat(value) * (value.endsWith("ms") ? 1 : 1000);
    };
    const handoffDelay = milliseconds("--project-focus-handoff-delay");
    const textExitDuration = milliseconds("--project-focus-text-exit-duration");
    const textEnterDuration = milliseconds("--project-focus-text-enter-duration");
    const timing = {
      duration: milliseconds("--project-focus-duration"),
      easing: `cubic-bezier(${tokens.getPropertyValue("--project-focus-ease").trim()})`,
    };
    const scroll = { x: scrollX, y: scrollY };
    const body = document.body;
    const saved = { position: body.style.position, top: body.style.top, left: body.style.left, width: body.style.width, overflow: body.style.overflow, paddingRight: body.style.paddingRight };
    const scrollbar = innerWidth - document.documentElement.clientWidth;
    body.style.position = "fixed";
    body.style.top = `${-scroll.y}px`;
    body.style.left = `${-scroll.x}px`;
    body.style.width = "100%";
    body.style.overflow = "hidden";
    if (scrollbar) body.style.paddingRight = `${parseFloat(getComputedStyle(body).paddingRight) + scrollbar}px`;
    const siblings = Array.from(body.children).filter((node): node is HTMLElement => node instanceof HTMLElement && node !== root && node !== topEdge && node !== bottomEdge);
    const inert = siblings.map(node => ({ node, previous: node.inert }));
    inert.forEach(({ node }) => { node.inert = true; });

    // Keep opaque sampling strips at the visible edges as Safari expands/collapses its controls.
    const viewport = window.visualViewport;
    let edgeFrame = 0;
    const updateEdges = () => {
      edgeFrame = 0;
      const top = viewport?.offsetTop ?? 0;
      const bottom = top + (viewport?.height ?? innerHeight);
      topEdge.style.top = `${top}px`;
      bottomEdge.style.top = `calc(${bottom}px - max(var(--project-focus-edge-size), var(--viewport-safe-bottom)))`;
      bottomEdge.style.height = `calc(max(var(--project-focus-edge-size), var(--viewport-safe-bottom)) + max(0px, var(--project-focus-full-height) - ${bottom}px) + var(--viewport-safe-bottom))`;
    };
    const scheduleEdges = () => { if (!edgeFrame) edgeFrame = requestAnimationFrame(updateEdges); };
    updateEdges();
    viewport?.addEventListener("resize", scheduleEdges);
    viewport?.addEventListener("scroll", scheduleEdges);
    window.addEventListener("resize", scheduleEdges);
    const previousTheme = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    const theme = previousTheme ?? document.createElement("meta");
    const previousThemeColor = theme.getAttribute("content");
    theme.name = "theme-color";
    theme.content = tokens.getPropertyValue("--bg-fill").trim();
    if (!previousTheme) document.head.appendChild(theme);

    // Move the existing media DOM temporarily: the video decoder and playhead survive the transition.
    // Return it to React's original parent before the portal unmounts.
    slot.appendChild(media);
    const animations: Animation[] = [];
    let closing = false, disposed = false;
    const tweenMedia = (from: DOMRect, to: DOMRect, delay = 0) => {
      const bounds = slot.getBoundingClientRect();
      return media.animate([
        { transform: `translate(${from.left - bounds.left}px, ${from.top - bounds.top}px) scale(${from.width / bounds.width}, ${from.height / bounds.height})` },
        { transform: `translate(${to.left - bounds.left}px, ${to.top - bounds.top}px) scale(${to.width / bounds.width}, ${to.height / bounds.height})` },
      ], { ...timing, duration: motion.matches ? 0 : timing.duration, delay: motion.matches ? 0 : delay, fill: "both" });
    };
    const fade = (element: HTMLElement, from: number, to: number, delay = 0, duration = timing.duration) => element.animate([{ opacity: from }, { opacity: to }], { ...timing, duration: motion.matches ? 0 : duration, delay: motion.matches ? 0 : delay, fill: "both" });
    const isText = (element: HTMLElement) => element === details || element === close;
    const opening = tweenMedia(origin, slot.getBoundingClientRect());
    const faded = [blur, backdrop, details, close];
    animations.push(opening, ...faded.map(element => fade(element, 0, 1, isText(element) ? timing.duration : 0, isText(element) ? textEnterDuration : timing.duration)));
    void opening.finished.then(() => {
      if (!closing && !disposed) opening.cancel();
    }).catch(() => {});
    void Promise.all(animations.map(animation => animation.finished)).then(() => {
      if (!closing && !disposed) root.dataset.phase = "open";
    }).catch(() => {});
    close.focus({ preventScroll: true });

    dismissRef.current = () => {
      if (closing || disposed) return;
      closing = true;
      root.dataset.phase = "closing";
      const from = media.getBoundingClientRect();
      const opacities = faded.map(element => Number(getComputedStyle(element).opacity));
      animations.forEach(animation => animation.cancel());
      const exit = tweenMedia(from, trigger.getBoundingClientRect(), handoffDelay);
      animations.push(exit, ...faded.map((element, index) => fade(element, opacities[index], 0, isText(element) ? 0 : handoffDelay, isText(element) ? textExitDuration : timing.duration)));
      void exit.finished.then(() => { if (!disposed) onClose(); }).catch(() => {});
    };
    const onKeyDown = (event: KeyboardEvent) => {
      root.dataset.input = "keyboard";
      if (event.key === "Escape") {
        event.preventDefault(); event.stopImmediatePropagation(); dismissRef.current();
      } else if (event.key === "Tab") {
        const targets = Array.from(root.querySelectorAll<HTMLElement>('a[href], button:not([disabled])'));
        const first = targets[0], last = targets.at(-1)!;
        if (event.shiftKey && (document.activeElement === first || document.activeElement === root)) {
          event.preventDefault(); last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault(); first.focus();
        }
      }
    };
    const onMotionChange = () => { if (motion.matches) animations.forEach(animation => { if (animation.playState !== "idle") animation.finish(); }); };
    // Reparented media retains its original React event ancestry, so use native capture here.
    const onPointerDown = () => { root.dataset.input = "pointer"; };
    root.addEventListener("pointerdown", onPointerDown, { capture: true });
    window.addEventListener("keydown", onKeyDown, { capture: true });
    motion.addEventListener("change", onMotionChange);
    return () => {
      disposed = true;
      animations.forEach(animation => animation.cancel());
      window.removeEventListener("keydown", onKeyDown, { capture: true });
      root.removeEventListener("pointerdown", onPointerDown, { capture: true });
      motion.removeEventListener("change", onMotionChange);
      cancelAnimationFrame(edgeFrame);
      viewport?.removeEventListener("resize", scheduleEdges);
      viewport?.removeEventListener("scroll", scheduleEdges);
      window.removeEventListener("resize", scheduleEdges);
      if (!previousTheme) theme.remove();
      else if (previousThemeColor === null) theme.removeAttribute("content");
      else theme.content = previousThemeColor;
      trigger.prepend(media);
      inert.forEach(({ node, previous }) => { node.inert = previous; });
      Object.assign(body.style, saved);
      window.scrollTo(scroll.x, scroll.y);
      trigger.focus({ preventScroll: true });
    };
  }, [selection, onClose]);

  return createPortal(<>
    <div ref={topEdgeRef} className="project-focus-edge project-focus-edge-top" aria-hidden="true" />
    <div ref={bottomEdgeRef} className="project-focus-edge project-focus-edge-bottom" aria-hidden="true" />
    <div ref={rootRef} id="project-focus-dialog" className="project-focus-root" role="dialog" aria-modal="true" aria-labelledby="project-focus-title" data-phase="opening" data-input={selection.keyboard ? "keyboard" : "pointer"} tabIndex={-1}>
    <div className="project-focus-blur" aria-hidden="true" />
    <div className="project-focus-backdrop" aria-hidden="true" />
    <div className="project-focus-top-surface" aria-hidden="true" />
    <div className="project-focus-scroll" onClick={event => { if (event.target === event.currentTarget) dismissRef.current(); }}>
      <div className="project-focus-panel">
        <div ref={slotRef} className="project-focus-media-slot" />
        <ProjectFocusDetails preview={selection.preview} />
      </div>
    </div>
    <button ref={closeRef} type="button" className="project-focus-close text-bodySans" onClick={() => dismissRef.current()}><FocusText text="Close" /></button>
    </div>
  </>, document.body);
}
