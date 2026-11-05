/** Keep stored orders usable as projects are added or removed. */
export function reconcileProjectOrder(ids: readonly string[], saved: readonly string[]): string[] {
  const available = new Set(ids);
  const seen = new Set<string>();
  return [...saved, ...ids].filter(id => {
    if (!available.has(id) || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

export function swapProjects(order: readonly string[], first: string, second: string): string[] {
  const result = [...order];
  const a = result.indexOf(first), b = result.indexOf(second);
  if (a >= 0 && b >= 0) [result[a], result[b]] = [result[b], result[a]];
  return result;
}

export function sortProjects<T extends { id: string; year: number; quarter?: number }>(projects: readonly T[], featured: readonly string[], recent = false): T[] {
  const order = new Map(featured.map((id, index) => [id, index]));
  return [...projects].sort((a, b) =>
    (recent ? b.year - a.year || (b.quarter ?? 0) - (a.quarter ?? 0) : 0)
    || (order.get(a.id) ?? featured.length) - (order.get(b.id) ?? featured.length));
}

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
