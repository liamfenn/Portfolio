"use client";

import Image from "next/image";
import { InspectableText } from "@/components/design-inspector";
import { ProjectCredits } from "@/components/project-focus";
import { ProjectPreviewVideo } from "@/components/project-preview-video";
import { ProjectReorderHandle } from "@/components/project-reorder-handle";
import { useProjectDisplayState } from "@/components/project-display-state";
import { mediaUrl } from "@/lib/media-delivery";
import { PROJECT_PREVIEWS } from "@/lib/project-previews";
import { sortProjects } from "@/lib/project-order";
import { arrangeProjectGrid } from "@/lib/project-arrangement";

const FILLED_PROJECTS = PROJECT_PREVIEWS.filter(project => project.media);

export function ProjectFeed() {
  const { featuredOrder, editingOrder, swapOrder, sortMode, setSortMode, randomSeed, reshuffle } = useProjectDisplayState();
  let projects = sortProjects(FILLED_PROJECTS, featuredOrder, sortMode === "recent");
  if (sortMode === "random") {
    const rank = (id: string) => {
      let value = randomSeed + 1;
      for (const character of id) value = Math.imul(value ^ character.charCodeAt(0), 0x45d9f3b);
      return value >>> 0;
    };
    projects.sort((a, b) => rank(a.id) - rank(b.id));
  }
  if (!editingOrder) projects = arrangeProjectGrid(projects, 1);

  return <section className="portfolio-feed" aria-label="Selected work" onKeyDown={event => {
    if (event.key !== "Escape") return;
    const detail = event.currentTarget.querySelector<HTMLDetailsElement>("details[open]");
    if (detail) {
      detail.open = false;
      detail.querySelector("summary")?.focus({ preventScroll: true });
    }
  }}>
    <div className="feed-toolbar text-bodySans">
      <details className="feed-sort">
        <summary><span className="feed-sort-mark" aria-hidden="true" /><InspectableText>{sortMode === "featured" ? "Featured" : sortMode === "recent" ? "Recent" : "Random"}</InspectableText></summary>
        <div className="feed-sort-options">
          {(["featured", "recent", "random"] as const).map(value => <button type="button" key={value} aria-pressed={sortMode === value}
            onClick={event => {
              setSortMode(value);
              if (value === "random") reshuffle();
              event.currentTarget.closest("details")!.open = false;
              event.currentTarget.closest("details")!.querySelector("summary")?.focus();
            }}><InspectableText>{value === "featured" ? "Featured" : value === "recent" ? "Recent" : "Random"}</InspectableText></button>)}
        </div>
      </details>
    </div>
    <ul className="feed-projects">
      {projects.map((preview, index) => <li key={preview.id} className="feed-project homepage-card" data-project-id={preview.id}>
        <details className="feed-project-disclosure" name="portfolio-project">
          <summary className="feed-media hover-surface" aria-label={`${preview.label}, ${preview.company}, ${preview.period}`}>
            {preview.media?.kind === "video" && <ProjectPreviewVideo asset={preview.media} priority={index === 0} />}
            {preview.media?.kind === "image" && <Image src={mediaUrl(preview.media.src)} alt={preview.media.alt} unoptimized={preview.media.unoptimized}
              fill sizes="(max-width: 767px) 100vw, 552px" style={{ objectFit: "cover" }} />}
            <span className="feed-info-icon" aria-hidden="true">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="feed-icon-open" src="/images/redesign/project-info.svg" alt="" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="feed-icon-close" src="/images/redesign/project-close.svg" alt="" />
            </span>
          </summary>
          <div className="feed-details project-focus-details text-bodySans">
            <div className="project-focus-heading">
              <div className="project-focus-name">
                <h2><InspectableText>{preview.company}</InspectableText></h2>
                <p className="project-focus-description"><InspectableText>{preview.label}</InspectableText></p>
              </div>
              <p className="project-focus-period text-captionSans"><InspectableText>{`Q${preview.quarter} ${String(preview.year).slice(-2)}`}</InspectableText></p>
            </div>
            <ProjectCredits preview={preview} techLabel="Tech" />
          </div>
        </details>
        {editingOrder && <ProjectReorderHandle id={preview.id} name={preview.label} reorder={{ swap: swapOrder, columns: 1, order: projects.map(project => project.id) }} />}
      </li>)}
    </ul>
  </section>;
}
