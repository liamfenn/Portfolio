"use client";

import { useState } from "react";
import { useProjectDisplayState } from "@/components/project-display-state";
import { WorkGlyphControl } from "@/components/work-glyph-control";

const SORT_OPTIONS = [
  { value: "recent", label: "Recent" },
  { value: "random", label: "Random" },
] as const;

export function ProjectSortControl({ idleLabel }: { idleLabel?: string }) {
  const { sortMode, setSortMode, reshuffle } = useProjectDisplayState();
  const [selection, setSelection] = useState(0);
  const index = SORT_OPTIONS.findIndex(option => option.value === sortMode);
  const selected = SORT_OPTIONS[index];

  return <div className="work-density-control feed-sort-control">
    <button type="button" className="work-control work-sort-control" data-hover-glitch aria-label={`Sort projects: ${selected.label}`}
      onClick={() => {
        const next = SORT_OPTIONS[(index + 1) % SORT_OPTIONS.length].value;
        setSelection(count => count + 1);
        if (next === "random") reshuffle();
        setSortMode(next);
      }}>
      <WorkGlyphControl text={idleLabel ?? selected.label} variant="sort" selection={selection} />
    </button>
  </div>;
}
