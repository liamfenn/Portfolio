type DatedProject = { id: string; year: number; quarter?: number };
const dateRank = ({ year, quarter }: DatedProject) => year * 10 + (quarter ?? 0);

/** Keeps the hand-set order and slots any project it doesn't name in by date, after others from the same quarter. */
export function placeNewProjects<T extends DatedProject>(projects: readonly T[], order: readonly string[]): T[] {
  const byId = new Map(projects.map(project => [project.id, project]));
  const placed = [...new Set(order)].flatMap(id => byId.get(id) ?? []);
  const known = new Set(placed.map(project => project.id));
  const newest = projects.filter(project => !known.has(project.id)).sort((a, b) => dateRank(b) - dateRank(a));
  for (const project of newest) {
    const older = placed.findIndex(other => dateRank(other) < dateRank(project));
    placed.splice(older < 0 ? placed.length : older, 0, project);
  }
  return placed;
}
