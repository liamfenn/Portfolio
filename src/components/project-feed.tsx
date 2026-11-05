"use client";

import { useCallback, useEffect, useState } from "react";
import { HomepageCard } from "@/components/homepage-card";
import { ProjectFeedLabel } from "@/components/project-feed-label";
import { ProjectFocus } from "@/components/project-focus";
import type { ProjectFocusSelection } from "@/components/project-focus";
import { useProjectDisplayState } from "@/components/project-display-state";
import { usePortfolioExperiments } from "@/components/portfolio-experiments";
import { PROJECT_PREVIEWS } from "@/lib/project-previews";
import { sortProjects } from "@/lib/project-order";
import { arrangeProjectGrid } from "@/lib/project-arrangement";

const FILLED_PROJECTS = PROJECT_PREVIEWS.filter(project => project.media);

export function ProjectFeed() {
  const { featuredOrder, editingOrder, swapOrder, setFocusedProject } = useProjectDisplayState();
  const { projectInteractionMode } = usePortfolioExperiments();
  const [isMobile, setIsMobile] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selection, setSelection] = useState<ProjectFocusSelection | null>(null);
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

  let projects = sortProjects(FILLED_PROJECTS, featuredOrder, false);
  if (!editingOrder) projects = arrangeProjectGrid(projects, 1);

  const overlay = projectInteractionMode === "overlay";
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
      <ProjectFeedLabel />
    </div>
    <ul className="feed-projects" onFocusCapture={event => {
      if (!overlay || !expandedId) return;
      const trigger = (event.target as Element).closest(".homepage-card-trigger");
      if (trigger?.matches(":focus-visible") && trigger.closest<HTMLElement>("[data-project-id]")?.dataset.projectId !== expandedId) setExpandedId(null);
    }}>
      {projects.map((preview, index) => <HomepageCard key={preview.id} preview={preview} isMobile={isMobile} priorityMedia={index === 0}
        reorder={editingOrder ? { swap: swapOrder, columns: 1, order: projects.map(project => project.id) } : undefined}
        expanded={overlay && !editingOrder && expandedId === preview.id}
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
