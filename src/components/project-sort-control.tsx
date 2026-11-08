"use client";

import { useState } from "react";
import { useProjectDisplayState } from "@/components/project-display-state";
import { WorkGlyphControl } from "@/components/work-glyph-control";
import { prepareVideoOrder } from "@/lib/video-playback";

const SORT_OPTIONS = [
  { value: "recent", label: "Recent" },
  { value: "random", label: "Random" },
] as const;

export function ProjectSortControl({ idleLabel, companyHref }: { idleLabel?: string; companyHref?: string }) {
  const { sortMode, setSortMode, reshuffle } = useProjectDisplayState();
  const [selection, setSelection] = useState(0);
  const index = SORT_OPTIONS.findIndex(option => option.value === sortMode);
  const selected = SORT_OPTIONS[index];

  return <div className="work-density-control feed-sort-control">
    {companyHref ? <a className="work-control work-sort-control" href={companyHref} target="_blank" rel="noreferrer">
      <WorkGlyphControl text={idleLabel ?? selected.label} variant="sort" />
    </a> : <button type="button" className="work-control work-sort-control" data-hover-glitch aria-label={`Sort projects: ${selected.label}`}
      onMouseDown={event => { if (event.detail > 1) event.preventDefault(); }}
      onClick={() => {
        prepareVideoOrder();
        const next = SORT_OPTIONS[(index + 1) % SORT_OPTIONS.length].value;
        setSelection(count => count + 1);
        if (next === "random") reshuffle();
        setSortMode(next);
      }}>
      <WorkGlyphControl text={idleLabel ?? selected.label} variant="sort" selection={selection} />
    </button>}
  </div>;
}
