export type InspectionMode =
  | "content" | "type-token" | "type-metrics" | "color-token" | "color-hex"
  | "padding-y" | "padding-x" | "margin-y" | "margin-x" | "gap-y" | "gap-x" | "spacing-y" | "spacing-x";
// C is Vercel's toolbar comment shortcut, so color uses O.
export type InspectionKey = "t" | "o" | "p" | "m" | "g" | "s" | "Escape";
export type SpacingKind = "margin" | "padding" | "gap";

const MODE_CYCLES: Record<Exclude<InspectionKey, "Escape">, InspectionMode[]> = {
  t: ["type-token", "type-metrics"],
  o: ["color-token", "color-hex"],
  p: ["padding-y", "padding-x"],
  m: ["margin-y", "margin-x"],
  g: ["gap-y", "gap-x"],
  s: ["spacing-y", "spacing-x"],
};

/** Each key steps through its own modes and back to content; another key starts its first mode. */
export function nextInspectionMode(mode: InspectionMode, key: InspectionKey): InspectionMode {
  if (key === "Escape") return "content";
  const cycle = MODE_CYCLES[key];
  const index = cycle.indexOf(mode);
  return index === -1 ? cycle[0] : cycle[index + 1] ?? "content";
}

/** Text and color modes swap text for labels; spacing modes draw an overlay instead. */
export function isLabelMode(mode: InspectionMode) {
  return mode.startsWith("type-") || mode.startsWith("color-");
}

/** Spacing kinds a mode draws, in paint order: margins under padding under gaps. */
export function spacingKinds(mode: InspectionMode): SpacingKind[] {
  if (mode.startsWith("spacing-")) return ["margin", "padding", "gap"];
  const kind = mode.slice(0, mode.indexOf("-"));
  return kind === "margin" || kind === "padding" || kind === "gap" ? [kind] : [];
}

export function formatPixels(value: string | number) {
  return (typeof value === "number" ? value : Number.parseFloat(value)).toFixed(2).replace(/\.?0+$/, "");
}

export function formatTextMetrics(size: string, leading: string) {
  return `${formatPixels(size)} / ${leading === "normal" ? "normal" : formatPixels(leading)}`;
}

export type Box = { left: number; top: number; right: number; bottom: number };

/**
 * Measures the visible space between laid-out children. Children are grouped into rows by
 * vertical overlap, so this works for flex rows, flex columns, wrapping flex, and grids.
 * Vertical gaps span the container's content width; horizontal gaps span their row.
 */
export function gapBoxes(content: Box, items: Box[], axis: "vertical" | "horizontal"): Box[] {
  const rows: { top: number; bottom: number; items: Box[] }[] = [];
  for (const item of [...items].sort((a, b) => a.top - b.top)) {
    const row = rows.at(-1);
    if (row && item.top < row.bottom - 0.5) {
      row.items.push(item);
      row.bottom = Math.max(row.bottom, item.bottom);
    } else {
      rows.push({ top: item.top, bottom: item.bottom, items: [item] });
    }
  }

  const gaps: Box[] = [];
  if (axis === "vertical") {
    for (let index = 1; index < rows.length; index++) {
      const top = rows[index - 1].bottom;
      const bottom = rows[index].top;
      if (bottom - top > 0.5) gaps.push({ left: content.left, right: content.right, top, bottom });
    }
    return gaps;
  }

  for (const row of rows) {
    let right = -Infinity;
    for (const item of [...row.items].sort((a, b) => a.left - b.left)) {
      if (item.left - right > 0.5 && right !== -Infinity) gaps.push({ left: right, right: item.left, top: row.top, bottom: row.bottom });
      right = Math.max(right, item.right);
    }
  }
  return gaps;
}

/** Computed text colors are RGB in Safari and Chromium; support sRGB too. */
export function colorToHex(value: string): string {
  const color = value.trim().toLowerCase();
  if (color === "transparent") return "#00000000";
  if (color === "black") return "#000000";
  if (color === "white") return "#FFFFFF";
  if (/^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/.test(color)) {
    const expanded = color.length < 6 ? color.slice(1).split("").map(c => c + c).join("") : color.slice(1);
    return `#${expanded.length === 8 && expanded.endsWith("ff") ? expanded.slice(0, -2) : expanded}`.toUpperCase();
  }
  const rgb = color.match(/^rgba?\((.+)\)$/);
  const srgb = color.match(/^color\(srgb\s+(.+)\)$/);
  if (!rgb && !srgb) return value;
  const parts = (rgb?.[1] ?? srgb![1]).split(/[,\s/]+/).filter(Boolean);
  const byte = (number: number) => Math.round(Math.max(0, Math.min(255, number))).toString(16).padStart(2, "0");
  const channels = parts.slice(0, 3).map(part => {
    const value = Number.parseFloat(part);
    return byte(part.endsWith("%") ? value / 100 * 255 : srgb ? value * 255 : value);
  }).join("");
  const alpha = parts[3] === undefined ? 1 : Number.parseFloat(parts[3]) / (parts[3].endsWith("%") ? 100 : 1);
  return `#${channels}${alpha < 1 ? byte(alpha * 255) : ""}`.toUpperCase();
}

export type InspectorFlag = { enabled: boolean; remember?: "on" | "off" };

/**
 * The inspector is a debugging tool, never shipped to production. `?inspect` turns it on for this browser
 * (remembered), `?inspect=off` turns it off again. Local development has it on unless turned off.
 */
export function resolveInspectorFlag({ vercelEnv, nodeEnv, param, stored }: {
  vercelEnv?: string; nodeEnv?: string; param: string | null; stored: string | null;
}): InspectorFlag {
  if (vercelEnv === "production") return { enabled: false };
  if (param !== null) {
    const enabled = !["off", "0", "false"].includes(param.toLowerCase());
    return { enabled, remember: enabled ? "on" : "off" };
  }
  return { enabled: stored === "on" || (nodeEnv === "development" && stored !== "off") };
}

/**
 * Turns devicemotion samples into shake events: a shake is `peaks` sharp changes in acceleration
 * (at least `minGap` ms apart, so one jolt counts once) within `window` ms, then quiet for `cooldown` ms.
 */
export function createShakeDetector({ threshold = 15, peaks = 2, minGap = 80, window = 800, cooldown = 1200 } = {}) {
  let last: [number, number, number] | null = null;
  let hits: number[] = [];
  let quietUntil = 0;
  return (x: number, y: number, z: number, time: number) => {
    const previous = last;
    last = [x, y, z];
    if (!previous || time < quietUntil) return false;
    if (Math.hypot(x - previous[0], y - previous[1], z - previous[2]) < threshold) return false;
    if (hits.length && time - hits[hits.length - 1] < minGap) return false;
    hits = [...hits.filter(hit => time - hit < window), time];
    if (hits.length < peaks) return false;
    hits = [];
    quietUntil = time + cooldown;
    return true;
  };
}
