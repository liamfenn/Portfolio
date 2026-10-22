"use client";

import Image from "next/image";
import { useState } from "react";
import type { ProjectPreview } from "@/lib/project-previews";
import { ProjectPreviewVideo } from "@/components/project-preview-video";
import { mediaUrl } from "@/lib/media-delivery";
import { InspectableText } from "@/components/design-inspector";

export function HomepageCard({ preview, isMobile, expanded, onToggle }: {
  preview: ProjectPreview; isMobile: boolean; expanded: boolean; onToggle: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const visible = isMobile ? expanded : hovered || focused;
  const period = `${preview.quarter ? `Q${preview.quarter} ` : ""}${String(preview.year).slice(-2)}`;
  const detailsId = `${preview.id}-details`;
  return (
    <li className="project-preview homepage-card" data-company={preview.company}>
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
          <span className="homepage-project-company"><InspectableText>{preview.company}</InspectableText></span>
          <span className="homepage-project-period"><InspectableText>{period}</InspectableText></span>
        </span>
      </button>
    </li>
  );
}
