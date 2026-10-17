"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { DEFAULT_GLITCH, GLITCH_CONTROLS, PALETTE_CANDIDATES, colorsFromVotes, parsePalettePreferences } from "@/lib/palette-toy";
import type { PaletteVotes } from "@/lib/palette-toy";

const STORAGE_KEY = "portfolio-palette-lab-v1";

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
  const [ready, setReady] = useState(false);
  const [labEnabled, setLabEnabled] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [tab, setTab] = useState<"palette" | "glitch">("palette");
  const [reviewIndex, setReviewIndex] = useState<number | null>(null);
  const [startIndex, setStartIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
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
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ votes, settings })); } catch { /* Private browsing may disable storage. */ }
  }, [ready, votes, settings]);

  useEffect(() => {
    if (reducedMotion) stopRef.current?.();
  }, [reducedMotion]);

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

  const vote = (keep: boolean) => {
    if (!candidate) return;
    setCopied(false);
    setVotes(current => ({ ...current, [candidate.hex]: keep }));
    setReviewIndex(null);
  };

  const copySettings = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify({ palette: palette.map(color => ({ name: color.name, hex: color.hex })), votes, glitch: settings }, null, 2));
      setCopied(true);
    } catch { setCopied(false); }
  };

  return <>
    <button ref={triggerRef} type="button" className="footer-palette palette-toy-trigger" aria-label="Play color glitch"
      onPointerEnter={event => { if (event.pointerType === "mouse") startGlitch(); }}
      onClick={startGlitch}>
      <span className="palette-toy-track" style={{ animationPlayState: reducedMotion ? "paused" : "running" }}
        onAnimationIteration={event => { if (event.target === event.currentTarget.firstElementChild) setStartIndex(index => (index + 1) % palette.length); }}>
        {Array.from({ length: 6 }, (_, index) => <i key={index} style={{ backgroundColor: palette[(startIndex + index) % palette.length].hex }} />)}
      </span>
    </button>
    {ready && createPortal(<>
      <canvas ref={burnCanvasRef} className="palette-glitch-canvas palette-burn-canvas" aria-hidden="true" />
      <canvas ref={canvasRef} className="palette-glitch-canvas" aria-hidden="true" hidden />
      {labEnabled && <aside className={`palette-lab text-captionSmall${panelOpen ? "" : " is-collapsed"}`} aria-label="Palette and glitch controls">
        <div className="palette-lab-heading"><span className="text-caption">Palette lab</span><button type="button" onClick={() => setPanelOpen(value => !value)} aria-expanded={panelOpen}>{panelOpen ? "Minimize" : "Open"}</button></div>
        {panelOpen && <>
          <div className="palette-lab-tabs" role="tablist" aria-label="Tune the palette or glitch">
            <button type="button" id="palette-tab" role="tab" aria-selected={tab === "palette"} aria-controls="palette-panel" onClick={() => setTab("palette")}>Colors</button>
            <button type="button" id="glitch-tab" role="tab" aria-selected={tab === "glitch"} aria-controls="glitch-panel" onClick={() => setTab("glitch")}>Glitch</button>
          </div>
          <div id="palette-panel" role="tabpanel" aria-labelledby="palette-tab" hidden={tab !== "palette"}>
            <div className="palette-quiz-progress text-badge"><span>{answered} / {PALETTE_CANDIDATES.length}</span><span>{liked.length} kept</span></div>
            {candidate ? <>
              <div className="palette-quiz-swatch" style={{ backgroundColor: candidate.hex }} aria-label={`${candidate.name}, ${candidate.hex}`} />
              <div className="palette-quiz-name"><span>{candidate.name}</span><span className="text-badge">{candidate.hex}</span></div>
              <div className="palette-quiz-actions"><button type="button" onClick={() => vote(false)}>No</button><button type="button" onClick={() => vote(true)}>Yes</button></div>
            </> : <p className="palette-quiz-complete">Round complete. Select a color below to revisit it.</p>}
            <div className="palette-quiz-history" aria-label="Color votes">
              {PALETTE_CANDIDATES.filter(color => votes[color.hex] !== undefined).map(color => <button key={color.hex} type="button" style={{ backgroundColor: color.hex }}
                aria-label={`${color.name}: ${votes[color.hex] ? "Yes" : "No"}. Revisit color.`} onClick={() => setReviewIndex(PALETTE_CANDIDATES.indexOf(color))}>
                <span>{votes[color.hex] ? "+" : "−"}</span>
              </button>)}
            </div>
            {answered > 0 && <button type="button" className="palette-lab-reset" onClick={() => { setVotes({}); setReviewIndex(null); setCopied(false); }}>Restart quiz</button>}
          </div>
          <div id="glitch-panel" role="tabpanel" aria-labelledby="glitch-tab" hidden={tab !== "glitch"}>
            <div className="palette-lab-controls">{GLITCH_CONTROLS.map(control => <label key={control.key}>
              <span><span>{control.label}</span><output className="text-badge">{control.unit === "%" ? Math.round(settings[control.key] * 100) : settings[control.key]} {control.unit}</output></span>
              <input aria-label={control.label} type="range" min={control.min} max={control.max} step={control.step} value={settings[control.key]}
                onChange={event => { setCopied(false); setSettings(current => ({ ...current, [control.key]: Number(event.target.value) })); }} />
            </label>)}</div>
            <button type="button" className="palette-lab-reset" onClick={() => { setSettings({ ...DEFAULT_GLITCH }); setCopied(false); }}>Reset effect</button>
          </div>
          <div className="palette-lab-current" aria-label="Current palette">{palette.map(color => <span key={color.hex} style={{ backgroundColor: color.hex }} title={`${color.name} ${color.hex}`} />)}</div>
          <div className="palette-lab-bottom"><button type="button" disabled={reducedMotion} onClick={startGlitch}>{reducedMotion ? "Reduced motion on" : "Preview glitch"}</button><button type="button" onClick={copySettings}>{copied ? "Copied" : "Copy settings"}</button></div>
        </>}
      </aside>}
    </>, document.body)}
  </>;
}
