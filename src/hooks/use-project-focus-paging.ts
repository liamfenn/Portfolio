"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import type { ProjectFocusSelection } from "@/components/project-focus";
import { commitsPage, pagingIntent } from "@/lib/project-paging";
import { preserveVideoFrame } from "@/lib/video-playback";

type Direction = -1 | 1;
type Gesture = { id: number; x: number; y: number; lastX: number; time: number; velocity: number; offset: number; width: number; axis: "pending" | "horizontal" | "vertical" };
type Page = { snapshot: HTMLElement; media: HTMLElement; trigger: HTMLButtonElement; direction: Direction; offset: number; width: number; animations: Animation[] };

function milliseconds(tokens: CSSStyleDeclaration, property: string) {
  const value = tokens.getPropertyValue(property).trim();
  return parseFloat(value) * (value.endsWith("ms") ? 1 : 1000);
}

function restoreMedia(media: HTMLElement, trigger: HTMLButtonElement) {
  const video = media.querySelector("video");
  if (video) preserveVideoFrame(video);
  trigger.prepend(media);
}

export function useProjectFocusPaging({ rootRef, pagesRef, scrollRef, controlsRef, selection, onNavigate, total }: {
  rootRef: RefObject<HTMLDivElement | null>; pagesRef: RefObject<HTMLDivElement | null>; scrollRef: RefObject<HTMLDivElement | null>; controlsRef: RefObject<HTMLDivElement | null>;
  selection: ProjectFocusSelection; onNavigate: (direction: Direction, keyboard: boolean) => void; total: number;
}) {
  const current = useRef({ selection, onNavigate, total });
  useLayoutEffect(() => { current.current = { selection, onNavigate, total }; }, [selection, onNavigate, total]);
  const page = useRef<Page | null>(null);
  const gesture = useRef<Gesture | null>(null);
  const suppressClick = useRef(false);
  const neighborRef = useRef<HTMLDivElement>(null);
  const [neighborDirection, setNeighborDirection] = useState<Direction | null>(null);
  const snapAnimations = useRef<Animation[]>([]);

  const finishPaging = useCallback(() => {
    snapAnimations.current.forEach(animation => animation.cancel());
    snapAnimations.current = [];
    const outgoing = page.current;
    page.current = null;
    if (outgoing) {
      outgoing.animations.forEach(animation => animation.cancel());
      restoreMedia(outgoing.media, outgoing.trigger);
      outgoing.snapshot.remove();
      if (rootRef.current?.dataset.phase !== "closing" && rootRef.current) rootRef.current.dataset.phase = "open";
    }
    scrollRef.current?.style.removeProperty("transform");
    gesture.current = null;
  }, [rootRef, scrollRef]);
  const cancelPaging = useCallback(() => { finishPaging(); setNeighborDirection(null); }, [finishPaging]);

  const navigate = useCallback((direction: Direction, keyboard: boolean, shortcut = false) => {
    const root = rootRef.current, scroller = scrollRef.current;
    if (!root || !scroller || root.dataset.phase === "closing" || current.current.total < 2) return;
    const offset = gesture.current?.offset ?? 0;
    finishPaging();
    setNeighborDirection(null);
    root.dataset.input = shortcut ? "shortcut" : keyboard ? "keyboard" : "pointer";
    controlsRef.current!.querySelector<HTMLButtonElement>(direction === -1 ? ".project-focus-step:first-child" : ".project-focus-step:last-child")!.focus({ preventScroll: true });
    const media = scroller.querySelector<HTMLElement>(".homepage-project-media")!;
    // Copy metadata separately so the outgoing page never duplicates a media element.
    const snapshot = scroller.cloneNode(false) as HTMLElement;
    const panel = scroller.querySelector(".project-focus-panel")!.cloneNode(false) as HTMLElement;
    const slot = document.createElement("div");
    slot.className = "project-focus-media-slot";
    panel.append(slot, scroller.querySelector(".project-focus-details")!.cloneNode(true));
    snapshot.appendChild(panel);
    snapshot.className = "project-focus-paging-page";
    snapshot.style.removeProperty("transform");
    snapshot.dataset.pagingOutgoing = "";
    snapshot.inert = true;
    snapshot.setAttribute("aria-hidden", "true");
    snapshot.querySelectorAll("[id]").forEach(node => node.removeAttribute("id"));
    snapshot.querySelectorAll<HTMLElement>(".project-focus-details [style]").forEach(node => node.style.removeProperty("opacity"));
    pagesRef.current!.appendChild(snapshot);
    snapshot.scrollTop = scroller.scrollTop;
    const video = media.querySelector("video");
    if (video) preserveVideoFrame(video);
    slot.appendChild(media);
    page.current = { snapshot, media, trigger: current.current.selection.trigger, direction, offset, width: pagesRef.current!.clientWidth, animations: [] };
    current.current.onNavigate(direction, keyboard);
  }, [rootRef, scrollRef, controlsRef, pagesRef, finishPaging]);

  const animatePage = useCallback((reduced: boolean) => {
    const outgoing = page.current;
    if (!outgoing) return null;
    const tokens = getComputedStyle(rootRef.current!);
    const duration = milliseconds(tokens, "--project-focus-page-duration");
    const minimum = milliseconds(tokens, "--project-focus-handoff-delay");
    const remaining = Math.max(0, 1 - Math.abs(outgoing.offset) / outgoing.width);
    const options = { duration: reduced ? 0 : Math.max(minimum, duration * remaining), easing: `cubic-bezier(${tokens.getPropertyValue("--project-focus-ease").trim()})`, fill: "both" as const };
    const incoming = scrollRef.current!.animate([{ transform: `translateX(${outgoing.direction * outgoing.width + outgoing.offset}px)` }, { transform: "translateX(0px)" }], options);
    const leaving = outgoing.snapshot.animate([{ transform: `translateX(${outgoing.offset}px)` }, { transform: `translateX(${-outgoing.direction * outgoing.width}px)` }], options);
    outgoing.animations = [incoming, leaving];
    void Promise.all(outgoing.animations.map(animation => animation.finished)).then(() => { if (page.current === outgoing) finishPaging(); }).catch(() => {});
    return outgoing.animations;
  }, [rootRef, scrollRef, finishPaging]);
  const retainsMedia = useCallback((media: HTMLElement) => page.current?.media === media, []);

  useLayoutEffect(() => {
    const moving = gesture.current;
    if (moving && neighborRef.current && neighborDirection) neighborRef.current.style.transform = `translateX(${neighborDirection * moving.width + moving.offset}px)`;
  }, [neighborDirection]);

  useLayoutEffect(() => {
    const root = rootRef.current!, scroller = scrollRef.current!;
    const mobile = matchMedia("(max-width: 767px)"), reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const slop = () => parseFloat(getComputedStyle(root).getPropertyValue("--page-frame"));
    const reset = () => {
      const moving = gesture.current;
      gesture.current = null;
      if (!moving || moving.axis !== "horizontal") { setNeighborDirection(null); return; }
      const tokens = getComputedStyle(root);
      const duration = Math.max(milliseconds(tokens, "--project-focus-handoff-delay"), milliseconds(tokens, "--project-focus-page-duration") * Math.abs(moving.offset) / moving.width);
      const options = { duration: reduced.matches ? 0 : duration, easing: `cubic-bezier(${tokens.getPropertyValue("--project-focus-ease").trim()})` };
      const animations = [scroller.animate([{ transform: `translateX(${moving.offset}px)` }, { transform: "translateX(0px)" }], options)];
      scroller.style.removeProperty("transform");
      if (neighborRef.current) animations.push(neighborRef.current.animate([{ transform: `translateX(${(moving.offset < 0 ? 1 : -1) * moving.width + moving.offset}px)` }, { transform: `translateX(${(moving.offset < 0 ? 1 : -1) * moving.width}px)` }], options));
      snapAnimations.current = animations;
      void Promise.all(animations.map(animation => animation.finished)).then(() => {
        if (snapAnimations.current === animations) { snapAnimations.current = []; setNeighborDirection(null); }
      }).catch(() => {});
    };
    let wheelGesture: { x: number; y: number; time: number; axis: ReturnType<typeof pagingIntent>; committed: boolean } | null = null;
    const wheel = (event: WheelEvent) => {
      if (mobile.matches || event.ctrlKey || event.metaKey || event.altKey || current.current.total < 2 || root.dataset.phase === "closing") return;
      const tokens = getComputedStyle(root);
      const idle = milliseconds(tokens, "--project-focus-wheel-idle");
      const threshold = parseFloat(tokens.getPropertyValue("--page-frame"));
      if (!wheelGesture || event.timeStamp - wheelGesture.time > idle) wheelGesture = { x: 0, y: 0, time: event.timeStamp, axis: "pending", committed: false };
      const moving = wheelGesture;
      moving.time = event.timeStamp;
      const line = parseFloat(tokens.getPropertyValue("--type-body-leading"));
      const scaleX = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? line : event.deltaMode === WheelEvent.DOM_DELTA_PAGE ? scroller.clientWidth : 1;
      const scaleY = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? line : event.deltaMode === WheelEvent.DOM_DELTA_PAGE ? scroller.clientHeight : 1;
      const shiftWheel = event.shiftKey && event.deltaX === 0;
      const x = (shiftWheel ? event.deltaY : event.deltaX) * scaleX;
      const y = shiftWheel ? 0 : event.deltaY * scaleY;
      moving.x += x;
      moving.y += y;
      if (moving.axis === "pending") moving.axis = pagingIntent(moving.x, moving.y, threshold);
      // Consume even the small lead-in deltas so horizontal gestures cannot trigger browser history.
      if (moving.axis === "horizontal" || (moving.axis === "pending" && Math.abs(x) > Math.abs(y) * 1.2)) event.preventDefault();
      if (moving.axis !== "horizontal" || moving.committed || Math.abs(moving.x) < threshold * 3) return;
      // Latch until the wheel stream goes quiet, including momentum after the page transition ends.
      moving.committed = true;
      if (!page.current) navigate(moving.x > 0 ? 1 : -1, false);
    };
    const pointerStart = (event: PointerEvent) => {
      suppressClick.current = false;
      if (!event.isPrimary) { reset(); return; }
      if (!mobile.matches || event.pointerType !== "touch" || current.current.total < 2 || root.dataset.phase !== "open") return;
      if (event.target instanceof Element && event.target.closest("a, button, input, textarea, select")) return;
      const edge = slop() * 3;
      if (event.clientX < edge || event.clientX > innerWidth - edge) return;
      finishPaging();
      setNeighborDirection(null);
      gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY, lastX: event.clientX, time: event.timeStamp, velocity: 0, offset: 0, width: pagesRef.current!.clientWidth, axis: "pending" };
    };
    const pointerMove = (event: PointerEvent) => {
      const moving = gesture.current;
      if (!moving || event.pointerId !== moving.id) return;
      const x = event.clientX - moving.x, y = event.clientY - moving.y;
      if (moving.axis === "pending") moving.axis = pagingIntent(x, y, slop());
      if (moving.axis !== "horizontal") return;
      event.preventDefault();
      suppressClick.current = true;
      if (!scroller.hasPointerCapture(event.pointerId)) scroller.setPointerCapture(event.pointerId);
      moving.velocity = (event.clientX - moving.lastX) / Math.max(1, event.timeStamp - moving.time);
      moving.lastX = event.clientX;
      moving.time = event.timeStamp;
      moving.offset = Math.max(-moving.width, Math.min(moving.width, x));
      const direction = moving.offset < 0 ? 1 : -1;
      scroller.style.transform = `translateX(${moving.offset}px)`;
      if (neighborRef.current) neighborRef.current.style.transform = `translateX(${direction * moving.width + moving.offset}px)`;
      setNeighborDirection(direction);
    };
    const pointerEnd = (event: PointerEvent) => {
      const moving = gesture.current;
      if (!moving || event.pointerId !== moving.id) return;
      if (scroller.hasPointerCapture(event.pointerId)) scroller.releasePointerCapture(event.pointerId);
      const velocity = event.timeStamp - moving.time > 100 ? 0 : moving.velocity;
      if (event.type === "pointerup" && moving.axis === "horizontal" && commitsPage(moving.offset, moving.width, velocity, slop())) navigate(moving.offset < 0 ? 1 : -1, false);
      else reset();
    };
    const allowPointer = () => { suppressClick.current = false; };
    const click = (event: MouseEvent) => {
      if (suppressClick.current && event.detail !== 0) { suppressClick.current = false; event.preventDefault(); event.stopImmediatePropagation(); }
    };
    const resize = () => { wheelGesture = null; cancelPaging(); };
    // Wheel transactions may keep targeting media after paging returns it to its original grid card.
    window.addEventListener("wheel", wheel, { passive: false, capture: true });
    root.addEventListener("pointerdown", allowPointer, { capture: true });
    scroller.addEventListener("pointerdown", pointerStart);
    scroller.addEventListener("pointermove", pointerMove, { passive: false });
    scroller.addEventListener("pointerup", pointerEnd);
    scroller.addEventListener("pointercancel", pointerEnd);
    window.addEventListener("click", click, { capture: true });
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("wheel", wheel, { capture: true });
      root.removeEventListener("pointerdown", allowPointer, { capture: true });
      scroller.removeEventListener("pointerdown", pointerStart);
      scroller.removeEventListener("pointermove", pointerMove);
      scroller.removeEventListener("pointerup", pointerEnd);
      scroller.removeEventListener("pointercancel", pointerEnd);
      window.removeEventListener("click", click, { capture: true });
      window.removeEventListener("resize", resize);
      finishPaging();
    };
  }, [rootRef, pagesRef, scrollRef, navigate, finishPaging, cancelPaging]);

  return { navigate, animatePage, retainsMedia, cancelPaging, neighborDirection, neighborRef };
}
