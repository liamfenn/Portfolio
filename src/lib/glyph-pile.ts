export interface PileGlyph {
  /** Where the glyph starts, measured from the left edge of the pile. */
  x: number;
  width: number;
  height: number;
}

export interface PileSpot {
  /** Left edge of the resting glyph. */
  x: number;
  /** Distance from the floor to the glyph's bottom edge. */
  y: number;
}

/**
 * Settles glyphs into a sand-like pile, in drop order. The floor is split into narrow columns; each glyph
 * slides toward lower ground while its neighbor is more than half a glyph lower, then rests on the tallest
 * column it covers. Glyphs never overlap and never float.
 */
export function settlePile(glyphs: PileGlyph[], floorWidth: number, column = 4, random = Math.random): PileSpot[] {
  const columns = Math.max(1, Math.ceil(floorWidth / column));
  const heights = new Array<number>(columns).fill(0);
  const restOn = (start: number, span: number) => Math.max(...heights.slice(start, start + span));

  return glyphs.map(glyph => {
    const span = Math.min(columns, Math.max(1, Math.ceil(glyph.width / column)));
    const last = columns - span;
    let start = Math.min(last, Math.max(0, Math.round(glyph.x / column)));

    // Compare against the spots a full glyph-width away, so the neighbor never shares this spot's columns.
    for (let steps = 0; steps < columns; steps++) {
      const here = restOn(start, span);
      const leftStart = Math.max(0, start - span);
      const rightStart = Math.min(last, start + span);
      const left = leftStart < start ? restOn(leftStart, span) : Infinity;
      const right = rightStart > start ? restOn(rightStart, span) : Infinity;
      const lower = Math.min(left, right);
      if (here - lower <= glyph.height / 2) break;
      start = left === right ? (random() < 0.5 ? leftStart : rightStart) : left < right ? leftStart : rightStart;
    }

    const y = restOn(start, span);
    for (let index = start; index < start + span; index++) heights[index] = y + glyph.height;
    return { x: start * column, y };
  });
}
