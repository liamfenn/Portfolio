export const PROJECT_FILTERS = [
  { value: "all", label: "All" },
  { value: "shop", label: "Shop" },
  { value: "other", label: "Other" },
] as const;

export type ProjectFilter = typeof PROJECT_FILTERS[number]["value"];

/** Filtering only removes entries from the curated sequence; it never changes their relative order. */
export function filterProjects<T extends { company: string }>(projects: readonly T[], filter: ProjectFilter): T[] {
  return projects.filter(project => filter === "all" || (filter === "shop" ? project.company === "Shop" : project.company !== "Shop"));
}
