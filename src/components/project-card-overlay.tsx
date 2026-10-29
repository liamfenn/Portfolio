"use client";

import { useLayoutEffect, useRef } from "react";
import { ProjectCredits } from "@/components/project-focus";
import type { ProjectPreview } from "@/lib/project-previews";
import { WIPE_END, WIPE_HIDDEN, createCardWipe, parseBezier, sweepDuration } from "@/lib/card-overlay-wipe";
import type { CardWipe } from "@/lib/card-overlay-wipe";
import { usePortfolioExperiments } from "@/components/portfolio-experiments";
import { currentGlyphPalette } from "@/lib/palette-toy";

const milliseconds = (tokens: CSSStyleDeclaration, property: string) => {
  const value = tokens.getPropertyValue(property).trim();
  return parseFloat(value) * (value.endsWith("ms") ? 1 : 1000);
};

/** The wipe sweeps the surface in on open and rewinds it on close, revealing and hiding each credit row as the front
 *  passes. Without WebGL the surface and rows fall back to CSS fades that share one transition window. */
export function ProjectCardOverlay({ preview, open, id }: { preview: ProjectPreview; open: boolean; id: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const wipeHostRef = useRef<HTMLSpanElement>(null);
  // A ref so switching styles in the inspector applies to the next opening without restarting the current one.
  const { cardWipeStyle } = usePortfolioExperiments();
  const style = useRef(cardWipeStyle);
  useLayoutEffect(() => { style.current = cardWipeStyle; }, [cardWipeStyle]);
  useLayoutEffect(() => {
    const root = rootRef.current!;
    const measure = () => {
      const rows = [...root.querySelectorAll<HTMLElement>("h3, li")].map(element => ({ element, top: element.getBoundingClientRect().top }));
      const tops = [...new Set(rows.map(row => row.top))].sort((a, b) => a - b);
      const tokens = getComputedStyle(root);
      const duration = milliseconds(tokens, "--project-card-overlay-duration");
      const stagger = milliseconds(tokens, "--project-focus-text-stagger") * duration / milliseconds(tokens, "--project-focus-text-enter-duration");
      root.style.setProperty("--card-row-stagger", `${stagger}ms`);
      root.style.setProperty("--card-row-duration", `${Math.max(0, duration - Math.max(0, tops.length - 1) * stagger)}ms`);
      rows.forEach(({ element, top }) => {
        const index = tops.indexOf(top);
        element.style.setProperty("--card-row-enter", String(index));
        element.style.setProperty("--card-row-exit", String(tops.length - 1 - index));
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    return () => observer.disconnect();
  }, [preview]);

  // The wipe outlives a single open or close: reversing mid-sweep keeps drawing on the same canvas.
  const active = useRef<{ wipe: CardWipe; canvas: HTMLCanvasElement; timer: number } | null>(null);
  const wasOpen = useRef(false);
  useLayoutEffect(() => {
    const root = rootRef.current!, host = wipeHostRef.current!;
    const finish = (entry: NonNullable<typeof active.current>) => {
      window.clearTimeout(entry.timer);
      entry.wipe.release();
      entry.canvas.remove();
      if (active.current === entry) { active.current = null; delete root.dataset.wipe; }
    };
    const changed = wasOpen.current !== open;
    wasOpen.current = open;
    // Read each time, so a preference changed while the page is open applies to the next sweep.
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) { if (active.current) finish(active.current); return; }
    if (!changed) return;
    const tokens = getComputedStyle(root);
    const ease = parseBezier(tokens.getPropertyValue("--project-card-overlay-enter-ease"));
    let entry = active.current;
    if (!entry) {
      const canvas = document.createElement("canvas");
      host.replaceChildren(canvas);
      const wipe = ease && createCardWipe({
        panel: root, canvas,
        blur: parseFloat(tokens.getPropertyValue("--project-card-overlay-blur")),
        tint: parseFloat(tokens.getPropertyValue("--project-card-overlay-opacity")) / 100,
        angle: parseFloat(tokens.getPropertyValue("--project-card-overlay-angle")),
        style: style.current, palette: currentGlyphPalette(),
      });
      if (!wipe) { canvas.remove(); return; }
      // Closing a settled overlay rewinds from a fully set surface.
      if (!open) wipe.front = WIPE_END;
      entry = active.current = { wipe, canvas, timer: 0 };
    }
    const current = entry;
    window.clearTimeout(current.timer);
    root.dataset.wipe = "running";
    const target = open ? WIPE_END : WIPE_HIDDEN;
    const full = milliseconds(tokens, open ? "--project-card-overlay-enter-duration" : "--project-card-overlay-exit-duration");
    current.wipe.play(target, sweepDuration(current.wipe.front, target, full), ease!, () => {
      if (!open) { finish(current); return; }
      // The CSS surface appears beneath the canvas, which fades before it is released.
      root.dataset.wipe = "settling";
      current.timer = window.setTimeout(() => finish(current), milliseconds(tokens, "--project-card-overlay-duration"));
    });
  }, [open]);
  useLayoutEffect(() => () => {
    const entry = active.current;
    if (entry) { window.clearTimeout(entry.timer); entry.wipe.release(); }
  }, []);

  return <div ref={rootRef} id={id} className={`project-card-panel text-bodySans${open ? " is-open" : ""}`} aria-hidden={!open} inert={!open}>
    <span className="project-card-surface" />
    {/* Holds the wipe's canvas, which is created per sweep outside React. */}
    <span ref={wipeHostRef} className="project-card-wipe" aria-hidden="true" />
    <ProjectCredits preview={preview} />
  </div>;
}
