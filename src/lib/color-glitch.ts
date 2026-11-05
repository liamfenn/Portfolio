/** A fresh scattered subset, with a hard ceiling even for very short link labels. */
export function glitchLetters(length: number, fraction: number, maxLetters: number, random = Math.random) {
  const limit = Math.min(Math.floor(length * fraction), maxLetters);
  if (limit < 1) return [];
  const count = 1 + Math.floor(random() * limit);
  const pool = Array.from({ length }, (_, index) => index);
  return Array.from({ length: count }, () => pool.splice(Math.floor(random() * pool.length), 1)[0]);
}

/** One cadence for hovered links, filter marks, and the globe/ring. */
export function hoverGlitchSettings() {
  const tokens = getComputedStyle(document.documentElement);
  const milliseconds = (name: string) => {
    const value = tokens.getPropertyValue(name).trim();
    return parseFloat(value) * (value.endsWith("ms") ? 1 : 1000);
  };
  return {
    duration: milliseconds("--link-glitch-flash-duration"),
    pauseMin: milliseconds("--link-glitch-pause-min"),
    pauseMax: milliseconds("--link-glitch-pause-max"),
    fraction: parseFloat(tokens.getPropertyValue("--link-glitch-max-fraction")),
    maxLetters: parseInt(tokens.getPropertyValue("--link-glitch-max-letters")),
  };
}
