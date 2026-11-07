"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { HomepageCard } from "@/components/homepage-card";
import { ProjectSortControl } from "@/components/project-sort-control";
import { ProjectFocus } from "@/components/project-focus";
import type { ProjectFocusSelection } from "@/components/project-focus";
import { useProjectDisplayState } from "@/components/project-display-state";
import { usePortfolioExperiments } from "@/components/portfolio-experiments";
import { PROJECT_PREVIEWS } from "@/lib/project-previews";
import { sortProjects } from "@/lib/project-order";
import { arrangeProjectGrid } from "@/lib/project-arrangement";
import { refreshVideoOrder } from "@/lib/video-playback";

const FILLED_PROJECTS = PROJECT_PREVIEWS.filter(project => project.media);

export function ProjectFeed() {
  const { featuredOrder, sortMode, randomSeed, setFocusedProject } = useProjectDisplayState();
  const { projectInteractionMode } = usePortfolioExperiments();
  const [isMobile, setIsMobile] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selection, setSelection] = useState<ProjectFocusSelection | null>(null);
  const sortRevision = `${sortMode}:${randomSeed}`;
  const previousSort = useRef(sortRevision);
  useLayoutEffect(() => {
    if (previousSort.current === sortRevision) return;
    previousSort.current = sortRevision;
    return refreshVideoOrder();
  }, [sortRevision]);
  useEffect(() => {
    const media = matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  // The focused view restarts its animations when these change, so they stay stable across the feed's own renders.
  const closeFocus = useCallback(() => setSelection(null), []);
  const clearFocusedProject = useCallback(() => setFocusedProject(null), [setFocusedProject]);

  const recent = sortProjects(FILLED_PROJECTS, featuredOrder, false);
  let projects = recent;
  if (sortMode === "random") {
    const rank = (id: string) => {
      let value = randomSeed + 1;
      for (const character of id) value = Math.imul(value ^ character.charCodeAt(0), 0x45d9f3b);
      return value >>> 0;
    };
    projects = [...recent].sort((a, b) => rank(a.id) - rank(b.id));
  }
  projects = arrangeProjectGrid(projects, 1);
  const overlay = projectInteractionMode === "overlay";
  const displayOrder = new Map(projects.map((project, index) => [project.id, index]));

  const focusIndex = selection ? projects.findIndex(project => project.id === selection.preview.id) : -1;
  const navigate = (direction: -1 | 1, keyboard: boolean) => {
    if (!selection || projects.length < 2) return;
    const preview = projects[(focusIndex + direction + projects.length) % projects.length];
    const trigger = selection.trigger.closest("ul")?.querySelector<HTMLButtonElement>(`[data-project-id="${preview.id}"] .homepage-card-trigger`);
    if (!trigger) return;
    setSelection({ preview, trigger, origin: trigger.getBoundingClientRect(), keyboard, navigation: true });
    setFocusedProject(preview);
  };

  return <section className="portfolio-feed" aria-label="Selected work">
    <div className="feed-toolbar text-bodySans">
      <ProjectSortControl />
    </div>
    {/* The tiles keep their place in the DOM and sorting only changes their CSS order: moving a playing video makes it flash black. */}
    <ul className="feed-projects" onFocusCapture={event => {
      if (!overlay || !expandedId) return;
      const trigger = (event.target as Element).closest(".homepage-card-trigger");
      if (trigger?.matches(":focus-visible") && trigger.closest<HTMLElement>("[data-project-id]")?.dataset.projectId !== expandedId) setExpandedId(null);
    }}>
      {recent.map((preview, index) => <HomepageCard key={preview.id} preview={preview} isMobile={isMobile} priorityMedia={index === 0}
        displayOrder={displayOrder.get(preview.id)}
        expanded={overlay && expandedId === preview.id}
        cardOverlay={overlay}
        focusActive={selection?.preview.id === preview.id}
        onOpenFocus={overlay ? undefined : (trigger, keyboard) => {
          setSelection({ preview, trigger, origin: trigger.getBoundingClientRect(), keyboard });
          setFocusedProject(preview);
        }}
        onToggle={() => setExpandedId(current => current === preview.id ? null : preview.id)} />)}
    </ul>
    {selection && <ProjectFocus selection={selection} position={focusIndex + 1} total={projects.length}
      neighbors={{ previous: projects[(focusIndex - 1 + projects.length) % projects.length], next: projects[(focusIndex + 1) % projects.length] }}
      onNavigate={navigate} onClosing={clearFocusedProject} onClose={closeFocus} />}
  </section>;
}
