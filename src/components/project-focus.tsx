"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import type { CSSProperties } from "react";
import { createPortal } from "react-dom";
import { useReducedMotion } from "motion/react";
import { InspectableText } from "@/components/design-inspector";
import { usePortfolioExperiments } from "@/components/portfolio-experiments";
import type { ProjectPreview } from "@/lib/project-previews";
import { FILTER_SCRAMBLE } from "@/lib/text-scramble";
import { currentGlyphPalette } from "@/lib/palette-toy";
import { preserveVideoFrame } from "@/lib/video-playback";
import { mediaUrl } from "@/lib/media-delivery";
import { useProjectFocusPaging } from "@/hooks/use-project-focus-paging";

export type ProjectFocusSelection = { preview: ProjectPreview; trigger: HTMLButtonElement; origin: DOMRect; keyboard: boolean; navigation?: boolean };

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
    const opening = [...(media?.getAnimations() ?? []), ...(root?.querySelector(".project-focus-scroll")?.getAnimations() ?? [])];
    // Tie the reveal to the real media handoff instead of racing its animation with a timer.
    void Promise.all([...opening.map(animation => animation.finished), document.fonts.ready]).then(() => {
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

function FocusText({ text, reveal = true }: { text: string; reveal?: boolean }) {
  const reducedMotion = useReducedMotion();
  return <InspectableText text={text}><span className="project-focus-text" data-focus-text={text}>
    <span className="project-focus-text-reserve" aria-hidden="true">{text}</span>
    {reducedMotion || !reveal ? <span className="project-focus-glyphs" data-reveal="settled" aria-hidden="true">{text}</span> : <FocusGlitch text={text} />}
    <span className="sr-only">{text}</span>
  </span></InspectableText>;
}

export function ProjectFocusDetails({ preview, reveal = true, titleId = "project-focus-title" }: { preview: ProjectPreview; reveal?: boolean; titleId?: string }) {
  const period = `${preview.quarter ? `Q${preview.quarter} ` : ""}${String(preview.year).slice(-2)}`;
  return <div className="project-focus-details text-bodySans">
    <div className="project-focus-heading">
      <div className="project-focus-name">
        <h2 id={titleId || undefined}><FocusText text={preview.company} reveal={reveal} /></h2>
        <p className="project-focus-description"><FocusText text={preview.label} reveal={reveal} /></p>
      </div>
      <p className="project-focus-period text-captionSans"><FocusText text={period} reveal={reveal} /></p>
    </div>
    {preview.description && <p className="project-focus-summary text-bodySerif"><InspectableText>{preview.description}</InspectableText></p>}
    {Boolean(preview.team?.length || preview.tech?.length) && <div className="project-focus-credits">
      {Boolean(preview.team?.length) && <div className="project-focus-team">
        <h3 className="text-captionSans"><FocusText text="Contributors" reveal={reveal} /></h3>
        <ul>{preview.team!.map(member => <li key={member.href}>
          <a href={member.href} target="_blank" rel="noreferrer"><FocusText text={member.name} reveal={reveal} /></a>
        </li>)}</ul>
      </div>}
      {Boolean(preview.tech?.length) && <div className="project-focus-tech">
        <h3 className="text-captionSans"><FocusText text="Tech" reveal={reveal} /></h3>
        <ul>{preview.tech!.map(technology => <li key={technology}><FocusText text={technology} reveal={reveal} /></li>)}</ul>
      </div>}
    </div>}
  </div>;
}

export function ProjectFocus({ selection, neighbors, onClose, onNavigate, position, total }: { selection: ProjectFocusSelection; neighbors: { previous: ProjectPreview; next: ProjectPreview }; onClose: () => void; onNavigate: (direction: -1 | 1, keyboard: boolean) => void; position: number; total: number }) {
  const { safariEdgeTestEnabled } = usePortfolioExperiments();
  const rootRef = useRef<HTMLDivElement>(null);
  const slotRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const controlsRef = useRef<HTMLDivElement>(null);
  const pagesRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const topEdgeRef = useRef<HTMLDivElement>(null);
  const bottomEdgeRef = useRef<HTMLDivElement>(null);
  const dismissRef = useRef<() => void>(() => {});
  const initialSelection = useRef(selection);
  const { navigate, animatePage, retainsMedia, cancelPaging, neighborDirection, neighborRef } = useProjectFocusPaging({ rootRef, pagesRef, scrollRef, controlsRef, selection, onNavigate, total });

  const animationsRef = useRef<Animation[]>([]);

  // Keep the page locked for the entire focus session, including project-to-project navigation.
  useLayoutEffect(() => {
    const root = rootRef.current!, topEdge = topEdgeRef.current!, bottomEdge = bottomEdgeRef.current!;
    const opener = initialSelection.current.trigger;
    const body = document.body, scroll = { x: scrollX, y: scrollY };
    const saved = { position: body.style.position, top: body.style.top, left: body.style.left, width: body.style.width, overflow: body.style.overflow, paddingRight: body.style.paddingRight };
    const scrollbar = innerWidth - document.documentElement.clientWidth;
    body.style.position = "fixed";
    body.style.top = `${-scroll.y}px`;
    body.style.left = `${-scroll.x}px`;
    body.style.width = "100%";
    body.style.overflow = "hidden";
    if (scrollbar) body.style.paddingRight = `${parseFloat(getComputedStyle(body).paddingRight) + scrollbar}px`;
    const siblings = Array.from(body.children).filter((node): node is HTMLElement => node instanceof HTMLElement && node !== root && node !== topEdge && node !== bottomEdge && !node.hasAttribute("data-safari-edge-test"));
    const inert = siblings.map(node => ({ node, previous: node.inert }));
    inert.forEach(({ node }) => { node.inert = true; });

    const previousTheme = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    const theme = previousTheme ?? document.createElement("meta");
    const previousThemeColor = theme.getAttribute("content");
    theme.name = "theme-color";
    theme.content = getComputedStyle(root).getPropertyValue("--bg-fill").trim();
    if (!previousTheme) document.head.appendChild(theme);

    const onKeyDown = (event: KeyboardEvent) => {
      root.dataset.input = "keyboard";
      const key = event.key.toLowerCase();
      const previous = key === "p" || key === "arrowleft";
      const next = key === "n" || key === "arrowright";
      if (!event.altKey && !event.ctrlKey && !event.metaKey && (previous || next) && root.dataset.phase !== "closing") {
        event.preventDefault(); event.stopImmediatePropagation();
        navigate(previous ? -1 : 1, true, true);
      } else if (event.key === "Escape") {
        event.preventDefault(); event.stopImmediatePropagation(); dismissRef.current();
      } else if (event.key === "Tab") {
        const targets = Array.from(root.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')).filter(node => !node.closest("[inert]"));
        const first = targets[0], last = targets.at(-1)!;
        if (event.shiftKey && (document.activeElement === first || document.activeElement === root)) {
          event.preventDefault(); last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault(); first.focus();
        }
      }
    };
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const onMotionChange = () => { if (motion.matches) animationsRef.current.forEach(animation => { if (animation.playState !== "idle") animation.finish(); }); };
    // Reparented media retains its original React event ancestry, so use native capture here.
    const onPointerDown = () => { root.dataset.input = "pointer"; };
    root.addEventListener("pointerdown", onPointerDown, { capture: true });
    window.addEventListener("keydown", onKeyDown, { capture: true });
    motion.addEventListener("change", onMotionChange);
    closeRef.current!.focus({ preventScroll: true });
    return () => {
      window.removeEventListener("keydown", onKeyDown, { capture: true });
      root.removeEventListener("pointerdown", onPointerDown, { capture: true });
      motion.removeEventListener("change", onMotionChange);
      if (!previousTheme) theme.remove();
      else if (previousThemeColor === null) theme.removeAttribute("content");
      else theme.content = previousThemeColor;
      inert.forEach(({ node, previous }) => { node.inert = previous; });
      Object.assign(body.style, saved);
      window.scrollTo(scroll.x, scroll.y);
      opener.focus({ preventScroll: true });
    };
  }, [navigate]);

  useLayoutEffect(() => {
    const root = rootRef.current!, slot = slotRef.current!, controls = controlsRef.current!;
    const { trigger, origin, preview, navigation } = selection;
    const media = trigger.querySelector<HTMLElement>(".homepage-project-media")!;
    const backdrop = root.querySelector<HTMLElement>(".project-focus-backdrop")!;
    const blur = root.querySelector<HTMLElement>(".project-focus-blur")!;
    const bottomFade = root.querySelector<HTMLElement>(".project-focus-bottom-fade")!;
    const details = root.querySelector<HTMLElement>(".project-focus-details")!;
    const summary = root.querySelector<HTMLElement>(".project-focus-summary");
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const tokens = getComputedStyle(root);
    const milliseconds = (property: string) => {
      const value = tokens.getPropertyValue(property).trim();
      return parseFloat(value) * (value.endsWith("ms") ? 1 : 1000);
    };
    const handoffDelay = milliseconds("--project-focus-handoff-delay");
    const textExitDuration = milliseconds("--project-focus-text-exit-duration");
    const textEnterDuration = milliseconds("--project-focus-text-enter-duration");
    const timing = { duration: milliseconds("--project-focus-duration"), easing: `cubic-bezier(${tokens.getPropertyValue("--project-focus-ease").trim()})` };
    const labels = [preview.company, preview.label, `${preview.quarter ? `Q${preview.quarter} ` : ""}${String(preview.year).slice(-2)}`, ...(preview.team?.length ? ["Contributors", ...preview.team.map(member => member.name)] : []), ...(preview.tech?.length ? ["Tech", ...preview.tech] : []), "P", "Close", "N"];
    const cycles = FILTER_SCRAMBLE.scramble + Math.ceil(FILTER_SCRAMBLE.scramble / 2);
    const descriptionDuration = (Math.max(...labels.map(label => Array.from(label).length)) - 1 + cycles) * 1000 / (60 * FILTER_SCRAMBLE.speed);
    root.dataset.phase = "opening";
    root.querySelector<HTMLElement>(".project-focus-scroll")!.scrollTop = 0;
    // Reuse the actual media element and return it before React removes its source card.
    slot.appendChild(media);
    const animations: Animation[] = [];
    animationsRef.current = animations;
    let closing = false, disposed = false;
    const tweenMedia = (from: DOMRect, to: DOMRect, delay = 0) => {
      const bounds = slot.getBoundingClientRect();
      return media.animate([
        { transform: `translate(${from.left - bounds.left}px, ${from.top - bounds.top}px) scale(${from.width / bounds.width}, ${from.height / bounds.height})` },
        { transform: `translate(${to.left - bounds.left}px, ${to.top - bounds.top}px) scale(${to.width / bounds.width}, ${to.height / bounds.height})` },
      ], { ...timing, duration: motion.matches ? 0 : timing.duration, delay: motion.matches ? 0 : delay, fill: "both" });
    };
    const fade = (element: HTMLElement, from: number, to: number, delay = 0, duration = timing.duration) => element.animate([{ opacity: from }, { opacity: to }], { ...timing, duration: motion.matches ? 0 : duration, delay: motion.matches ? 0 : delay, fill: "both" });
    const isText = (element: HTMLElement) => element === details || element === controls || element === summary;
    const bounds = slot.getBoundingClientRect();
    const pageAnimations = navigation ? animatePage(motion.matches) : null;
    const opening = pageAnimations?.[0] ?? tweenMedia(navigation ? bounds : origin, bounds);
    const faded = [blur, backdrop, bottomFade, details, controls, ...(summary ? [summary] : [])];
    animations.push(...(pageAnimations ?? [opening]), ...faded.map(element => {
      if (navigation) return fade(element, 1, 1, 0, 0);
      return fade(element, 0, 1, isText(element) ? timing.duration : 0, element === summary ? descriptionDuration : isText(element) ? textEnterDuration : timing.duration);
    }));
    void opening.finished.then(() => { if (!closing && !disposed) opening.cancel(); }).catch(() => {});
    void Promise.all(animations.map(animation => animation.finished)).then(() => { if (!closing && !disposed) root.dataset.phase = "open"; }).catch(() => {});
    if (!root.contains(document.activeElement)) closeRef.current!.focus({ preventScroll: true });

    dismissRef.current = () => {
      if (closing || disposed) return;
      cancelPaging();
      closing = true;
      root.dataset.phase = "closing";
      const from = media.getBoundingClientRect();
      const opacity = Number(getComputedStyle(media).opacity);
      const opacities = faded.map(element => Number(getComputedStyle(element).opacity));
      animations.forEach(animation => animation.cancel());
      const exit = tweenMedia(from, trigger.getBoundingClientRect(), handoffDelay);
      animations.push(exit, ...faded.map((element, index) => fade(element, opacities[index], 0, isText(element) ? 0 : handoffDelay, isText(element) ? textExitDuration : timing.duration)));
      if (opacity < 1) animations.push(fade(media, opacity, 1, 0, textExitDuration));
      void exit.finished.then(() => { if (!disposed) onClose(); }).catch(() => {});
    };
    return () => {
      disposed = true;
      animations.forEach(animation => animation.cancel());
      if (!retainsMedia(media)) {
        const video = media.querySelector("video");
        if (video) preserveVideoFrame(video);
        trigger.prepend(media);
      }
      if (animationsRef.current === animations) animationsRef.current = [];
    };
  }, [selection, onClose, animatePage, retainsMedia, cancelPaging]);

  const neighbor = neighborDirection === -1 ? neighbors.previous : neighbors.next;
  const poster = neighbor.media?.kind === "video" ? neighbor.media.poster : neighbor.media?.src;

  return createPortal(<>
    <div ref={topEdgeRef} className="project-focus-edge project-focus-edge-top" aria-hidden="true" />
    <div ref={bottomEdgeRef} className="project-focus-edge project-focus-edge-bottom" aria-hidden="true" />
    {safariEdgeTestEnabled && <>
      <div className="safari-edge-test safari-edge-test-top" data-safari-edge-test="top" aria-hidden="true" />
      <div className="safari-edge-test safari-edge-test-bottom" data-safari-edge-test="bottom" aria-hidden="true" />
    </>}
    <div ref={rootRef} id="project-focus-dialog" className="project-focus-root" role="dialog" aria-modal="true" aria-labelledby="project-focus-title" data-phase="opening" data-focus-project={selection.preview.id} data-input={initialSelection.current.keyboard ? "keyboard" : "pointer"} tabIndex={-1}>
    <div className="project-focus-blur" aria-hidden="true" />
    <div className="project-focus-backdrop" aria-hidden="true" />
    <div ref={pagesRef} className="project-focus-pages">
    <div ref={scrollRef} className="project-focus-scroll" onClick={event => { if (event.target === event.currentTarget) dismissRef.current(); }}>
      <div className="project-focus-panel">
        <div ref={slotRef} className="project-focus-media-slot" />
        <ProjectFocusDetails key={selection.preview.id} preview={selection.preview} reveal={!selection.navigation} />
      </div>
    </div>
    {neighborDirection && <div ref={neighborRef} className="project-focus-paging-page" data-paging-neighbor="" aria-hidden="true" inert>
      <div className="project-focus-panel">
        <div className="project-focus-media-slot"><span className="homepage-project-media">
          {poster && <span className="project-preview-media" style={{ "--media-backdrop": neighbor.media?.backdrop } as CSSProperties}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="project-preview-poster" src={mediaUrl(poster)} alt="" />
          </span>}
        </span></div>
        <ProjectFocusDetails preview={neighbor} reveal={false} titleId="" />
      </div>
    </div>}
    </div>
    <div className="project-focus-bottom-fade" aria-hidden="true" />
    <div ref={controlsRef} className="project-focus-controls" role="group" aria-label="Project navigation">
      <button type="button" className="project-focus-action project-focus-step text-bodySans" aria-label="Previous project" aria-keyshortcuts="P ArrowLeft" onClick={event => navigate(-1, event.detail === 0)}><FocusText text="P" /></button>
      <button ref={closeRef} type="button" className="project-focus-action project-focus-close text-bodySans" onClick={() => dismissRef.current()}><FocusText text="Close" /></button>
      <button type="button" className="project-focus-action project-focus-step text-bodySans" aria-label="Next project" aria-keyshortcuts="N ArrowRight" onClick={event => navigate(1, event.detail === 0)}><FocusText text="N" /></button>
    </div>
    <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">Project {position} of {total}: {selection.preview.label}, {selection.preview.company}, {selection.preview.period}</span>
    </div>
  </>, document.body);
}
