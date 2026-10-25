"use client";

import { useState } from "react";
import type { CSSProperties } from "react";
import { MEDIA_ASSETS } from "@/lib/media-assets";
import { ProjectPreviewVideo } from "./project-preview-video";
import { InspectableText } from "./design-inspector";

// Distinct URLs exercise twelve independent fetches rather than one shared browser-cache entry.
const clips = Array.from({ length: 12 }, (_, index) => {
  const asset = MEDIA_ASSETS.shopProductPage;
  const url = (value: string) => `${value}?video-lab=${index}`;
  return { ...asset, id: `video-lab-${index}`, alt: `Video test ${index + 1}`,
    poster: url(asset.poster), posters: asset.posters?.map(poster => ({ ...poster, src: url(poster.src) })),
    renditions: asset.renditions.map(rung => ({ ...rung, h264: url(rung.h264) })) };
});

export function VideoLab() {
  const [columns, setColumns] = useState(3);
  const [selected, setSelected] = useState<number | null>(null);
  return <main className="portfolio-v3 text-captionSans">
    <p><InspectableText>Video lab — twelve independent copies of the current 60fps clip. Real content still needs device testing.</InspectableText></p>
    <div className="work-toolbar">
      {[1, 2, 3, 4, 6].map(value => <button className="work-control" type="button" key={value}
        aria-pressed={columns === value} onClick={() => setColumns(value)}><InspectableText>{value} columns</InspectableText></button>)}
    </div>
    <ul className="project-grid" style={{ "--project-columns": columns } as CSSProperties}>
      {clips.map((asset, index) => <li className="project-preview homepage-card" key={asset.id}>
        <button className="project-preview-link homepage-card-trigger" aria-label={`Prioritize video ${index + 1}`}
          onPointerEnter={() => setSelected(index)} onPointerLeave={() => setSelected(null)}
          onFocus={() => setSelected(index)} onBlur={() => setSelected(null)} onClick={() => setSelected(index)}>
          <ProjectPreviewVideo asset={asset} priority={selected === index} />
        </button>
      </li>)}
    </ul>
  </main>;
}
