"use client";

import { useState, type CSSProperties } from "react";
import Image from "next/image";
import { InspectableText } from "@/components/design-inspector";
import { ProjectPreviewVideo } from "@/components/project-preview-video";
import { mediaUrl } from "@/lib/media-delivery";
import type { ProcessMediaSequence } from "@/lib/process-essay";

export function ProcessMedia({ sequence, number, hero = false, entranceOrder = 0 }: { sequence: ProcessMediaSequence; number: string; hero?: boolean; entranceOrder?: number }) {
  const [index, setIndex] = useState(0);
  const frame = sequence.frames[index];
  const multiple = sequence.frames.length > 1;
  const captionId = `process-media-${sequence.id}-caption`;
  const asset = frame.asset;
  const media = asset?.kind === "video" ? <ProjectPreviewVideo key={asset.id} asset={asset} />
    : asset?.kind === "image" ? <Image key={asset.id} src={mediaUrl(asset.src)} alt={asset.alt} fill sizes="(max-width: 767px) 100vw, 620px" quality={90} priority={hero} unoptimized={hero} />
    : null;

  return <figure className={`process-figure${hero ? " process-hero" : ""}`}>
    {multiple ? <button type="button" className="process-media" aria-label={`Next in ${sequence.label}: ${index + 1} of ${sequence.frames.length}`}
      aria-describedby={captionId} onClick={() => setIndex(current => (current + 1) % sequence.frames.length)}>
      {media}
    </button> : <div className="process-media" role={asset ? undefined : "img"} aria-label={asset ? undefined : sequence.label}>{media}</div>}
    <figcaption id={captionId} className={`process-caption process-enter-text text-captionSerif text-secondary${hero ? " process-reading-column" : ""}`} style={{ "--process-text-order": entranceOrder } as CSSProperties} aria-live="polite" aria-atomic="true">
      <InspectableText>{number} / {frame.caption}{multiple ? ` (${index + 1}/${sequence.frames.length})` : ""}</InspectableText>
      {sequence.href && <> <a href={sequence.href} target="_blank" rel="noreferrer"><InspectableText>Inspiration on Cosmos</InspectableText></a></>}
    </figcaption>
  </figure>;
}
