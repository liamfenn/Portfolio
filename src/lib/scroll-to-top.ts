import { animate } from "motion";
import { isSafari } from "./browser-engine";

/** Safari's native smooth scroll has a short fixed duration, even from the bottom of the feed. */
export function scrollToTop() {
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  if (motion.matches || !isSafari(navigator.userAgent)) {
    window.scrollTo({ top: 0, behavior: motion.matches ? "instant" : "smooth" });
    return () => {};
  }
  const start = Math.max(0, window.scrollY);
  if (!start) return () => {};
  const tokens = getComputedStyle(document.documentElement);
  const seconds = (name: string) => {
    const value = tokens.getPropertyValue(name).trim();
    return parseFloat(value) / (value.endsWith("ms") ? 1000 : 1);
  };
  const duration = Math.min(seconds("--scroll-top-max-duration"),
    seconds("--scroll-top-min-duration") + Math.sqrt(start / innerHeight) * seconds("--scroll-top-viewport-duration"));
  const ease = tokens.getPropertyValue("--scroll-top-ease").match(/-?[\d.]+/g)!.map(Number) as [number, number, number, number];
  const inputs = ["wheel", "touchstart", "pointerdown", "keydown"] as const;
  const cleanup = () => {
    inputs.forEach(type => window.removeEventListener(type, stop));
    motion.removeEventListener("change", motionChanged);
  };
  const stop = () => { animation.stop(); cleanup(); };
  const motionChanged = () => {
    if (motion.matches) { stop(); window.scrollTo({ top: 0, behavior: "instant" }); }
  };
  const animation = animate(start, 0, {
    duration, ease,
    onUpdate: top => window.scrollTo({ top, behavior: "instant" }),
    onComplete: cleanup,
  });
  // A new gesture takes ownership immediately instead of fighting the scripted scroll.
  inputs.forEach(type => window.addEventListener(type, stop, { passive: true }));
  motion.addEventListener("change", motionChanged);
  return stop;
}
