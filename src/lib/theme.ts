import { startThemeGlitch } from "./theme-glitch";
import { themeGlitchSettings } from "./color-glitch";

export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "portfolio-theme";
export const THEME_CHANGE_EVENT = "portfolio-theme-change";

export function resolveTheme(preference: string | null, systemDark: boolean): Theme {
  return preference === "light" || preference === "dark" ? preference : systemDark ? "dark" : "light";
}

// Run before the first paint so a saved theme never flashes the opposite surface.
export const THEME_INIT_SCRIPT = `(()=>{let preference;try{preference=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)})}catch{}document.documentElement.dataset.theme=preference==="light"||preference==="dark"?preference:matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"})()`;

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (meta) meta.content = getComputedStyle(document.documentElement).getPropertyValue("--bg-fill").trim();
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}

let activeTransition: ViewTransition | undefined;
let stopGlitch = () => {};
let switchRequest = 0;
let glitchTailTimer = 0;

export async function transitionTheme(theme: Theme) {
  const request = ++switchRequest;
  window.clearTimeout(glitchTailTimer);
  stopGlitch();
  activeTransition?.skipTransition();
  activeTransition = undefined;
  const root = document.documentElement;
  root.classList.remove("is-theme-switching");
  if (!document.startViewTransition || matchMedia("(prefers-reduced-motion: reduce)").matches) {
    applyTheme(theme);
    return;
  }
  stopGlitch = startThemeGlitch();
  const { lead, tail } = themeGlitchSettings();
  await new Promise(resolve => window.setTimeout(resolve, lead));
  if (request !== switchRequest) return;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
    stopGlitch();
    applyTheme(theme);
    return;
  }
  root.classList.add("is-theme-switching");
  const transition = document.startViewTransition(() => {
    applyTheme(theme);
  });
  activeTransition = transition;
  void transition.finished.catch(() => {}).finally(() => {
    if (activeTransition !== transition || request !== switchRequest) return;
    root.classList.remove("is-theme-switching");
    glitchTailTimer = window.setTimeout(() => {
      if (request === switchRequest) stopGlitch();
    }, tail);
    activeTransition = undefined;
  });
}
