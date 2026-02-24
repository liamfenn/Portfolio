"use client";

import { WORK_TIMELINE } from "@/lib/data";
import { WorkEntry } from "./work-entry";

export function WorkTimeline() {
  return (
    <div className="flex flex-col gap-8 md:gap-10">
      {WORK_TIMELINE.map((group) => (
        <div key={group.year} className="flex flex-col gap-8 relative">
          {/* Year label — inline on mobile, offset left on desktop */}
          <span
            className="type-mono-responsive text-muted-foreground md:absolute md:right-full md:mr-6 md:top-0"
          >
            {group.year}
          </span>

          {/* Entries */}
          <div className="flex flex-col gap-8">
            {group.entries.map((entry) => (
              <WorkEntry key={entry.id} entry={entry} />
            ))}
          </div>
        </div>
      ))}

      {/* Ellipsis — mobile only */}
      <span className="type-mono-responsive text-muted-foreground md:hidden">
        ...
      </span>
    </div>
  );
}
