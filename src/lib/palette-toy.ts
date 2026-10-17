export const PALETTE_CANDIDATES = [
  { name: "Lilac", hex: "#B9A7E8" },
  { name: "Dusty rose", hex: "#D7AEC3" },
  { name: "Powder blue", hex: "#ABCBE1" },
  { name: "Soft mint", hex: "#B4D8C6" },
  { name: "Cool gray", hex: "#D7DAE1" },
  { name: "Orchid", hex: "#C7A2D9" },
  { name: "Mauve", hex: "#B69CAE" },
  { name: "Wisteria", hex: "#9D90C8" },
  { name: "Blush", hex: "#E2C1D4" },
  { name: "Blue mist", hex: "#C2D9E8" },
  { name: "Steel blue", hex: "#8AA6BD" },
  { name: "Periwinkle", hex: "#ACB4DF" },
  { name: "Grape", hex: "#897895" },
  { name: "Mushroom", hex: "#BEB7BE" },
  { name: "Seafoam", hex: "#C6E5DA" },
  { name: "Faded teal", hex: "#89B5B6" },
  { name: "Sky", hex: "#90CAE2" },
  { name: "Pale violet", hex: "#D8CEF1" },
  { name: "Pink clay", hex: "#C99DB8" },
  { name: "Silver", hex: "#A3A4AC" },
] as const;

// The first quiz kept every color except Steel blue and Silver.
export const DEFAULT_PALETTE = PALETTE_CANDIDATES.filter(color =>
  color.name !== "Steel blue" && color.name !== "Silver",
);

/** Live tuning for the loose-type interaction. */
export interface GlyphSettings {
  share: number;
  gravity: number;
  bounce: number;
  friction: number;
  pull: number;
  scroll: number;
}
export const DEFAULT_GLYPHS: GlyphSettings = {
  share: 0.4, gravity: 1, bounce: 0.25, friction: 0.55, pull: 1, scroll: 0.3,
};
export const GLYPH_CONTROLS = [
  { key: "share", label: "Hover release chance", min: 0.05, max: 1, step: 0.05, unit: "%" },
  { key: "gravity", label: "Gravity", min: 0.2, max: 3, step: 0.1, unit: "×" },
  { key: "bounce", label: "Bounce", min: 0, max: 0.9, step: 0.05, unit: "%" },
  { key: "friction", label: "Friction", min: 0, max: 1, step: 0.05, unit: "%" },
  { key: "pull", label: "Pointer response", min: 0, max: 3, step: 0.1, unit: "×" },
  { key: "scroll", label: "Scroll reaction", min: 0, max: 1, step: 0.1, unit: "×" },
] as const;

export type PaletteVotes = Record<string, boolean>;
export function colorsFromVotes(votes: PaletteVotes) {
  const liked = PALETTE_CANDIDATES.filter(color => votes[color.hex] === true);
  if (liked.length) return liked;
  const available = DEFAULT_PALETTE.filter(color => votes[color.hex] !== false);
  // An entirely rejected set stays neutral until the next palette round.
  return available.length ? available : [{ name: "Neutral", hex: "#D7DAE1" }];
}

export function parsePalettePreferences(raw: string | null): { glyphs: GlyphSettings; votes: PaletteVotes } {
  const defaults = { glyphs: { ...DEFAULT_GLYPHS }, votes: {} as PaletteVotes };
  if (!raw) return defaults;
  try {
    const saved = JSON.parse(raw);
    for (const control of GLYPH_CONTROLS) {
      const value = saved.glyphs?.[control.key];
      if (typeof value === "number" && Number.isFinite(value)) {
        defaults.glyphs[control.key] = Math.max(control.min, Math.min(control.max, value));
      }
    }
    for (const color of PALETTE_CANDIDATES) {
      if (typeof saved.votes?.[color.hex] === "boolean") defaults.votes[color.hex] = saved.votes[color.hex];
    }
  } catch { /* Ignore old or invalid preferences. */ }
  return defaults;
}
