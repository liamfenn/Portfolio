"use client";

import { useEffect, useSyncExternalStore } from "react";
import { applyTheme, resolveTheme, THEME_CHANGE_EVENT, THEME_STORAGE_KEY } from "@/lib/theme";

function readPreference() {
  try { return localStorage.getItem(THEME_STORAGE_KEY); } catch { return null; }
}

function subscribe(onChange: () => void) {
  window.addEventListener(THEME_CHANGE_EVENT, onChange);
  return () => window.removeEventListener(THEME_CHANGE_EVENT, onChange);
}

export function ThemeController() {
  useEffect(() => {
    const system = matchMedia("(prefers-color-scheme: dark)");
    const update = () => applyTheme(resolveTheme(readPreference(), system.matches));
    const onStorage = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY || event.key === null) update();
    };
    update();
    system.addEventListener("change", update);
    window.addEventListener("storage", onStorage);
    return () => {
      system.removeEventListener("change", update);
      window.removeEventListener("storage", onStorage);
    };
  }, []);
  return null;
}

export function ThemeToggle() {
  const dark = useSyncExternalStore(subscribe, () => document.documentElement.dataset.theme === "dark", () => false);
  return <button className="header-theme-toggle" type="button" aria-label="Dark mode" aria-pressed={dark} onClick={() => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    try { localStorage.setItem(THEME_STORAGE_KEY, next); } catch { /* The toggle still works when storage is unavailable. */ }
    applyTheme(next);
  }}>
    <svg className="theme-toggle-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10.5" stroke="currentColor" strokeWidth="3" />
      <path d="M12 1.5a10.5 10.5 0 0 1 0 21Z" fill="currentColor" />
    </svg>
  </button>;
}
