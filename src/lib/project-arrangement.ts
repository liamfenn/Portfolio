type Tile = { id: string };

/** Keep project one out of the row directly above project seven in the same column. */
export function arrangeProjectGrid<T extends Tile>(items: readonly T[], columns: number, expandedId: string | null = null): T[] {
  const normalize = (order: readonly T[]) => {
    const result = [...order];
    const expanded = result.findIndex(item => item.id === expandedId);
    // Mobile expansion starts at its existing row, including right-column selections.
    if (columns === 2 && expanded >= 0 && expanded % 2 === 1) {
      [result[expanded - 1], result[expanded]] = [result[expanded], result[expanded - 1]];
    }
    return result;
  };
  const conflicts = (order: readonly T[]) => {
    let cursor = 0;
    const positions = new Map<string, { row: number; start: number; end: number }>();
    for (const item of order) {
      const span = item.id === expandedId ? columns : 1;
      if (span === columns && cursor % columns) cursor += columns - cursor % columns;
      positions.set(item.id, { row: Math.floor(cursor / columns), start: cursor % columns, end: cursor % columns + span });
      cursor += span;
    }
    const one = positions.get("shop-01"), seven = positions.get("shop-07");
    return one && seven && seven.row === one.row + 1 && one.start < seven.end && seven.start < one.end;
  };
  const result = normalize(items);
  if (!conflicts(result)) return result;
  const seven = result.findIndex(item => item.id === "shop-07");
  // Prefer moving seven one place later; retain the selected sort everywhere else.
  for (const index of [...result.keys()].slice(seven + 1).concat([...result.keys()].slice(0, seven).reverse())) {
    const candidate = [...result];
    [candidate[seven], candidate[index]] = [candidate[index], candidate[seven]];
    const normalized = normalize(candidate);
    if (!conflicts(normalized)) return normalized;
  }
  return result;
}
