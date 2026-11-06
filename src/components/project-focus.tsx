"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { InspectableText } from "@/components/design-inspector";
import { usePortfolioExperiments } from "@/components/portfolio-experiments";
import type { ProjectPreview } from "@/lib/project-previews";
import { ProjectFocusMedia } from "@/lib/project-focus-media";
import { useProjectFocusPaging } from "@/hooks/use-project-focus-paging";
import { scaledBox, swipesToDismiss, tileOnScreen } from "@/lib/project-paging";

export type ProjectFocusSelection = { preview: ProjectPreview; trigger: HTMLButtonElement; origin: DOMRect; keyboard: boolean; navigation?: boolean };

function FocusText({ text }: { text: string }) {
  return <InspectableText text={text}><span className="project-focus-text" data-focus-text={text}>{text}</span></InspectableText>;
}

export function ProjectFocusDetails({ preview }: { preview: ProjectPreview }) {
  return <div className="project-focus-details text-bodySans">
    {preview.description && <p className="project-focus-summary text-bodySerif"><InspectableText>{preview.description}</InspectableText></p>}
    <ProjectCredits preview={preview} techLabel="Tech" textStyle="text-bodySans" />
  </div>;
}

export function ProjectCredits({ preview, techLabel = "Stack", textStyle = "text-captionSans" }: { preview: ProjectPreview; techLabel?: string; textStyle?: string }) {
  if (!preview.team?.length && !preview.tech?.length) return null;
  return <div className={`project-focus-credits ${textStyle}`}>
    {Boolean(preview.team?.length) && <div className="project-focus-team">
      <h3 className={textStyle}><FocusText text="Contributors" /></h3>
      <ul>{preview.team!.map(member => <li key={member.href}>
        <a href={member.href} target="_blank" rel="noreferrer"><FocusText text={member.name} /></a>
      </li>)}</ul>
    </div>}
    {Boolean(preview.tech?.length) && <div className="project-focus-tech">
      <h3 className={textStyle}><FocusText text={techLabel} /></h3>
      <ul>{preview.tech!.map(technology => <li key={technology}><FocusText text={technology} /></li>)}</ul>
    </div>}
  </div>;
}

