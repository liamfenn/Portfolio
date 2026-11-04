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
