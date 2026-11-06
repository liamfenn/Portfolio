/** A fresh scattered subset, with a hard ceiling even for very short link labels. */
export function glitchLetters(length: number, fraction: number, maxLetters: number, random = Math.random, minLetters = 1) {
  const limit = Math.min(Math.floor(length * fraction), maxLetters);
  if (limit < 1) return [];
  const minimum = Math.max(1, Math.min(limit, minLetters));
  const count = minimum + Math.floor(random() * (limit - minimum + 1));
  const pool = Array.from({ length }, (_, index) => index);
  return Array.from({ length: count }, () => pool.splice(Math.floor(random() * pool.length), 1)[0]);
}

export function cssMilliseconds(value: string) {
  return parseFloat(value) * (value.trim().endsWith("ms") ? 1 : 1000);
}

/** One cadence for hovered links and the sort control. */
export function hoverGlitchSettings() {
  const tokens = getComputedStyle(document.documentElement);
  const milliseconds = (name: string) => {
    const value = tokens.getPropertyValue(name).trim();
    return cssMilliseconds(value);
  };
  return {
    duration: milliseconds("--link-glitch-flash-duration"),
    pauseMin: milliseconds("--link-glitch-pause-min"),
    pauseMax: milliseconds("--link-glitch-pause-max"),
    fraction: parseFloat(tokens.getPropertyValue("--link-glitch-max-fraction")),
    maxLetters: parseInt(tokens.getPropertyValue("--link-glitch-max-letters")),
    markChance: parseFloat(tokens.getPropertyValue("--link-glitch-mark-chance")),
  };
}

export function themeGlitchSettings() {
  const tokens = getComputedStyle(document.documentElement);
  return {
    ...hoverGlitchSettings(),
    lead: cssMilliseconds(tokens.getPropertyValue("--theme-glitch-lead")),
    tail: cssMilliseconds(tokens.getPropertyValue("--theme-glitch-tail")),
    fraction: parseFloat(tokens.getPropertyValue("--theme-glitch-fraction")),
    minLetters: parseInt(tokens.getPropertyValue("--theme-glitch-min-letters")),
    maxLetters: parseInt(tokens.getPropertyValue("--theme-glitch-max-letters")),
  };
}
