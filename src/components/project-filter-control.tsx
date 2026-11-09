"use client";

import { useState } from "react";
import { useProjectDisplayState } from "@/components/project-display-state";
import { WorkGlyphControl } from "@/components/work-glyph-control";
import { PROJECT_FILTERS } from "@/lib/project-filters";

export function ProjectFilterControl({ idleLabel, companyHref }: { idleLabel?: string; companyHref?: string }) {
  const { projectFilter, setProjectFilter } = useProjectDisplayState();
  const [selection, setSelection] = useState(0);
  const index = PROJECT_FILTERS.findIndex(option => option.value === projectFilter);
  const selected = PROJECT_FILTERS[index];

  return <div className="work-density-control feed-filter-control">
    {companyHref ? <a className="work-control work-sort-control" href={companyHref} target="_blank" rel="noreferrer">
      <WorkGlyphControl text={idleLabel ?? selected.label} variant="sort" />
    </a> : <button type="button" className="work-control work-sort-control" data-hover-glitch aria-label={`Filter projects: ${selected.label}`} aria-controls="project-feed-projects"
      onMouseDown={event => { if (event.detail > 1) event.preventDefault(); }}
      onClick={() => {
        setSelection(count => count + 1);
        setProjectFilter(PROJECT_FILTERS[(index + 1) % PROJECT_FILTERS.length].value);
      }}>
      <WorkGlyphControl text={idleLabel ?? selected.label} variant="sort" selection={selection} />
    </button>}
  </div>;
}
