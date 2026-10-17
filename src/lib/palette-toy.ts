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

export interface GlitchSettings {
  duration: number;
  size: number;
  density: number;
  burnIn: number;
  stutter: number;
  opacity: number;
  displacement: number;
}

export const DEFAULT_GLITCH: GlitchSettings = {
  duration: 200,
  size: 6,
  density: 0.04,
  burnIn: 0.12,
  stutter: 8,
  opacity: 1,
  displacement: 0,
};

export const GLITCH_CONTROLS = [
  { key: "duration", label: "Length", min: 200, max: 2400, step: 100, unit: "ms" },
  { key: "size", label: "Block size", min: 4, max: 40, step: 2, unit: "px" },
  { key: "density", label: "Coverage", min: 0.02, max: 0.6, step: 0.02, unit: "%" },
  { key: "burnIn", label: "Burn-in", min: 0, max: 1, step: 0.02, unit: "%" },
  { key: "stutter", label: "Stutter", min: 2, max: 16, step: 1, unit: "fps" },
  { key: "opacity", label: "Opacity", min: 0.1, max: 1, step: 0.05, unit: "%" },
  { key: "displacement", label: "Page jitter", min: 0, max: 12, step: 1, unit: "px" },
] as const;

export type PaletteVotes = Record<string, boolean>;
export function colorsFromVotes(votes: PaletteVotes) {
  const liked = PALETTE_CANDIDATES.filter(color => votes[color.hex] === true);
  if (liked.length) return liked;
  const available = DEFAULT_PALETTE.filter(color => votes[color.hex] !== false);
  // An entirely rejected set stays neutral until the next palette round.
  return available.length ? available : [{ name: "Neutral", hex: "#D7DAE1" }];
}

export function parsePalettePreferences(raw: string | null): { settings: GlitchSettings; votes: PaletteVotes } {
  const defaults = { settings: { ...DEFAULT_GLITCH }, votes: {} as PaletteVotes };
  if (!raw) return defaults;
  try {
    const saved = JSON.parse(raw);
    for (const control of GLITCH_CONTROLS) {
      const value = saved.settings?.[control.key];
      if (typeof value === "number" && Number.isFinite(value)) {
        defaults.settings[control.key] = Math.max(control.min, Math.min(control.max, value));
      }
    }
    for (const color of PALETTE_CANDIDATES) {
      if (typeof saved.votes?.[color.hex] === "boolean") defaults.votes[color.hex] = saved.votes[color.hex];
    }
  } catch { /* Ignore old or invalid preferences. */ }
  return defaults;
}
