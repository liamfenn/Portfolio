export type ProjectStackTag = "top" | "bottom";
type Tile = { id: string; stackTag?: ProjectStackTag };

/** Prevent top-tagged frames from joining bottom-tagged frames in the row below. */
export function arrangeProjectGrid<T extends Tile>(items: readonly T[], columns: number, expandedId: string | null = null, coveredId: string | null = null): T[] {
  const normalize = (order: readonly T[]) => {
    const result = [...order];
    const expanded = result.findIndex(item => item.id === expandedId);
    if (columns === 2 && expanded >= 0 && expanded % 2 === 1) {
      [result[expanded - 1], result[expanded]] = [result[expanded], result[expanded - 1]];
    }
    return result;
  };
  const conflicts = (order: readonly T[]) => {
    let cursor = 0;
    const tops: { row: number; start: number; end: number }[] = [];
    const blocked: string[] = [];
    for (const item of order) {
      const span = item.id === expandedId ? columns : 1;
      if (span === columns && cursor % columns) cursor += columns - cursor % columns;
      const position = { row: Math.floor(cursor / columns), start: cursor % columns, end: cursor % columns + span };
      if (item.id !== coveredId) {
        if (item.stackTag === "top") tops.push(position);
        if (item.stackTag === "bottom" && tops.some(top => position.row === top.row + 1 && top.start < position.end && position.start < top.end)) blocked.push(item.id);
      }
      cursor += span;
    }
    return blocked;
  };
  const result = normalize(items);
  const blocked = conflicts(result);
  if (!blocked.length) return result;
  // Prefer a small swap, preserving the requested order wherever possible.
  for (const id of blocked) {
    const bottom = result.findIndex(item => item.id === id);
    for (const index of [...result.keys()].slice(bottom + 1).concat([...result.keys()].slice(0, bottom).reverse())) {
      const candidate = [...result];
      [candidate[bottom], candidate[index]] = [candidate[index], candidate[bottom]];
      const normalized = normalize(candidate);
      if (!conflicts(normalized).length) return normalized;
    }
  }
  // Multiple tagged pairs can require more than one swap. Try stable valid prefixes;
  // failed branches with equivalent tags are interchangeable for these constraints.
  const search = (prefix: T[], remaining: T[]): T[] | null => {
    if (!remaining.length) return prefix;
    const tried = new Set<string>();
    for (let index = 0; index < remaining.length; index++) {
      const item = remaining[index];
      if (columns === 2 && item.id === expandedId && prefix.length % 2) continue;
      const key = `${item.stackTag ?? "none"}:${item.id === expandedId}:${item.id === coveredId}`;
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
