"use client";

import { useLayoutEffect, useRef } from "react";
import { ProjectCredits } from "@/components/project-focus";
import type { ProjectPreview } from "@/lib/project-previews";
import { parseBezier, playCardWipe } from "@/lib/card-overlay-wipe";
import { usePortfolioExperiments } from "@/components/portfolio-experiments";
import { currentGlyphPalette } from "@/lib/palette-toy";

const milliseconds = (tokens: CSSStyleDeclaration, property: string) => {
  const value = tokens.getPropertyValue(property).trim();
  return parseFloat(value) * (value.endsWith("ms") ? 1 : 1000);
};

/** Credit rows share the surface's total transition window when closing (and when the wipe can't run). Opening,
 *  the wipe reveals each row as its front sets the blur beneath it. */
export function ProjectCardOverlay({ preview, open, id }: { preview: ProjectPreview; open: boolean; id: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const wipeHostRef = useRef<HTMLSpanElement>(null);
  const generation = useRef(0);
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

  useLayoutEffect(() => {
    const root = rootRef.current!, host = wipeHostRef.current!;
    // Read at opening, so a preference changed while the page is open applies to the next wipe.
    if (!open || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const tokens = getComputedStyle(root);
    const ease = parseBezier(tokens.getPropertyValue("--project-card-overlay-enter-ease"));
    const fade = milliseconds(tokens, "--project-card-overlay-duration");
    // Each wipe draws on its own canvas, so reopening mid-fade never shares a context the old fade will release.
    const canvas = document.createElement("canvas");
    host.replaceChildren(canvas);
    const current = ++generation.current;
    let timer = 0;
    const finish = (phase: "settling" | "closing") => {
      root.dataset.wipe = phase;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        wipe?.release();
        canvas.remove();
        if (generation.current === current) delete root.dataset.wipe;
      }, fade);
    };
    const wipe = ease && playCardWipe({
      panel: root, canvas, rows: [...root.querySelectorAll<HTMLElement>("h3, li")],
      duration: milliseconds(tokens, "--project-card-overlay-enter-duration"), ease,
      blur: parseFloat(tokens.getPropertyValue("--project-card-overlay-blur")),
      tint: parseFloat(tokens.getPropertyValue("--project-card-overlay-opacity")) / 100,
      style: style.current, palette: currentGlyphPalette(),
      onSettle: () => finish("settling"),
    });
    if (!wipe) { canvas.remove(); return; }
    root.dataset.wipe = "running";
    return () => {
      // Closing mid-sweep: transitions come back on before the rows leave their inline opacity, so they fade out
      // from where the front left them.
      if (root.dataset.wipe === "running") { finish("closing"); wipe.stop(); }
      else if (root.dataset.wipe === "settling") root.dataset.wipe = "closing";
    };
  }, [open]);

  return <div ref={rootRef} id={id} className={`project-card-panel text-bodySans${open ? " is-open" : ""}`} aria-hidden={!open} inert={!open}>
    <span className="project-card-surface" />
    {/* Holds the wipe's canvas, which is created per opening outside React. */}
    <span ref={wipeHostRef} className="project-card-wipe" aria-hidden="true" />
    <ProjectCredits preview={preview} />
  </div>;
}
