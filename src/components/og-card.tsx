"use client";

import { useEffect, useRef } from "react";
import { InspectableText } from "@/components/design-inspector";
import { burst } from "@/lib/og-burst";
import { playReel } from "@/lib/og-reel";
import type { BurstEvent } from "@/lib/og-burst";
import { currentGlyphPalette } from "@/lib/palette-toy";

const WORDS = [{ text: "Office of ", face: "og-card-sans" }, { text: "Liam Fennell", face: "og-card-serif" }];
/** The letters that glitch before the burst, from the Figma card (435:198). They settle on palette colours rather than
 * the card's, which predate the current palette. */
const GLITCHED = new Set([1, 2, 12, 16, 20, 21]);
/** What the letters pump out: mostly punctuation and symbols, with a few of the globe's letters and figures. */
const PUMP_CHARS = Array.from("@,.;:!?&*#%+=~/()[]{}'\"^_<>§¶°©agRQkWy7250");
/** Matches the swarm's own colour glitch, so the intro reads as the same effect. */
const FLICKER_MS = 55;
/** With ?glitch=all, every letter glitches instead of the six, this far apart left to right. */
const ALL_GLITCH_STAGGER_MS = 25;
/** In the reel, the work grid slides in as the last letter leaves the card, or this long after the first kick at most. */
const REEL_AFTER_KICK_MS = 2000;
/** Plain text at both ends, so the last frame meets the first and the video loops without a seam. */
const HOLD_MS = 600;

const nextFrame = () => new Promise<number>(resolve => requestAnimationFrame(resolve));
async function wait(ms: number, signal: AbortSignal) {
  const end = performance.now() + ms;
  while ((await nextFrame()) < end) signal.throwIfAborted();
}
/**
 * Each letter flickers through the palette (now and then its destination), then settles. Letters start on a loose
 * random stagger, or, given `stagger`, that many milliseconds apart in order.
 */
async function glitch(letters: { element: HTMLElement; to: string }[], signal: AbortSignal, stagger?: number) {
  const onEvent = window.__ogEvents ? recordEvent : undefined;
  const start = performance.now(), colors = currentGlyphPalette();
  const runs = letters.map((letter, index) => ({ ...letter, at: start + (stagger === undefined ? Math.random() * 120 : index * stagger), until: 0, flickAt: 0 }));
  runs.forEach(run => { run.until = run.at + 150 + Math.random() * 200; });
  for (let time = start; runs.some(run => run.until > time); time = await nextFrame()) {
    signal.throwIfAborted();
    for (const run of runs) {
      if (time < run.at || time - run.flickAt < FLICKER_MS) continue;
      if (time >= run.until) { run.element.style.color = run.to; continue; }
      run.flickAt = time;
      run.element.style.color = Math.random() < 0.25 ? run.to : colors[Math.floor(Math.random() * colors.length)];
      if (onEvent) {
        const box = run.element.getBoundingClientRect();
        onEvent({ type: "flick", time, x: (box.left + box.width / 2) / window.innerWidth, y: (box.top + box.height / 2) / window.innerHeight });
      }
    }
  }
  letters.forEach(letter => { letter.element.style.color = letter.to; });
}

/** The capture script sets window.__ogEvents to collect what happens, for timing the sound effects. */
declare global { interface Window { __ogLoops?: number; __ogReady?: boolean; __ogEvents?: BurstEvent[] } }
const recordEvent = (event: BurstEvent) => { window.__ogEvents?.push(event); };

/**
 * The link-preview card: the office name, a few letters glitch, then every letter bursts loose to bounce around the
 * card and plays its way back home (see og-burst), and the same letters glitch back. With `reel`, the letters are
 * thrown off the card instead, and the work grid plays (see og-reel) before they come back. It loops in real time
 * here; scripts/capture-og.mjs drives the same loop on a virtual clock to record it frame by frame.
 */
export function OgCard({ reel = false }: { reel?: boolean }) {
  const title = useRef<HTMLParagraphElement>(null);
  const stage = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = title.current, reelStage = stage.current;
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const controller = new AbortController(), { signal } = controller;
    const letters = Array.from(root.querySelectorAll<HTMLElement>("[data-letter]"));
    const all = new URLSearchParams(window.location.search).get("glitch") === "all";
    const glitched = letters.filter((element, index) => all ? element.textContent?.trim() : GLITCHED.has(index));
    const stagger = all ? ALL_GLITCH_STAGGER_MS : undefined;
    // ?landing=reverse plays the earlier landing, last out first home, instead of word by word, left to right.
    const landing = new URLSearchParams(window.location.search).get("landing") === "reverse" ? "reverse" : "reading";
    const run = async () => {
      await Promise.all([document.fonts.ready, import("matter-js")]);
      // The capture script starts its virtual clock only once this is set, rather than guessing at load time.
      window.__ogReady = true;
      for (;;) {
        await wait(HOLD_MS, signal);
        const colors = currentGlyphPalette();
        await glitch(glitched.map(element => ({ element, to: colors[Math.floor(Math.random() * colors.length)] })), signal, stagger);
        await wait(150, signal);
        await burst(letters, { signal, palette: currentGlyphPalette, chars: PUMP_CHARS, landing, onEvent: window.__ogEvents ? recordEvent : undefined,
          // The grid slides in as the last letter leaves the card.
          away: reel && reelStage ? { afterKickMs: REEL_AFTER_KICK_MS, interlude: () => playReel(reelStage, signal) } : undefined });
        // The intro glitch in reverse: the same letters come home in their glitched colours and flicker back to black.
        await wait(150, signal);
        await glitch(glitched.map(element => ({ element, to: "" })), signal, stagger);
        await wait(HOLD_MS, signal);
        window.__ogLoops = (window.__ogLoops ?? 0) + 1;
      }
    };
    run().catch(error => { if (!signal.aborted) throw error; });
    return () => controller.abort();
  }, [reel]);

  return (
    <main className="og-card">
      {reel && <div ref={stage} className="og-reel-stage" aria-hidden="true" />}
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
