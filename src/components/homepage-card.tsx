"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";
import type { ProjectPreview } from "@/lib/project-previews";
import { ProjectPreviewVideo } from "@/components/project-preview-video";
import { mediaUrl } from "@/lib/media-delivery";
import { InspectableText } from "@/components/design-inspector";
import { useColorScramble } from "@/hooks/use-color-scramble";
import { FILTER_SCRAMBLE } from "@/lib/text-scramble";
import { useImageLoading } from "@/hooks/use-image-loading";
import { Skeleton } from "@/components/skeleton";

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

export function HomepageCard({ preview, isMobile, expanded, onToggle, hovered, onHover, onClearHover, onOpenFocus, focusActive = false }: {
  preview: ProjectPreview; isMobile: boolean; expanded: boolean; onToggle: () => void;
  hovered: boolean; onHover: () => void; onClearHover: () => void;
  onOpenFocus?: (trigger: HTMLButtonElement) => void; focusActive?: boolean;
}) {
  const reducedMotion = useReducedMotion();
  const { attachImage, pending, failed, onLoad, onError } = useImageLoading(preview.media?.kind === "image" ? preview.media.src : undefined);
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
  return (
    <li data-project-id={preview.id}
      className={`project-preview homepage-card${isMobile && expanded ? " is-expanded" : ""}`} data-company={preview.company}>
      <button type="button" className="project-preview-link homepage-card-trigger hover-surface" data-media-kind={preview.media?.kind ?? "placeholder"}
        aria-label={`${preview.label}, ${preview.company}, ${preview.period}`}
        aria-haspopup={onOpenFocus ? "dialog" : undefined}
        aria-expanded={onOpenFocus ? focusActive : isMobile ? expanded : undefined}
        aria-controls={onOpenFocus ? "project-focus-dialog" : isMobile ? detailsId : undefined}
        aria-describedby={!isMobile && (hovered || focused) ? detailsId : undefined}
        onClick={event => { if (focusActive) return; if (onOpenFocus) onOpenFocus(event.currentTarget); else if (isMobile) onToggle(); }}
        onPointerEnter={event => { if (!isMobile && event.pointerType !== "touch") onHover(); }}
        onPointerDown={() => { if (!isMobile) setFocused(false); }}
        onFocus={event => setFocused(event.currentTarget.matches(":focus-visible"))} onBlur={() => setFocused(false)}
        onKeyDown={event => { if (event.key === "Escape") { onClearHover(); setFocused(false); if (isMobile && expanded) onToggle(); } }}>
        <span className="homepage-project-media">
        {preview.media?.kind === "video" ? <ProjectPreviewVideo asset={preview.media} priority={visible || focusActive} /> : null}
        {preview.media?.kind === "image" ? <>
          {pending && <Skeleton />}
          <Image ref={attachImage} onLoad={onLoad} onError={onError} className={failed ? "loading-image-error" : undefined}
            src={mediaUrl(preview.media.src)} alt={preview.media.alt} fill sizes="(max-width: 767px) 100vw, 50vw" style={{ objectFit: "cover" }} />
        </> : null}
        </span>
        <span id={detailsId} className={`homepage-project-overlay text-captionSans${visible ? " is-visible" : ""}`} aria-hidden={!visible}>
          <span className="homepage-project-company"><ProjectLabel labelId={`${preview.id}:company`} text={preview.company} visible={visible} delay={isMobile && !reducedMotion ? delay : 0} /></span>
          <span className="homepage-project-period"><ProjectLabel labelId={`${preview.id}:period`} text={period} visible={visible} delay={isMobile && !reducedMotion ? delay : 0} /></span>
        </span>
      </button>
    </li>
  );
}
