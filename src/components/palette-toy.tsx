"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cubicBezier } from "motion";
import { DEFAULT_EFFECT, DEFAULT_GLITCH, GLITCH_CONTROLS, PALETTE_CANDIDATES, PLAYFUL_EFFECTS, colorsFromVotes, parsePalettePreferences } from "@/lib/palette-toy";
import type { PaletteVotes, PlayfulEffect } from "@/lib/palette-toy";
import { dropGlyphs } from "@/lib/glyph-drop";
import type { GlyphDrop } from "@/lib/glyph-drop";
import { startSnake } from "@/lib/pixel-snake";
import type { PixelSnake } from "@/lib/pixel-snake";
import { InspectableText } from "@/components/design-inspector";

const STORAGE_KEY = "portfolio-palette-lab-v1";
// The strip holds each color, then slides one swatch left. Position and colors come from the same clock,
// so a new color and the snap back always land in the same frame.
const STRIP_SWATCHES = 6;
const STRIP_STEP_PX = 20;
const STRIP_PERIOD_MS = 1000;
const STRIP_HOLD = 0.65;
const stripEase = cubicBezier(0.16, 1, 0.3, 1);

interface BurnedBlock {
  x: number;
  y: number;
  size: number;
  color: string;
  opacity: number;
}

export function PaletteToy() {
  const [votes, setVotes] = useState<PaletteVotes>({});
  const [settings, setSettings] = useState({ ...DEFAULT_GLITCH });
  const [effect, setEffect] = useState<PlayfulEffect>(DEFAULT_EFFECT);
  // The glyph drop and snake stay on screen until the strip is tapped again.
  const activeRef = useRef<{ kind: "drop"; run: GlyphDrop } | { kind: "snake"; run: PixelSnake } | null>(null);
  const [isEffectActive, setIsEffectActive] = useState(false);
  const [ready, setReady] = useState(false);
  const [labEnabled, setLabEnabled] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [tab, setTab] = useState<"palette" | "glitch">("palette");
  const [reviewIndex, setReviewIndex] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const trackRef = useRef<HTMLSpanElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const burnCanvasRef = useRef<HTMLCanvasElement>(null);
  // Marks live only in this page instance. Refreshing starts with an empty map.
  const burnedBlocksRef = useRef(new Map<string, BurnedBlock>());
  const stopRef = useRef<(() => void) | null>(null);
  const palette = colorsFromVotes(votes);
  const unansweredIndex = PALETTE_CANDIDATES.findIndex(color => votes[color.hex] === undefined);
  const quizIndex = reviewIndex ?? unansweredIndex;
  const candidate = PALETTE_CANDIDATES[quizIndex];
  const liked = PALETTE_CANDIDATES.filter(color => votes[color.hex] === true);
  const answered = Object.keys(votes).length;

  const drawBurns = useCallback(() => {
    const canvas = burnCanvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const width = window.innerWidth;
    const height = window.innerHeight;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const pixelWidth = Math.ceil(width * ratio);
    const pixelHeight = Math.ceil(height * ratio);
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    for (const block of burnedBlocksRef.current.values()) {
      const x = block.x - scrollX;
      const y = block.y - scrollY;
      if (x + block.size <= 0 || y + block.size <= 0 || x >= width || y >= height) continue;
      context.globalAlpha = block.opacity;
      context.fillStyle = block.color;
      context.fillRect(x, y, block.size, block.size);
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    let frame = 0;
    const scheduleDraw = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => { frame = 0; drawBurns(); });
    };
    drawBurns();
    window.addEventListener("scroll", scheduleDraw, { passive: true });
    window.addEventListener("resize", scheduleDraw);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", scheduleDraw);
      window.removeEventListener("resize", scheduleDraw);
    };
  }, [ready, drawBurns]);

  useEffect(() => {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotion = () => setReducedMotion(motionQuery.matches);
    const frame = window.requestAnimationFrame(() => {
      let raw: string | null = null;
      try { raw = localStorage.getItem(STORAGE_KEY); } catch { /* Preferences are optional. */ }
      const saved = parsePalettePreferences(raw);
      setVotes(saved.votes);
      setSettings(saved.settings);
      setEffect(saved.effect);
      setLabEnabled(new URLSearchParams(window.location.search).has("palette-lab"));
      updateMotion();
      setReady(true);
    });
    motionQuery.addEventListener("change", updateMotion);
    return () => {
      window.cancelAnimationFrame(frame);
      motionQuery.removeEventListener("change", updateMotion);
      stopRef.current?.();
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ votes, settings, effect })); } catch { /* Private browsing may disable storage. */ }
  }, [ready, votes, settings, effect]);

  useEffect(() => {
    if (reducedMotion) stopRef.current?.();
  }, [reducedMotion]);

  const paletteKey = palette.map(color => color.hex).join(" ");
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const colors = paletteKey.split(" ");
    const swatches = Array.from(track.children) as HTMLElement[];
    let shownStep = -1;
    const paintStep = (step: number) => {
      if (step === shownStep) return;
      shownStep = step;
      swatches.forEach((swatch, index) => { swatch.style.backgroundColor = colors[(step + index) % colors.length]; });
    };
    const slideTo = (x: string) => swatches.forEach(swatch => { swatch.style.transform = x; });
    if (reducedMotion) {
      slideTo("");
      paintStep(0);
      return;
    }
    let frame = 0;
    // Synced once at load: start the clock so each slide begins on a whole second of the device clock,
    // the same beat the music player's time ticks on. From here it runs on its own.
    const startedAt = performance.now() - (Date.now() % STRIP_PERIOD_MS) - STRIP_HOLD * STRIP_PERIOD_MS;
    const render = (time: number) => {
      const elapsed = Math.max(0, time - startedAt);
      const step = Math.floor(elapsed / STRIP_PERIOD_MS);
      const phase = (elapsed % STRIP_PERIOD_MS) / STRIP_PERIOD_MS;
      const slide = phase < STRIP_HOLD ? 0 : stripEase((phase - STRIP_HOLD) / (1 - STRIP_HOLD));
      paintStep(step);
      // The track clips, so the swatches move inside it.
      slideTo(`translateX(${-slide * STRIP_STEP_PX}px)`);
      frame = window.requestAnimationFrame(render);
    };
    frame = window.requestAnimationFrame(render);
    return () => window.cancelAnimationFrame(frame);
  }, [paletteKey, reducedMotion]);

  const startGlitch = useCallback(() => {
    if (reducedMotion) return;
    const canvas = canvasRef.current;
    const page = triggerRef.current?.closest("main");
    const context = canvas?.getContext("2d");
    if (!canvas || !context || !page) return;
    stopRef.current?.();
    const width = window.innerWidth;
    const height = window.innerHeight;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.ceil(width * ratio);
    canvas.height = Math.ceil(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    canvas.hidden = false;
    page.classList.add("is-palette-glitching");
    let frame = 0;
    let lastPaint = -Infinity;
    const startedAt = performance.now();
    const stop = () => {
      window.cancelAnimationFrame(frame);
      canvas.hidden = true;
      context.clearRect(0, 0, width, height);
      page.classList.remove("is-palette-glitching");
      (page as HTMLElement).style.removeProperty("--palette-jitter-x");
      (page as HTMLElement).style.removeProperty("--palette-jitter-y");
      stopRef.current = null;
    };
    stopRef.current = stop;
    const paint = (time: number) => {
      if (time - startedAt >= settings.duration) { stop(); return; }
      if (time - lastPaint >= 1000 / settings.stutter) {
        lastPaint = time;
        context.clearRect(0, 0, width, height);
        // Vary the coverage between bursts; the marks always remain square.
        const burst = 0.45 + Math.random() * 0.55;
        context.globalAlpha = settings.opacity;
        // Anchor the grid to the document, so burned marks stay on the page when scrolling.
        const scrollX = window.scrollX;
        const scrollY = window.scrollY;
        for (let y = -(scrollY % settings.size); y < height; y += settings.size) {
          for (let x = -(scrollX % settings.size); x < width; x += settings.size) {
            if (Math.random() > settings.density * burst) continue;
            const color = palette[Math.floor(Math.random() * palette.length)].hex;
            context.fillStyle = color;
            context.fillRect(x, y, settings.size, settings.size);
            if (Math.random() < settings.burnIn) {
              const documentX = Math.round(x + scrollX);
              const documentY = Math.round(y + scrollY);
              const key = `${settings.size}:${documentX}:${documentY}`;
              burnedBlocksRef.current.set(key, {
                x: documentX, y: documentY, size: settings.size, color, opacity: settings.opacity,
              });
            }
          }
        }
        drawBurns();
        const jitter = () => `${Math.round((Math.random() * 2 - 1) * settings.displacement)}px`;
        (page as HTMLElement).style.setProperty("--palette-jitter-x", jitter());
        (page as HTMLElement).style.setProperty("--palette-jitter-y", jitter());
      }
      frame = window.requestAnimationFrame(paint);
    };
    // Every tap leaves a trace, even if another tap interrupts the animation immediately.
    paint(startedAt);
  }, [drawBurns, palette, reducedMotion, settings]);

  const endEffect = useCallback(() => {
    const active = activeRef.current;
    activeRef.current = null;
    setIsEffectActive(false);
    if (active?.kind === "drop") void active.run.restore();
    if (active?.kind === "snake") active.run.stop();
  }, []);

  // Tap once to start the drop or the snake, tap again to put the letters back or dissolve the snake.
  const runEffect = useCallback(() => {
    if (reducedMotion) return;
    if (effect === "glitch") { startGlitch(); return; }
    const active = activeRef.current;
    if (active && (active.kind === "snake" || active.run.isActive())) { endEffect(); return; }
    const trigger = triggerRef.current;
    const page = trigger?.closest("main");
    if (!trigger || !page) return;
    if (effect === "drop") {
      activeRef.current = { kind: "drop", run: dropGlyphs(page) };
    } else {
      const rect = trigger.getBoundingClientRect();
      activeRef.current = { kind: "snake", run: startSnake({ x: rect.left + rect.width / 2, y: rect.top }, palette.map(color => color.hex)) };
    }
    setIsEffectActive(true);
  }, [effect, endEffect, palette, reducedMotion, startGlitch]);

  // Switching effects, turning on reduced motion, or leaving the page ends whatever is running.
  useEffect(() => endEffect, [effect, reducedMotion, endEffect]);

  const effectLabel = effect === "drop" ? (isEffectActive ? "Put the letters back" : "Drop letters")
    : effect === "snake" ? (isEffectActive ? "Stop the snake" : "Release the snake") : "Play color glitch";

  const vote = (keep: boolean) => {
    if (!candidate) return;
    setCopied(false);
    setVotes(current => ({ ...current, [candidate.hex]: keep }));
    setReviewIndex(null);
  };

  const copySettings = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify({ palette: palette.map(color => ({ name: color.name, hex: color.hex })), votes, effect, glitch: settings }, null, 2));
      setCopied(true);
    } catch { setCopied(false); }
  };

  return <>
    <button ref={triggerRef} type="button" className="footer-palette palette-toy-trigger" aria-label={effectLabel}
      aria-pressed={effect === "glitch" ? undefined : isEffectActive}
      onPointerEnter={event => { if (event.pointerType === "mouse" && effect === "glitch") startGlitch(); }}
      onClick={runEffect}>
      <span ref={trackRef} className="palette-toy-track">
        {Array.from({ length: STRIP_SWATCHES }, (_, index) => <i key={index} style={{ backgroundColor: palette[index % palette.length].hex }} />)}
      </span>
    </button>
    {ready && createPortal(<>
      <canvas ref={burnCanvasRef} className="palette-glitch-canvas palette-burn-canvas" aria-hidden="true" />
      <canvas ref={canvasRef} className="palette-glitch-canvas" aria-hidden="true" hidden />
      {labEnabled && <aside className={`palette-lab text-captionSans${panelOpen ? "" : " is-collapsed"}`} aria-label="Palette and glitch controls">
        <div className="palette-lab-heading"><span className="text-captionSans"><InspectableText>Palette lab</InspectableText></span><button type="button" onClick={() => setPanelOpen(value => !value)} aria-expanded={panelOpen}><InspectableText>{panelOpen ? "Minimize" : "Open"}</InspectableText></button></div>
        {panelOpen && <>
          <div className="palette-lab-tabs" role="tablist" aria-label="Tune the palette or glitch">
            <button type="button" id="palette-tab" role="tab" aria-selected={tab === "palette"} aria-controls="palette-panel" onClick={() => setTab("palette")}><InspectableText>Colors</InspectableText></button>
            <button type="button" id="glitch-tab" role="tab" aria-selected={tab === "glitch"} aria-controls="glitch-panel" onClick={() => setTab("glitch")}><InspectableText>Effect</InspectableText></button>
          </div>
          <div id="palette-panel" role="tabpanel" aria-labelledby="palette-tab" hidden={tab !== "palette"}>
            <div className="palette-quiz-progress text-captionSans"><span><InspectableText>{`${answered} / ${PALETTE_CANDIDATES.length}`}</InspectableText></span><span><InspectableText>{`${liked.length} kept`}</InspectableText></span></div>
            {candidate ? <>
              <div className="palette-quiz-swatch" style={{ backgroundColor: candidate.hex }} aria-label={`${candidate.name}, ${candidate.hex}`} />
              <div className="palette-quiz-name"><span><InspectableText>{candidate.name}</InspectableText></span><span className="text-captionSans"><InspectableText>{candidate.hex}</InspectableText></span></div>
              <div className="palette-quiz-actions"><button type="button" onClick={() => vote(false)}><InspectableText>No</InspectableText></button><button type="button" onClick={() => vote(true)}><InspectableText>Yes</InspectableText></button></div>
            </> : <p className="palette-quiz-complete"><InspectableText>Round complete. Select a color below to revisit it.</InspectableText></p>}
            <div className="palette-quiz-history" aria-label="Color votes">
              {PALETTE_CANDIDATES.filter(color => votes[color.hex] !== undefined).map(color => <button key={color.hex} type="button" style={{ backgroundColor: color.hex }}
                aria-label={`${color.name}: ${votes[color.hex] ? "Yes" : "No"}. Revisit color.`} onClick={() => setReviewIndex(PALETTE_CANDIDATES.indexOf(color))}>
                <span><InspectableText>{votes[color.hex] ? "+" : "−"}</InspectableText></span>
              </button>)}
            </div>
            {answered > 0 && <button type="button" className="palette-lab-reset" onClick={() => { setVotes({}); setReviewIndex(null); setCopied(false); }}><InspectableText>Restart quiz</InspectableText></button>}
          </div>
          <div id="glitch-panel" role="tabpanel" aria-labelledby="glitch-tab" hidden={tab !== "glitch"}>
            <div className="palette-lab-effects" role="radiogroup" aria-label="Palette strip effect">
              {PLAYFUL_EFFECTS.map(option => <button key={option.key} type="button" role="radio" aria-checked={effect === option.key}
                onClick={() => { setCopied(false); setEffect(option.key); }}><InspectableText>{option.label}</InspectableText></button>)}
            </div>
            {effect === "glitch" && <>
            <div className="palette-lab-controls">{GLITCH_CONTROLS.map(control => <label key={control.key}>
              <span><span><InspectableText>{control.label}</InspectableText></span><output className="text-captionSans"><InspectableText>{`${control.unit === "%" ? Math.round(settings[control.key] * 100) : settings[control.key]} ${control.unit}`}</InspectableText></output></span>
              <input aria-label={control.label} type="range" min={control.min} max={control.max} step={control.step} value={settings[control.key]}
                onChange={event => { setCopied(false); setSettings(current => ({ ...current, [control.key]: Number(event.target.value) })); }} />
            </label>)}</div>
            <button type="button" className="palette-lab-reset" onClick={() => { setSettings({ ...DEFAULT_GLITCH }); setCopied(false); }}><InspectableText>Reset effect</InspectableText></button>
            </>}
          </div>
          <div className="palette-lab-current" aria-label="Current palette">{palette.map(color => <span key={color.hex} style={{ backgroundColor: color.hex }} title={`${color.name} ${color.hex}`} />)}</div>
          <div className="palette-lab-bottom"><button type="button" disabled={reducedMotion} onClick={runEffect}><InspectableText>{reducedMotion ? "Reduced motion on" : effectLabel}</InspectableText></button><button type="button" onClick={copySettings}><InspectableText>{copied ? "Copied" : "Copy settings"}</InspectableText></button></div>
        </>}
      </aside>}
    </>, document.body)}
  </>;
}
