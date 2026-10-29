"use client";

import { useState, type CSSProperties } from "react";
import Image from "next/image";
import { useReducedMotion } from "motion/react";
import { InspectableText } from "@/components/design-inspector";
import { ProjectPreviewVideo } from "@/components/project-preview-video";
import { useColorScramble } from "@/hooks/use-color-scramble";
import { mediaUrl } from "@/lib/media-delivery";
import { FILTER_SCRAMBLE } from "@/lib/text-scramble";
import type { ProcessMediaSequence } from "@/lib/process-essay";

function ScrambledLinkDetail({ text, active }: { text: string; active: boolean }) {
  const { ref } = useColorScramble({
    ...FILTER_SCRAMBLE, text: active ? text : " ".repeat(text.length), ignore: [], playOnMount: false,
  });
  return <span ref={ref}>{" ".repeat(text.length)}</span>;
}

function ProcessCaptionLink({ sequence }: { sequence: ProcessMediaSequence }) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const reducedMotion = useReducedMotion();
  const active = hovered || focused;
  const label = sequence.linkLabel ?? sequence.label;
  const desktopHover = () => window.matchMedia("(min-width: 768px) and (hover: hover)").matches;
  return <a className="process-caption-link text-secondary" href={sequence.href} target="_blank" rel="noreferrer" aria-label={`${label}${sequence.hoverLabel ?? ""}`}
    onPointerEnter={event => setHovered(event.pointerType !== "touch" && desktopHover())} onPointerLeave={() => setHovered(false)}
    onFocus={event => setFocused(event.currentTarget.matches(":focus-visible") && desktopHover())} onBlur={() => setFocused(false)}>
    {sequence.icon && <Image src={sequence.icon} width={14} height={14} alt="" aria-hidden="true" />}
    <InspectableText>{label}</InspectableText>
    {sequence.hoverLabel && <span className="process-caption-detail" aria-hidden="true"><InspectableText text={active ? sequence.hoverLabel : ""}>
      {reducedMotion ? (active ? sequence.hoverLabel : "") : <ScrambledLinkDetail text={sequence.hoverLabel} active={active} />}
    </InspectableText></span>}
  </a>;
}

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
      {sequence.href && <ProcessCaptionLink sequence={sequence} />}
    </figcaption>}
  </figure>;
}
