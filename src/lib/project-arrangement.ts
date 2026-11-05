export type ProjectStackTag = "top" | "bottom";
type Tile = { id: string; stackTag?: ProjectStackTag };

/** Prevent top-tagged frames from joining bottom-tagged frames in the row below. */
export function arrangeProjectGrid<T extends Tile>(items: readonly T[], columns: number): T[] {
  const conflicts = (order: readonly T[]) => order.flatMap((item, index) =>
    item.stackTag === "bottom" && order[index - columns]?.stackTag === "top" ? [item.id] : []);
  const result = [...items];
  const blocked = conflicts(result);
  if (!blocked.length) return result;
  // Prefer a small swap, preserving the requested order wherever possible.
  for (const id of blocked) {
    const bottom = result.findIndex(item => item.id === id);
    for (const index of [...result.keys()].slice(bottom + 1).concat([...result.keys()].slice(0, bottom).reverse())) {
      const candidate = [...result];
      [candidate[bottom], candidate[index]] = [candidate[index], candidate[bottom]];
      if (!conflicts(candidate).length) return candidate;
    }
  }
  // Multiple tagged pairs can require more than one swap. Try stable valid prefixes;
  // failed branches with equivalent tags are interchangeable for these constraints.
  const search = (prefix: T[], remaining: T[]): T[] | null => {
    if (!remaining.length) return prefix;
    const tried = new Set<string>();
    for (let index = 0; index < remaining.length; index++) {
      const item = remaining[index];
      const key = item.stackTag ?? "none";
      if (tried.has(key)) continue;
      tried.add(key);
      const next = [...prefix, item];
      if (conflicts(next).length) continue;
      const found = search(next, remaining.filter((_, at) => at !== index));
      if (found) return found;
    }
    return null;
  };
  return search([], result) ?? result;
}

/** Expansion starts from the already-arranged order; it never reruns stacking rules. */
export function expandProjectGrid<T extends Tile>(items: readonly T[], columns: number, expandedId: string | null): T[] {
  const result = [...items];
  const index = result.findIndex(item => item.id === expandedId);
  if (columns === 2 && index >= 0 && index % 2 === 1) {
    [result[index - 1], result[index]] = [result[index], result[index - 1]];
  }
  return result;
}
