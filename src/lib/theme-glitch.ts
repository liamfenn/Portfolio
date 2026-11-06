import { glitchLetters, themeGlitchSettings } from "./color-glitch";
import { letterRanges } from "./link-hover-glitch";
import { currentGlyphPalette } from "./palette-toy";

export function startThemeGlitch() {
  const scope = document.querySelector<HTMLElement>("main");
  if (!scope || !globalThis.Highlight || !CSS.highlights || matchMedia("(prefers-reduced-motion: reduce)").matches) return () => {};
  const settings = themeGlitchSettings();
  const icon = document.querySelector<SVGElement>(".feed-toolbar .theme-toggle-icon");
  const palette = currentGlyphPalette();
  const style = document.createElement("style");
  const name = (index: number) => `portfolio-theme-glitch-${index}`;
  const highlights = palette.map((_, index) => {
    const highlight = new Highlight();
    highlight.priority = -1;
    CSS.highlights.set(name(index), highlight);
    return highlight;
  });
  style.textContent = palette.map((color, index) => `::highlight(${name(index)}) { color: ${color}; }`).join("\n");
  document.head.append(style);
  let timer = 0;
  const clear = () => {
    highlights.forEach(highlight => highlight.clear());
    icon?.style.removeProperty("color");
  };
  const pulse = () => {
    clear();
    const ranges = letterRanges(scope, true);
    if (!highlights.length) return;
    glitchLetters(ranges.length, settings.fraction, settings.maxLetters, Math.random, settings.minLetters).forEach(index => {
      highlights[Math.floor(Math.random() * highlights.length)].add(ranges[index]);
    });
    icon?.style.setProperty("color", palette[Math.floor(Math.random() * palette.length)]);
    timer = window.setTimeout(() => {
      clear();
      timer = window.setTimeout(pulse, settings.pauseMin + Math.random() * (settings.pauseMax - settings.pauseMin));
    }, settings.duration);
  };
  pulse();
  return () => {
    window.clearTimeout(timer);
    clear();
    highlights.forEach((_, index) => CSS.highlights.delete(name(index)));
    style.remove();
  };
}
