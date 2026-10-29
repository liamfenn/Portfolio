"use client";

import { useState, type CSSProperties } from "react";
import Image from "next/image";
import { InspectableText } from "@/components/design-inspector";
import { ProjectPreviewVideo } from "@/components/project-preview-video";
import { mediaUrl } from "@/lib/media-delivery";
import type { ProcessMediaSequence } from "@/lib/process-essay";

export function ProcessMedia({ sequence, hero = false, entranceOrder = 0 }: { sequence: ProcessMediaSequence; hero?: boolean; entranceOrder?: number }) {
  const [index, setIndex] = useState(0);
  const frame = sequence.frames[index];
  const multiple = sequence.frames.length > 1;
  const captionId = `process-media-${sequence.id}-caption`;
  const entrance = { "--process-text-order": entranceOrder } as CSSProperties;
  const asset = frame.asset;
  const media = asset?.kind === "video" ? <ProjectPreviewVideo key={asset.id} asset={asset} />
    : asset?.kind === "image" ? <Image key={asset.id} src={mediaUrl(asset.src)} alt={asset.alt} fill sizes="(max-width: 767px) 100vw, 620px" quality={90} priority={hero} unoptimized={hero} />
    : null;

  return <figure className={`process-figure${hero ? " process-hero" : ""}`} data-media-set={sequence.id}>
    {multiple ? <button type="button" className="process-media" aria-label={`${sequence.label}, asset ${index + 1} of ${sequence.frames.length}. Show next asset`}
      aria-describedby={hero ? undefined : captionId} onClick={() => setIndex(current => (current + 1) % sequence.frames.length)}>
      {media}
      <span className="process-media-count process-enter-text text-captionSans text-muted" style={entrance} aria-hidden="true"><InspectableText>[{index + 1}]</InspectableText></span>
    </button> : <div className="process-media" role={asset ? undefined : "img"} aria-label={asset ? undefined : sequence.label}>{media}</div>}
    {multiple && <span className="sr-only text-captionSans text-muted" role="status" aria-live="polite" aria-atomic="true"><InspectableText>{sequence.label}: asset {index + 1} of {sequence.frames.length}</InspectableText></span>}
    {!hero && <figcaption id={captionId} className="process-caption process-enter-text text-captionSans text-muted" style={entrance}>
      <InspectableText>{sequence.caption ?? frame.caption}</InspectableText>
      {sequence.href && <a className="process-caption-link text-secondary" href={sequence.href} target="_blank" rel="noreferrer">
        {sequence.icon && <Image src={sequence.icon} width={14} height={14} alt="" aria-hidden="true" />}
        <InspectableText>{sequence.linkLabel ?? sequence.label}</InspectableText>
      </a>}
    </figcaption>}
  </figure>;
}
