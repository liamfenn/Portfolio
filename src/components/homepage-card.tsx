"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import type { ProjectPreview } from "@/lib/project-previews";
import { ProjectPreviewVideo } from "@/components/project-preview-video";
import { mediaUrl } from "@/lib/media-delivery";
import { InspectableText } from "@/components/design-inspector";
import { useColorScramble } from "@/hooks/use-color-scramble";
import { FILTER_SCRAMBLE } from "@/lib/text-scramble";
import { MediaContextMenu } from "@/components/media-context-menu";

function ProjectLabel({ text, visible, delay, labelId }: { text: string; visible: boolean; delay: number; labelId: string }) {
  const [shown, setShown] = useState(visible);
  useEffect(() => {
    const timer = window.setTimeout(() => setShown(visible), delay);
    return () => window.clearTimeout(timer);
  }, [visible, delay]);
  const active = delay ? shown : visible;
  // Equal-length blanks let the shared effect scramble out instead of clearing in one frame.
  const { ref } = useColorScramble({
    ...FILTER_SCRAMBLE,
    text: active ? text : " ".repeat(text.length),
    ignore: [],
    playOnMount: false,
  });
  return <InspectableText text={visible ? text : ""}><span ref={ref} data-swarm-label data-swarm-label-id={labelId} data-final-text={text}>{" ".repeat(text.length)}</span></InspectableText>;
}

export function HomepageCard({ preview, isMobile, expanded, onToggle, hovered, onHover, onClearHover }: {
  preview: ProjectPreview; isMobile: boolean; expanded: boolean; onToggle: () => void;
  hovered: boolean; onHover: () => void; onClearHover: () => void;
}) {
  const reducedMotion = useReducedMotion();
  const [menuOpen, setMenuOpen] = useState(false);
  const hold = useRef<{ timer: number; x: number; y: number; slop: number } | null>(null);
  const consumedHold = useRef(false);
  const cancelHold = () => { if (hold.current) window.clearTimeout(hold.current.timer); hold.current = null; };
  useEffect(() => () => { if (hold.current) window.clearTimeout(hold.current.timer); }, []);
  const [delay, setDelay] = useState(0);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const tokens = getComputedStyle(document.documentElement);
      const value = tokens.getPropertyValue("--project-label-delay").trim();
      setDelay(parseFloat(value) * (value.endsWith("ms") ? 1 : 1000));
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  const [focused, setFocused] = useState(false);
  const visible = isMobile ? expanded : hovered || focused;
  const period = `${preview.quarter ? `Q${preview.quarter} ` : ""}${String(preview.year).slice(-2)}`;
  const detailsId = `${preview.id}-details`;
  const mediaHref = preview.media ? mediaUrl(preview.media.src) : undefined;
  return (
    <li data-project-id={preview.id}
      className={`project-preview homepage-card${isMobile && expanded ? " is-expanded" : ""}`} data-company={preview.company}>
      <button type="button" className="project-preview-link homepage-card-trigger hover-surface"
        aria-label={`${preview.label}, ${preview.company}, ${preview.period}`}
        aria-expanded={isMobile ? expanded : undefined}
        aria-controls={isMobile ? detailsId : undefined}
        aria-describedby={!isMobile && (hovered || focused) ? detailsId : undefined}
        aria-keyshortcuts={mediaHref ? "Shift+F10" : undefined}
        onClick={event => {
          if (consumedHold.current) { event.preventDefault(); consumedHold.current = false; return; }
          if (isMobile) onToggle();
        }}
        onPointerEnter={event => { if (!isMobile && event.pointerType !== "touch") onHover(); }}
        onPointerDown={event => {
          consumedHold.current = false; cancelHold();
          if (!isMobile) setFocused(false);
          if (!mediaHref || !event.isPrimary || event.pointerType === "mouse") return;
          const tokens = getComputedStyle(document.documentElement);
          const duration = tokens.getPropertyValue("--media-menu-hold-duration").trim();
          hold.current = { x: event.clientX, y: event.clientY, slop: parseFloat(tokens.getPropertyValue("--media-menu-hold-slop")),
            timer: window.setTimeout(() => { consumedHold.current = true; hold.current = null; setMenuOpen(true); }, parseFloat(duration) * (duration.endsWith("ms") ? 1 : 1000)) };
        }}
        onPointerMove={event => {
          if (hold.current && Math.hypot(event.clientX - hold.current.x, event.clientY - hold.current.y) > hold.current.slop) cancelHold();
        }}
        onPointerUp={cancelHold} onPointerCancel={cancelHold} onPointerLeave={cancelHold}
        onContextMenu={event => { if (mediaHref) { event.preventDefault(); cancelHold(); consumedHold.current = true; setMenuOpen(true); } }}
        onFocus={event => setFocused(event.currentTarget.matches(":focus-visible"))} onBlur={() => setFocused(false)}
        onKeyDown={event => {
          if (event.key === "Enter" || event.key === " ") consumedHold.current = false;
          if (event.key === "Escape") { onClearHover(); setFocused(false); if (isMobile && expanded) onToggle(); }
          if (mediaHref && (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10"))) {
            event.preventDefault(); cancelHold(); setMenuOpen(true);
          }
        }}>
        {preview.media?.kind === "video" ? <ProjectPreviewVideo asset={preview.media} priority={visible} /> : null}
        {preview.media?.kind === "image" ? <Image src={mediaUrl(preview.media.src)} alt={preview.media.alt} fill sizes="(max-width: 767px) 100vw, 50vw" style={{ objectFit: "cover" }} /> : null}
        <span id={detailsId} className={`homepage-project-overlay text-captionSans${visible ? " is-visible" : ""}`} aria-hidden={!visible}>
          <span className="homepage-project-company"><ProjectLabel labelId={`${preview.id}:company`} text={preview.company} visible={visible} delay={isMobile && !reducedMotion ? delay : 0} /></span>
          <span className="homepage-project-period"><ProjectLabel labelId={`${preview.id}:period`} text={period} visible={visible} delay={isMobile && !reducedMotion ? delay : 0} /></span>
        </span>
      </button>
      {menuOpen && mediaHref && <MediaContextMenu url={mediaHref} title={preview.company} onClose={() => setMenuOpen(false)} />}
    </li>
  );
}
