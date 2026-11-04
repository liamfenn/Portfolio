"use client";

import { useEffect, useRef, useState } from "react";
import type { PointerEvent } from "react";
import { InspectableText } from "@/components/design-inspector";

export type ProjectReorder = { swap: (first: string, second: string) => void; columns: number; order: string[] };

export function ProjectReorderHandle({ id, name, reorder }: { id: string; name: string; reorder: ProjectReorder }) {
  const handle = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const element = handle.current;
    if (!element) return;
    const preventScroll = (event: TouchEvent) => { if (event.cancelable) event.preventDefault(); };
    element.addEventListener("touchstart", preventScroll, { passive: false });
    element.addEventListener("touchmove", preventScroll, { passive: false });
    return () => { element.removeEventListener("touchstart", preventScroll); element.removeEventListener("touchmove", preventScroll); };
  }, []);
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const [status, setStatus] = useState("");
  const targetAt = (event: PointerEvent) => document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-project-id]");
  const clearTarget = () => document.querySelectorAll("[data-reorder-target]").forEach(tile => tile.removeAttribute("data-reorder-target"));
  return <>
    <button ref={handle} type="button" className="project-reorder-handle text-captionSans" aria-label={`Reorder ${name}`} title="Drag onto another project to swap. Arrow keys also swap positions."
      onPointerDown={event => {
        if (event.button !== 0) return;
        event.preventDefault(); event.stopPropagation();
        event.currentTarget.setPointerCapture(event.pointerId);
        setDrag({ x: event.clientX, y: event.clientY });
      }}
      onPointerMove={event => {
        if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
        setDrag({ x: event.clientX, y: event.clientY });
        clearTarget(); targetAt(event)?.setAttribute("data-reorder-target", "");
      }}
      onPointerUp={event => {
        if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
        const target = targetAt(event)?.dataset.projectId;
        if (target && target !== id) { reorder.swap(id, target); setStatus("Projects swapped. Save order in the debug panel to keep it."); }
        event.currentTarget.releasePointerCapture(event.pointerId);
        clearTarget(); setDrag(null);
      }}
      onPointerCancel={() => { clearTarget(); setDrag(null); }}
      onLostPointerCapture={() => { clearTarget(); setDrag(null); }}
      onClick={event => event.stopPropagation()}
      onKeyDown={event => {
        const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -reorder.columns, ArrowDown: reorder.columns }[event.key];
        if (step === undefined) return;
        event.preventDefault(); event.stopPropagation();
        const target = reorder.order[reorder.order.indexOf(id) + step];
        if (target) { reorder.swap(id, target); setStatus("Projects swapped. Save order in the debug panel to keep it."); }
      }}><InspectableText>↔ {name}</InspectableText></button>
    {drag && <span className="project-reorder-ghost text-captionSans" style={{ left: drag.x, top: drag.y }} aria-hidden="true">{name}</span>}
    <span className="sr-only" role="status">{status}</span>
  </>;
}
