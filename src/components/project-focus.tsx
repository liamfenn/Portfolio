"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { createPortal, flushSync } from "react-dom";
import { InspectableText } from "@/components/design-inspector";
import { usePortfolioExperiments } from "@/components/portfolio-experiments";
import type { ProjectPreview } from "@/lib/project-previews";
import { ProjectFocusMedia } from "@/lib/project-focus-media";
import { useProjectFocusPaging } from "@/hooks/use-project-focus-paging";

export type ProjectFocusSelection = { preview: ProjectPreview; trigger: HTMLButtonElement; origin: DOMRect; keyboard: boolean; navigation?: boolean };

function FocusText({ text }: { text: string }) {
  return <InspectableText text={text}><span className="project-focus-text" data-focus-text={text}>{text}</span></InspectableText>;
}

export function ProjectFocusDetails({ preview, titleId = "project-focus-title", exitHeight }: { preview: ProjectPreview; titleId?: string; exitHeight?: number }) {
  if (exitHeight !== undefined) return <div className="project-focus-details text-bodySans" style={{ height: exitHeight }} />;
  const period = `${preview.quarter ? `Q${preview.quarter} ` : ""}${String(preview.year).slice(-2)}`;
  return <div className="project-focus-details text-bodySans">
    <div className="project-focus-heading">
      <div className="project-focus-name">
        <h2 id={titleId || undefined}><FocusText text={preview.company} /></h2>
        <p className="project-focus-description"><FocusText text={preview.label} /></p>
      </div>
      <p className="project-focus-period text-captionSans"><FocusText text={period} /></p>
    </div>
    {preview.description && <p className="project-focus-summary text-bodySerif"><InspectableText>{preview.description}</InspectableText></p>}
    {Boolean(preview.team?.length || preview.tech?.length) && <div className="project-focus-credits">
      {Boolean(preview.team?.length) && <div className="project-focus-team">
        <h3 className="text-captionSans"><FocusText text="Contributors" /></h3>
        <ul>{preview.team!.map(member => <li key={member.href}>
          <a href={member.href} target="_blank" rel="noreferrer"><FocusText text={member.name} /></a>
        </li>)}</ul>
      </div>}
      {Boolean(preview.tech?.length) && <div className="project-focus-tech">
        <h3 className="text-captionSans"><FocusText text="Tech" /></h3>
        <ul>{preview.tech!.map(technology => <li key={technology}><FocusText text={technology} /></li>)}</ul>
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
  const [focusMedia] = useState(() => new ProjectFocusMedia());
  const [exitTextHeight, setExitTextHeight] = useState<number>();
  const { navigate, animatePage, retainsMedia, cancelPaging, neighborDirection, neighborRef } = useProjectFocusPaging({ rootRef, pagesRef, scrollRef, controlsRef, selection, onNavigate, total, focusMedia });

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

    const stopMedia = focusMedia.start(scrollRef.current!);

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
    // Native capture keeps keyboard/pointer focus treatment consistent across controls and content.
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
      stopMedia();
      opener.focus({ preventScroll: true });
    };
  }, [navigate, focusMedia]);

  useLayoutEffect(() => {
    const root = rootRef.current!, slot = slotRef.current!, controls = controlsRef.current!;
    const { trigger, origin, navigation } = selection;
    const media = trigger.querySelector<HTMLElement>(".homepage-project-media")!;
    const backdrop = root.querySelector<HTMLElement>(".project-focus-backdrop")!;
    const blur = root.querySelector<HTMLElement>(".project-focus-blur")!;
    const bottomFade = root.querySelector<HTMLElement>(".project-focus-bottom-fade")!;
    const details = root.querySelector<HTMLElement>(".project-focus-details")!;
    const textRows = Array.from(details.querySelectorAll<HTMLElement>("h2, .project-focus-description, .project-focus-period, .project-focus-summary, h3, li"))
      .map(element => ({ element, top: element.getBoundingClientRect().top }))
      .sort((a, b) => a.top - b.top);
    const rowTops = [...new Set(textRows.map(row => row.top))];
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const tokens = getComputedStyle(root);
    const milliseconds = (property: string) => {
      const value = tokens.getPropertyValue(property).trim();
      return parseFloat(value) * (value.endsWith("ms") ? 1 : 1000);
    };
    const textEnterDelay = milliseconds("--project-focus-text-enter-delay");
    const textEnterDuration = milliseconds("--project-focus-text-enter-duration");
    const textStagger = milliseconds("--project-focus-text-stagger");
    const textExitDuration = milliseconds("--project-focus-text-exit-duration");
    const textExitStagger = textStagger * textExitDuration / textEnterDuration;
    const timing = { duration: milliseconds("--project-focus-duration"), easing: `cubic-bezier(${tokens.getPropertyValue("--project-focus-ease").trim()})` };
    root.dataset.phase = "opening";
    root.querySelector<HTMLElement>(".project-focus-scroll")!.scrollTop = 0;
    focusMedia.attach(trigger, slot);
    const animations: Animation[] = [];
    animationsRef.current = animations;
    let closing = false, disposed = false;
    let exitPaint = 0;
    const tweenMedia = (from: DOMRect, to: DOMRect) => focusMedia.animate(media, from, to, { ...timing, duration: motion.matches ? 0 : timing.duration, fill: "both" });
    const fade = (element: HTMLElement, from: number, to: number, delay = 0, duration = timing.duration) => element.animate([{ opacity: from }, { opacity: to }], { ...timing, duration: motion.matches ? 0 : duration, delay: motion.matches ? 0 : delay, fill: "both" });
    const bounds = slot.getBoundingClientRect();
    const pageAnimations = navigation ? animatePage(motion.matches) : null;
    const opening = pageAnimations?.[0] ?? tweenMedia(navigation ? bounds : origin, bounds);
    const backgrounds = [blur, backdrop, bottomFade];
    animations.push(...(pageAnimations ?? [opening]));
    if (!navigation) animations.push(
      ...backgrounds.map(element => fade(element, 0, 1)),
      ...textRows.map(({ element, top }) => fade(element, 0, 1, textEnterDelay + rowTops.indexOf(top) * textStagger, textEnterDuration)),
    );
    void Promise.allSettled(animations.map(animation => animation.finished)).then(() => {
      if (!closing && !disposed) { focusMedia.settle(media); root.dataset.phase = "open"; }
    });
    if (!root.contains(document.activeElement)) closeRef.current!.focus({ preventScroll: true });

    dismissRef.current = () => {
      if (closing || disposed) return;
      cancelPaging();
      closing = true;
      root.dataset.phase = "closing";
      root.dataset.exit = "controls";
      const scroller = scrollRef.current!;
      if (scroller.scrollHeight > scroller.clientHeight) scroller.style.scrollbarGutter = "stable";
      scroller.style.overflowY = "hidden";
      focusMedia.hold(media);
      const opacity = Number(getComputedStyle(media).opacity);
      const backgroundOpacities = backgrounds.map(element => Number(getComputedStyle(element).opacity));
      const controlsOpacity = Number(getComputedStyle(controls).opacity);
      // Preserve partially revealed rows when closing before their entrance finishes.
      const rowOpacities = textRows.map(({ element }) => Number(getComputedStyle(element).opacity));
      animations.forEach(animation => animation.cancel());
      backgrounds.forEach((element, index) => { element.style.opacity = String(backgroundOpacities[index]); });
      textRows.forEach(({ element }, index) => { element.style.opacity = String(rowOpacities[index]); });
      const controlsExit = fade(controls, controlsOpacity, 0);
      animations.push(controlsExit);
      void controlsExit.finished.then(async () => {
        if (disposed) return;
        controls.style.visibility = "hidden";
        root.dataset.exit = "text";
        const textExit = textRows.map(({ element, top }, index) => fade(element, rowOpacities[index], 0, (rowTops.length - 1 - rowTops.indexOf(top)) * textExitStagger, textExitDuration));
        animations.push(...textExit);
        await Promise.all(textExit.map(animation => animation.finished));
        if (disposed) return;
        const height = details.getBoundingClientRect().height;
        details.style.visibility = "hidden";
        flushSync(() => setExitTextHeight(height));
        root.dataset.exit = "paint";
        const returnMedia = () => {
          if (disposed) return;
          root.dataset.exit = "media";
          // Read geometry after scrolling is locked and the text's removal has actually painted.
          const exit = tweenMedia(media.getBoundingClientRect(), trigger.getBoundingClientRect());
          animations.push(exit, ...backgrounds.map((element, index) => fade(element, backgroundOpacities[index], 0)));
          if (opacity < 1) animations.push(fade(media, opacity, 1, 0, textExitDuration));
          void exit.finished.then(() => {
            if (disposed) return;
            root.style.visibility = "hidden";
            onClose();
          }).catch(() => {});
        };
        // A timer shorter than the text fade let media cross glyphs retained by Safari after paging.
        if (motion.matches) returnMedia();
        else exitPaint = requestAnimationFrame(() => { exitPaint = requestAnimationFrame(returnMedia); });
      }).catch(() => {});
    };
    return () => {
      disposed = true;
      cancelAnimationFrame(exitPaint);
      animations.forEach(animation => animation.cancel());
      if (!retainsMedia(media)) focusMedia.restore(media);
      if (animationsRef.current === animations) animationsRef.current = [];
    };
  }, [selection, onClose, animatePage, retainsMedia, cancelPaging, focusMedia]);

  const neighbor = neighborDirection === -1 ? neighbors.previous : neighbors.next;
  useLayoutEffect(() => {
    const slot = neighborRef.current?.querySelector<HTMLElement>(".project-focus-media-slot");
    if (!neighborDirection || !slot) return;
    const trigger = selection.trigger.closest(".project-grid")?.querySelector<HTMLButtonElement>(`[data-project-id="${neighbor.id}"] .homepage-card-trigger`);
    if (!trigger) return;
    const media = focusMedia.attach(trigger, slot, "preview");
    return () => { queueMicrotask(() => focusMedia.restore(media, slot)); };
  }, [neighborDirection, neighbor, neighborRef, selection.trigger, focusMedia]);

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
    <div ref={scrollRef} className="project-focus-scroll" onClick={event => {
      if (event.target !== event.currentTarget) return;
      const bounds = event.currentTarget.querySelector(".project-focus-panel")!.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dismissRef.current();
    }}>
      <div className="project-focus-panel">
        <div ref={slotRef} className="project-focus-media-slot" role={selection.preview.media ? "img" : undefined} aria-label={selection.preview.media?.alt} />
        <ProjectFocusDetails preview={selection.preview} exitHeight={exitTextHeight} />
      </div>
    </div>
    {neighborDirection && <div ref={neighborRef} className="project-focus-paging-page" data-paging-neighbor="" aria-hidden="true" inert>
      <div className="project-focus-panel">
        <div className="project-focus-media-slot" />
        <ProjectFocusDetails preview={neighbor} titleId="" />
      </div>
    </div>}
    </div>
    <div className="project-focus-bottom-fade" aria-hidden="true" />
    <div ref={controlsRef} className="project-focus-controls" role="group" aria-label="Project navigation">
      <button type="button" className="project-focus-action project-focus-step text-bodySans" aria-label="Previous project" aria-keyshortcuts="P ArrowLeft" onClick={event => navigate(-1, event.detail === 0)}><InspectableText>P</InspectableText></button>
      <button ref={closeRef} type="button" className="project-focus-action project-focus-close text-bodySans" onClick={() => dismissRef.current()}><InspectableText>Close</InspectableText></button>
      <button type="button" className="project-focus-action project-focus-step text-bodySans" aria-label="Next project" aria-keyshortcuts="N ArrowRight" onClick={event => navigate(1, event.detail === 0)}><InspectableText>N</InspectableText></button>
    </div>
    <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">Project {position} of {total}: {selection.preview.label}, {selection.preview.company}, {selection.preview.period}</span>
    </div>
  </>, document.body);
}
