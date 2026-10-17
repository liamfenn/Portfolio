export type InspectionMode = "content" | "type-token" | "type-metrics" | "color-token" | "color-hex";

export function nextInspectionMode(mode: InspectionMode, key: "t" | "c" | "Escape"): InspectionMode {
  if (key === "Escape") return "content";
  if (key === "t") return mode === "type-token" ? "type-metrics" : mode === "type-metrics" ? "content" : "type-token";
  return mode === "color-token" ? "color-hex" : mode === "color-hex" ? "content" : "color-token";
}

export function formatTextMetrics(size: string, leading: string) {
  const pixels = (value: string) => `${Number.parseFloat(value).toFixed(2).replace(/\.?0+$/, "")}px`;
  return `${pixels(size)} / ${leading === "normal" ? "normal" : pixels(leading)}`;
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
