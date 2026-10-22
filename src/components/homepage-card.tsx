"use client";

import Image from "next/image";
import { useState } from "react";
import type { ProjectPreview } from "@/lib/project-previews";
import { ProjectPreviewVideo } from "@/components/project-preview-video";
import { mediaUrl } from "@/lib/media-delivery";
import { InspectableText } from "@/components/design-inspector";
import { useColorScramble } from "@/hooks/use-color-scramble";
import { FILTER_SCRAMBLE } from "@/lib/text-scramble";

function ProjectLabel({ text, visible }: { text: string; visible: boolean }) {
  // Equal-length blanks let the shared effect scramble out instead of clearing in one frame.
  const { ref } = useColorScramble({
    ...FILTER_SCRAMBLE,
    text: visible ? text : " ".repeat(text.length),
    ignore: [],
    playOnMount: false,
  });
  return <InspectableText text={visible ? text : ""}><span ref={ref}>{" ".repeat(text.length)}</span></InspectableText>;
}

export function HomepageCard({ preview, isMobile, expanded, onToggle }: {
  preview: ProjectPreview; isMobile: boolean; expanded: boolean; onToggle: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const visible = isMobile ? expanded : hovered || focused;
  const period = `${preview.quarter ? `Q${preview.quarter} ` : ""}${String(preview.year).slice(-2)}`;
  const detailsId = `${preview.id}-details`;
  return (
    <li className={`project-preview homepage-card${isMobile && expanded ? " is-expanded" : ""}`} data-company={preview.company}>
      <button type="button" className="project-preview-link homepage-card-trigger"
        aria-label={`${preview.label}, ${preview.company}, ${preview.period}`}
        aria-expanded={isMobile ? expanded : undefined}
        aria-controls={isMobile ? detailsId : undefined}
        aria-describedby={!isMobile && (hovered || focused) ? detailsId : undefined}
        onClick={() => { if (isMobile) onToggle(); }}
        onPointerEnter={event => { if (event.pointerType !== "touch") { setHovered(true); } }}
        onPointerLeave={() => setHovered(false)}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        onKeyDown={event => { if (event.key === "Escape") { setHovered(false); setFocused(false); if (expanded) onToggle(); } }}>
        {preview.media?.kind === "video" ? <ProjectPreviewVideo asset={preview.media} /> : null}
        {preview.media?.kind === "image" ? <Image src={mediaUrl(preview.media.src)} alt={preview.media.alt} fill sizes="(max-width: 767px) 100vw, 50vw" style={{ objectFit: "cover" }} /> : null}
        <span id={detailsId} className={`homepage-project-overlay text-captionSans${visible ? " is-visible" : ""}`} aria-hidden={!visible}>
          <span className="homepage-project-company"><ProjectLabel text={preview.company} visible={visible} /></span>
          <span className="homepage-project-period"><ProjectLabel text={period} visible={visible} /></span>
        </span>
      </button>
    </li>
  );
}
