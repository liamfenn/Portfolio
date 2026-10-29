"use client";

import { useLayoutEffect, useRef } from "react";
import { ProjectCredits } from "@/components/project-focus";
import type { ProjectPreview } from "@/lib/project-previews";

const milliseconds = (tokens: CSSStyleDeclaration, property: string) => {
  const value = tokens.getPropertyValue(property).trim();
  return parseFloat(value) * (value.endsWith("ms") ? 1 : 1000);
};

/** Credit rows share the blur surface's transition window, reversing their order on exit. */
export function ProjectCardOverlay({ preview, open, id }: { preview: ProjectPreview; open: boolean; id: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
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

  return <div ref={rootRef} id={id} className={`project-card-panel text-bodySans${open ? " is-open" : ""}`} aria-hidden={!open} inert={!open}>
    <span className="project-card-surface" />
    <ProjectCredits preview={preview} />
  </div>;
}
