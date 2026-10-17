"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import type { PointerEvent } from "react";
import type { ProjectPreview } from "@/lib/project-previews";
import { ProjectPreviewVideo } from "@/components/project-preview-video";
import { mediaUrl } from "@/lib/media-delivery";

export function HomepageCard({ preview, isMobile, expanded, onToggle }: {
  preview: ProjectPreview; isMobile: boolean; expanded: boolean; onToggle: () => void;
}) {
  const tooltip = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const positionTooltip = (event: PointerEvent<HTMLButtonElement>) => {
    if (isMobile || event.pointerType === "touch" || !tooltip.current) return;
    const box = tooltip.current;
    const x = Math.min(event.clientX + 14, window.innerWidth - box.offsetWidth - 12);
    const y = event.clientY + 26 + box.offsetHeight > window.innerHeight - 12
      ? event.clientY - box.offsetHeight - 20 : event.clientY + 26;
    box.style.left = `${Math.max(12, x)}px`;
    box.style.top = `${Math.max(20, y)}px`;
  };
  const details = <>
    <span className={`homepage-project-badge${preview.company === "Shop" ? " is-shop" : ""}`} style={{ backgroundColor: preview.companyColor }}>
      <Image src={preview.companyLogo} alt="" width={24} height={24} />
    </span>
    <span className="homepage-project-title">{preview.label}<span className="homepage-project-period text-captionSmall">{preview.period}</span></span>
    <span className="homepage-project-company">{preview.company}</span>
  </>;
  const detailsId = `${preview.id}-details`;
  return (
    <li className={`project-preview homepage-card${expanded ? " is-expanded" : ""}`} data-company={preview.company}>
      <button type="button" className="project-preview-link homepage-card-trigger"
        aria-label={`${preview.label}, ${preview.company}, ${preview.period}`}
        aria-expanded={isMobile ? expanded : undefined}
        aria-controls={isMobile ? detailsId : undefined}
        aria-describedby={!isMobile && (hovered || focused) ? detailsId : undefined}
        onClick={() => { if (isMobile) onToggle(); }}
        onPointerEnter={event => { if (event.pointerType !== "touch") { setHovered(true); positionTooltip(event); } }}
        onPointerMove={positionTooltip}
        onPointerLeave={() => setHovered(false)}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        onKeyDown={event => { if (event.key === "Escape") { setHovered(false); setFocused(false); if (expanded) onToggle(); } }}>
        {preview.media?.kind === "video" ? <ProjectPreviewVideo asset={preview.media} /> : null}
        {preview.media?.kind === "image" ? <Image src={mediaUrl(preview.media.src)} alt={preview.media.alt} fill sizes="(max-width: 767px) 100vw, 50vw" style={{ objectFit: "cover" }} /> : null}
      </button>
      {isMobile ? expanded && <div id={detailsId} className="homepage-project-details homepage-project-inline text-caption">{details}</div> :
        <div ref={tooltip} id={detailsId} role="tooltip"
          className={`homepage-project-details homepage-project-tooltip text-caption${hovered || focused ? " is-visible" : ""}${focused && !hovered ? " is-keyboard" : ""}`}>
          {details}
        </div>}
    </li>
  );
}
