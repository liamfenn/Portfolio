/**
 * The palette quiz: a full spectrum generated in OKLCH around a reference set (risograph-bright reds, pinks,
 * violets, periwinkles, clear greens and highlighter yellows), every 15° of hue in up to three depths. Burnt
 * oranges, forest greens, royal blues and mustards were left out by request.
 */
export const PALETTE_CANDIDATES = [
  { name: "Light Raspberry", hex: "#FE96B7" },
  { name: "Raspberry", hex: "#F06397" },
  { name: "Deep Raspberry", hex: "#D7397B" },
  { name: "Light Watermelon", hex: "#FF99A1" },
  { name: "Watermelon", hex: "#F66377" },
  { name: "Deep Watermelon", hex: "#DD3858" },
  { name: "Light Tomato", hex: "#FF9C8C" },
  { name: "Tomato", hex: "#F66754" },
  { name: "Deep Tomato", hex: "#DE3E2D" },
  { name: "Light Vermilion", hex: "#FE9F73" },
  { name: "Vermilion", hex: "#F26F27" },
  { name: "Light Tangerine", hex: "#FFB578" },
  { name: "Tangerine", hex: "#F38906" },
  { name: "Light Apricot", hex: "#F9BA5F" },
  { name: "Apricot", hex: "#DF9700" },
  { name: "Pale Lemon", hex: "#FFE6A4" },
  { name: "Lemon", hex: "#FFDA74" },
  { name: "Pale Highlighter", hex: "#FCEE0C" },
  { name: "Highlighter", hex: "#F2E309" },
  { name: "Pale Chartreuse", hex: "#D8FA43" },
  { name: "Chartreuse", hex: "#CDF100" },
  { name: "Deep Chartreuse", hex: "#B5D505" },
  { name: "Light Lime", hex: "#96CD76" },
  { name: "Lime", hex: "#66B22D" },
  { name: "Deep Lime", hex: "#55A303" },
  { name: "Light Kelly", hex: "#79D28D" },
  { name: "Kelly", hex: "#22B95B" },
  { name: "Deep Kelly", hex: "#01A84D" },
  { name: "Light Mint", hex: "#5AD5A6" },
  { name: "Mint", hex: "#08B785" },
  { name: "Deep Mint", hex: "#03A578" },
  { name: "Light Jade", hex: "#3BD5BE" },
  { name: "Jade", hex: "#0AB49E" },
  { name: "Deep Jade", hex: "#01A38F" },
  { name: "Light Aqua", hex: "#23D4D4" },
  { name: "Aqua", hex: "#00B2B2" },
  { name: "Deep Aqua", hex: "#029393" },
  { name: "Light Pool", hex: "#29D1E8" },
  { name: "Pool", hex: "#0BAFC3" },
  { name: "Deep Pool", hex: "#0090A2" },
  { name: "Light Sky", hex: "#45CBF9" },
  { name: "Sky", hex: "#05ABD7" },
  { name: "Deep Sky", hex: "#008EB3" },
  { name: "Light Cornflower", hex: "#6EC4FF" },
  { name: "Cornflower", hex: "#40A5E3" },
  { name: "Light Periwinkle", hex: "#8BBEFF" },
  { name: "Periwinkle", hex: "#619EEA" },
  { name: "Light Iris", hex: "#A0B7FE" },
  { name: "Iris", hex: "#7C96EC" },
  { name: "Light Violet", hex: "#B3B1FF" },
  { name: "Violet", hex: "#9388FF" },
  { name: "Deep Violet", hex: "#7965F0" },
  { name: "Light Amethyst", hex: "#C7A8FE" },
  { name: "Amethyst", hex: "#AE7DF9" },
  { name: "Deep Amethyst", hex: "#955BE3" },
  { name: "Light Orchid", hex: "#DAA0F4" },
  { name: "Orchid", hex: "#C474E7" },
  { name: "Deep Orchid", hex: "#AB50D0" },
  { name: "Light Magenta", hex: "#E99BE2" },
  { name: "Magenta", hex: "#D76CCF" },
  { name: "Deep Magenta", hex: "#BE47B8" },
  { name: "Light Bubblegum", hex: "#F697CE" },
  { name: "Bubblegum", hex: "#E666B4" },
  { name: "Deep Bubblegum", hex: "#CD3F9B" },
] as const;

// Until the quiz is answered: a set drawn straight from the references.
const DEFAULT_NAMES = ["Tomato", "Raspberry", "Light Bubblegum", "Light Orchid", "Violet", "Light Iris", "Kelly", "Sky", "Highlighter", "Light Apricot"];
export const DEFAULT_PALETTE = PALETTE_CANDIDATES.filter(color => DEFAULT_NAMES.includes(color.name));
export type PaletteColor = { name: string; hex: string };

/** WCAG contrast of a colour against the white page. */
export function contrastOnWhite(hex: string) {
  const channel = (offset: number) => {
    const c = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const luminance = 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
  return 1.05 / (luminance + 0.05);
}
/** Below this, a colour disappears as thin glyphs on white. Such colours stay in the strip but sit out the glyph effects. */
export const GLYPH_MIN_CONTRAST = 1.5;
export function glyphColors(palette: readonly PaletteColor[]) {
  const legible = palette.filter(color => contrastOnWhite(color.hex) >= GLYPH_MIN_CONTRAST);
  return legible.length ? legible : palette;
}

/** Live tuning for the letter swarm. */
export interface GlyphSettings {
  amount: number;
  pull: number;
  push: number;
  bounce: number;
  drift: number;
  spacing: number;
}
export const DEFAULT_GLYPHS: GlyphSettings = {
  amount: 0.7, pull: 1, push: 1, bounce: 0.5, drift: 1, spacing: 1,
};
export const GLYPH_CONTROLS = [
  { key: "amount", label: "Letters pulled in", min: 0.1, max: 1, step: 0.05, unit: "%" },
  { key: "pull", label: "Anchor pull", min: 0.2, max: 3, step: 0.1, unit: "×" },
  { key: "push", label: "Pointer push", min: 0, max: 3, step: 0.1, unit: "×" },
  { key: "bounce", label: "Bounce", min: 0, max: 0.95, step: 0.05, unit: "%" },
  { key: "drift", label: "Ambient drift", min: 0, max: 3, step: 0.1, unit: "×" },
  { key: "spacing", label: "Spacing", min: 0.5, max: 2, step: 0.1, unit: "×" },
] as const;

export type PaletteVotes = Record<string, boolean>;
/** The palette: the colours voted Yes, less any dropped in the final cut. Before any Yes, the reference set. */
export function colorsFromVotes(votes: PaletteVotes, cuts: readonly string[] = []): PaletteColor[] {
  const liked = PALETTE_CANDIDATES.filter(color => votes[color.hex] === true && !cuts.includes(color.hex));
  if (liked.length) return liked;
  const available = DEFAULT_PALETTE.filter(color => votes[color.hex] !== false);
  // An entirely rejected set stays neutral until the next palette round.
  return available.length ? available : [{ name: "Neutral", hex: "#D7DAE1" }];
}

export function parsePalettePreferences(raw: string | null): { glyphs: GlyphSettings; votes: PaletteVotes; cuts: string[] } {
  const defaults = { glyphs: { ...DEFAULT_GLYPHS }, votes: {} as PaletteVotes, cuts: [] as string[] };
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
      if (Array.isArray(saved.cuts) && saved.cuts.includes(color.hex)) defaults.cuts.push(color.hex);
    }
  } catch { /* Ignore old or invalid preferences. */ }
  return defaults;
}