export function ProjectFocus({ selection, neighbors, onClose, onClosing, onNavigate, position, total }: { selection: ProjectFocusSelection; neighbors: { previous: ProjectPreview; next: ProjectPreview }; onClose: () => void; onClosing?: () => void; onNavigate: (direction: -1 | 1, keyboard: boolean) => void; position: number; total: number }) {
  const { safariEdgeTestEnabled } = usePortfolioExperiments();
  const rootRef = useRef<HTMLDivElement>(null);
  const slotRef = useRef<HTMLDivElement>(null);
  const pagesRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const topEdgeRef = useRef<HTMLDivElement>(null);
  const bottomEdgeRef = useRef<HTMLDivElement>(null);
  const dismissRef = useRef<() => void>(() => {});
  const initialSelection = useRef(selection);
  const [focusMedia] = useState(() => new ProjectFocusMedia());
  const { navigate, animatePage, retainsMedia, cancelPaging, neighborDirection, neighborRef } = useProjectFocusPaging({ rootRef, pagesRef, scrollRef, selection, onNavigate, total, focusMedia });

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
      const previous = event.key === "ArrowLeft";
      if (!event.altKey && !event.ctrlKey && !event.metaKey && (previous || event.key === "ArrowRight") && root.dataset.phase !== "closing") {
        event.preventDefault(); event.stopImmediatePropagation();
        navigate(previous ? -1 : 1, true);
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
    window.addEventListener("keydown", onKeyDown, { capture: true });
    motion.addEventListener("change", onMotionChange);
    root.focus({ preventScroll: true });
    return () => {
      window.removeEventListener("keydown", onKeyDown, { capture: true });
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
    const root = rootRef.current!, slot = slotRef.current!;
    const { trigger, origin, navigation } = selection;
    const media = trigger.querySelector<HTMLElement>(".homepage-project-media")!;
    const backdrop = root.querySelector<HTMLElement>(".project-focus-backdrop")!;
    const blur = root.querySelector<HTMLElement>(".project-focus-blur")!;
    const details = root.querySelector<HTMLElement>(".project-focus-details")!;
    const textRows = Array.from(details.querySelectorAll<HTMLElement>(".project-focus-summary, h3, li"))
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
    const timing = { duration: milliseconds("--project-focus-duration"), easing: `cubic-bezier(${tokens.getPropertyValue("--project-focus-ease").trim()})` };
    root.dataset.phase = "opening";
    root.querySelector<HTMLElement>(".project-focus-scroll")!.scrollTop = 0;
    focusMedia.attach(trigger, slot);
    const animations: Animation[] = [];
    animationsRef.current = animations;
    let closing = false, disposed = false;
    const tweenMedia = (from: DOMRect, to: DOMRect) => focusMedia.animate(media, from, to, { ...timing, duration: motion.matches ? 0 : timing.duration, fill: "both" });
    const fade = (element: HTMLElement, from: number, to: number, delay = 0, duration = timing.duration) => element.animate([{ opacity: from }, { opacity: to }], { ...timing, duration: motion.matches ? 0 : duration, delay: motion.matches ? 0 : delay, fill: "both" });
    const bounds = slot.getBoundingClientRect();
    const pageAnimations = navigation ? animatePage(motion.matches) : null;
    const opening = pageAnimations?.[0] ?? tweenMedia(navigation ? bounds : origin, bounds);
    const backgrounds = [blur, backdrop];
    animations.push(...(pageAnimations ?? [opening]));
    if (!navigation) animations.push(
      ...backgrounds.map(element => fade(element, 0, 1)),
      ...textRows.map(({ element, top }) => fade(element, 0, 1, textEnterDelay + rowTops.indexOf(top) * textStagger, textEnterDuration)),
    );
    void Promise.allSettled(animations.map(animation => animation.finished)).then(() => {
      if (!closing && !disposed) { focusMedia.settle(media); root.dataset.phase = "open"; }
    });
    if (!root.contains(document.activeElement)) root.focus({ preventScroll: true });

    dismissRef.current = () => {
      if (closing || disposed) return;
      cancelPaging();
      closing = true;
      onClosing?.();
      root.dataset.phase = "closing";
      const scroller = scrollRef.current!;
      if (scroller.scrollHeight > scroller.clientHeight) scroller.style.scrollbarGutter = "stable";
      scroller.style.overflowY = "hidden";
      focusMedia.hold(media);
      const opacity = Number(getComputedStyle(media).opacity);
      const backgroundOpacities = backgrounds.map(element => Number(getComputedStyle(element).opacity));
      animations.forEach(animation => animation.cancel());
      backgrounds.forEach((element, index) => { element.style.opacity = String(backgroundOpacities[index]); });
      // The text goes instantly: even a short fade let the returning media cross it.
      details.style.visibility = "hidden";
      // After paging, the tile may be off screen, where a flight back only reads as a snap, so the media collapses in place.
      const from = media.getBoundingClientRect(), tile = trigger.getBoundingClientRect();
      const returns = tileOnScreen(tile, innerWidth, innerHeight);
      const collapse = parseFloat(tokens.getPropertyValue("--project-focus-collapse-scale"));
      const exit = tweenMedia(from, returns ? tile : scaledBox(from, collapse) as DOMRect);
      animations.push(exit, ...backgrounds.map((element, index) => fade(element, backgroundOpacities[index], 0)));
      if (!returns) animations.push(fade(media, opacity, 0));
      else if (opacity < 1) animations.push(fade(media, opacity, 1));
      void exit.finished.then(() => {
        if (disposed) return;
        root.style.visibility = "hidden";
        onClose();
      }).catch(() => {});
    };
    return () => {
      disposed = true;
      animations.forEach(animation => animation.cancel());
      if (!retainsMedia(media)) focusMedia.restore(media);
      if (animationsRef.current === animations) animationsRef.current = [];
    };
  }, [selection, onClose, onClosing, animatePage, retainsMedia, cancelPaging, focusMedia]);

  // Vertical swipes belong to native scrolling, which cancels pointer events, so this listens to touches.
  useLayoutEffect(() => {
    const scroller = scrollRef.current!;
    const mobile = matchMedia("(max-width: 767px)");
    let start: { x: number; y: number; scrollTop: number } | null = null;
    const touchStart = (event: TouchEvent) => {
      const touch = event.touches[0];
      start = mobile.matches && event.touches.length === 1 ? { x: touch.clientX, y: touch.clientY, scrollTop: scroller.scrollTop } : null;
    };
    const touchEnd = (event: TouchEvent) => {
      const touch = event.changedTouches[0];
      const distance = parseFloat(getComputedStyle(scroller).getPropertyValue("--project-focus-swipe-exit-distance"));
      if (start && touch && swipesToDismiss(touch.clientX - start.x, touch.clientY - start.y, start.scrollTop, distance)) dismissRef.current();
      start = null;
    };
    const cancel = () => { start = null; };
    scroller.addEventListener("touchstart", touchStart, { passive: true });
    scroller.addEventListener("touchend", touchEnd, { passive: true });
    scroller.addEventListener("touchcancel", cancel, { passive: true });
    return () => {
      scroller.removeEventListener("touchstart", touchStart);
      scroller.removeEventListener("touchend", touchEnd);
      scroller.removeEventListener("touchcancel", cancel);
    };
  }, []);

  const neighbor = neighborDirection === -1 ? neighbors.previous : neighbors.next;
  useLayoutEffect(() => {
    const slot = neighborRef.current?.querySelector<HTMLElement>(".project-focus-media-slot");
    if (!neighborDirection || !slot) return;
    const trigger = selection.trigger.closest("ul")?.querySelector<HTMLButtonElement>(`[data-project-id="${neighbor.id}"] .homepage-card-trigger`);
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
    <div ref={rootRef} id="project-focus-dialog" className="project-focus-root" role="dialog" aria-modal="true" aria-label={`${selection.preview.company}, ${selection.preview.label}`} data-phase="opening" data-focus-project={selection.preview.id} tabIndex={-1} onClick={event => {
      // Anywhere but a link closes; finishing a text selection shouldn't.
      if ((event.target as Element).closest("a") || !getSelection()?.isCollapsed) return;
      dismissRef.current();
    }}>
    <div className="project-focus-blur" aria-hidden="true" />
    <div className="project-focus-backdrop" aria-hidden="true" />
    <div ref={pagesRef} className="project-focus-pages">
    <div ref={scrollRef} className="project-focus-scroll">
      <div className="project-focus-panel">
        <div ref={slotRef} className="project-focus-media-slot" role={selection.preview.media ? "img" : undefined} aria-label={selection.preview.media?.alt} />
        <ProjectFocusDetails preview={selection.preview} />
      </div>
    </div>
    {neighborDirection && <div ref={neighborRef} className="project-focus-paging-page" data-paging-neighbor="" aria-hidden="true" inert>
      <div className="project-focus-panel">
        <div className="project-focus-media-slot" />
        <ProjectFocusDetails preview={neighbor} />
      </div>
    </div>}
    </div>
    {/* Pointer and touch close by tapping; this gives screen readers an explicit way out. */}
    <button type="button" className="sr-only" onClick={() => dismissRef.current()}>Close project</button>
    <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">Project {position} of {total}: {selection.preview.label}, {selection.preview.company}, {selection.preview.period}</span>
    </div>
  </>, document.body);
}
