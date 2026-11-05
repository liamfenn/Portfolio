"use client";

import { WorkGlyphControl } from "@/components/work-glyph-control";

/** The feed's static heading, which the header also shows while over the images. */
export function ProjectFeedLabel({ idleLabel }: { idleLabel?: string }) {
  return <div className="work-density-control feed-sort-control">
    <WorkGlyphControl text={idleLabel ?? "Recent"} variant="sort" />
  </div>;
}
