"use client";

import { useEffect, useRef } from "react";
import { InspectableText } from "@/components/design-inspector";
import { burst } from "@/lib/og-burst";
import { currentGlyphPalette } from "@/lib/palette-toy";

const WORDS = [{ text: "Office of ", face: "og-card-sans" }, { text: "Liam Fennell", face: "og-card-serif" }];
/** The letters that glitch before the burst, from the Figma card (435:198). They settle on palette colours rather than
 * the card's, which predate the current palette. */
const GLITCHED = new Set([1, 2, 12, 16, 20, 21]);
/** What the letters pump out: mostly punctuation and symbols, with a few of the globe's letters and figures. */
const PUMP_CHARS = Array.from("@,.;:!?&*#%+=~/()[]{}'\"^_<>§¶°©agRQkWy7250");
/** Matches the swarm's own colour glitch, so the intro reads as the same effect. */
const FLICKER_MS = 55;
/** Plain text at both ends, so the last frame meets the first and the video loops without a seam. */
const HOLD_MS = 600;

const nextFrame = () => new Promise<number>(resolve => requestAnimationFrame(resolve));
async function wait(ms: number, signal: AbortSignal) {
  const end = performance.now() + ms;
  while ((await nextFrame()) < end) signal.throwIfAborted();
}
/** Each letter flickers through the palette (now and then its destination) on its own short stagger, then settles. */
async function glitch(letters: { element: HTMLElement; to: string }[], signal: AbortSignal) {
  const start = performance.now(), colors = currentGlyphPalette();
  const runs = letters.map(letter => ({ ...letter, at: start + Math.random() * 120, until: 0, flickAt: 0 }));
  runs.forEach(run => { run.until = run.at + 150 + Math.random() * 200; });
  for (let time = start; runs.some(run => run.until > time); time = await nextFrame()) {
    signal.throwIfAborted();
    for (const run of runs) {
      if (time < run.at || time - run.flickAt < FLICKER_MS) continue;
      if (time >= run.until) { run.element.style.color = run.to; continue; }
      run.flickAt = time;
      run.element.style.color = Math.random() < 0.25 ? run.to : colors[Math.floor(Math.random() * colors.length)];
    }
  }
  letters.forEach(letter => { letter.element.style.color = letter.to; });
}

declare global { interface Window { __ogLoops?: number } }

/**
 * The link-preview card: the office name, a few letters glitch, then every letter bursts loose to bounce around the
 * card and plays its way back home (see og-burst), and the same letters glitch back. It loops in real time here; scripts/capture-og.mjs drives the same
 * loop on a virtual clock to record it frame by frame.
 */
export function OgCard() {
  const title = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const root = title.current;
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const controller = new AbortController(), { signal } = controller;
    const letters = Array.from(root.querySelectorAll<HTMLElement>("[data-letter]"));
    const glitched = letters.filter((_, index) => GLITCHED.has(index));
    const run = async () => {
      await Promise.all([document.fonts.ready, import("matter-js")]);
      for (;;) {
        await wait(HOLD_MS, signal);
        const colors = currentGlyphPalette();
        await glitch(glitched.map(element => ({ element, to: colors[Math.floor(Math.random() * colors.length)] })), signal);
        await wait(150, signal);
        await burst(letters, { signal, palette: currentGlyphPalette, chars: PUMP_CHARS });
        // The intro glitch in reverse: the same letters come home in their glitched colours and flicker back to black.
        await wait(150, signal);
        await glitch(glitched.map(element => ({ element, to: "" })), signal);
        await wait(HOLD_MS, signal);
        window.__ogLoops = (window.__ogLoops ?? 0) + 1;
      }
    };
    run().catch(error => { if (!signal.aborted) throw error; });
    return () => controller.abort();
  }, []);

  return (
    <main className="og-card">
      <InspectableText>
        <p ref={title} className="og-card-title">
          {WORDS.map(({ text, face }, word) => (
            <span key={word} className={face}>
              {Array.from(text).map((char, index) => <span key={index} data-letter="">{char}</span>)}
            </span>
          ))}
        </p>
      </InspectableText>
    </main>
  );
}
