"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cubicBezier } from "motion";
import { DEFAULT_GLYPHS, GLYPH_CONTROLS, PALETTE_CANDIDATES, colorsFromVotes, parsePalettePreferences } from "@/lib/palette-toy";
import type { GlyphSettings, PaletteVotes } from "@/lib/palette-toy";
import { dropGlyphs } from "@/lib/glyph-drop";
import type { GlyphDrop } from "@/lib/glyph-drop";
import { InspectableText } from "@/components/design-inspector";

const STORAGE_KEY = "portfolio-palette-lab-v1";
// The strip holds each color, then slides one swatch left. Position and colors come from the same clock,
// so a new color and the snap back always land in the same frame.
const STRIP_SWATCHES = 6;
const STRIP_STEP_PX = 20;
const STRIP_PERIOD_MS = 1000;
const STRIP_HOLD = 0.65;
const stripEase = cubicBezier(0.16, 1, 0.3, 1);

export function PaletteToy() {
  const [votes, setVotes] = useState<PaletteVotes>({});
  const [glyphs, setGlyphs] = useState<GlyphSettings>({ ...DEFAULT_GLYPHS });
  // The letters stay dropped until the strip is tapped again; a refresh resets them.
  const dropRef = useRef<GlyphDrop | null>(null);
  const runRef = useRef<AbortController | null>(null);
  const isRestoringRef = useRef(false);
  const glyphsRef = useRef(glyphs);
  const [isDropped, setIsDropped] = useState(false);
  const [ready, setReady] = useState(false);
  const [labEnabled, setLabEnabled] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [tab, setTab] = useState<"palette" | "glyphs">("palette");
  const [reviewIndex, setReviewIndex] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const trackRef = useRef<HTMLSpanElement>(null);
  const palette = colorsFromVotes(votes);
  const unansweredIndex = PALETTE_CANDIDATES.findIndex(color => votes[color.hex] === undefined);
  const quizIndex = reviewIndex ?? unansweredIndex;
  const candidate = PALETTE_CANDIDATES[quizIndex];
  const liked = PALETTE_CANDIDATES.filter(color => votes[color.hex] === true);
  const answered = Object.keys(votes).length;

  useEffect(() => {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotion = () => {
      setReducedMotion(motionQuery.matches);
      if (motionQuery.matches) {
        runRef.current?.abort();
        runRef.current = null;
        dropRef.current = null;
        setIsDropped(false);
      }
    };
    const frame = window.requestAnimationFrame(() => {
      let raw: string | null = null;
      try { raw = localStorage.getItem(STORAGE_KEY); } catch { /* Preferences are optional. */ }
      const saved = parsePalettePreferences(raw);
      setVotes(saved.votes);
      setGlyphs(saved.glyphs);
      setLabEnabled(new URLSearchParams(window.location.search).has("palette-lab"));
      updateMotion();
      setReady(true);
    });
    motionQuery.addEventListener("change", updateMotion);
    return () => {
      window.cancelAnimationFrame(frame);
      motionQuery.removeEventListener("change", updateMotion);
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ votes, glyphs })); } catch { /* Private browsing may disable storage. */ }
  }, [ready, votes, glyphs]);

  // Slider changes apply to letters that are already down.
  useEffect(() => {
    glyphsRef.current = glyphs;
    dropRef.current?.update(glyphs);
  }, [glyphs]);

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
    let startedAt: number | null = null;
    const render = (time: number) => {
      // Synced once, on the first frame: each slide begins on a whole second of the device clock, the same
      // beat the music player's time ticks on. From here it runs on its own.
      startedAt ??= time - (Date.now() % STRIP_PERIOD_MS) - STRIP_HOLD * STRIP_PERIOD_MS;
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

  // Tap to drop the letters, tap again to float them home.
  const toggleDrop = useCallback(() => {
    if (reducedMotion || isRestoringRef.current) return;
    const drop = dropRef.current;
    if (drop?.isActive()) {
      isRestoringRef.current = true;
      void drop.restore().finally(() => { isRestoringRef.current = false; });
      return;
    }
    // A second tap while the physics module loads cancels that pending run.
    if (runRef.current) {
      runRef.current.abort();
      runRef.current = null;
      setIsDropped(false);
      return;
    }
    const page = triggerRef.current?.closest("main");
    if (!page) return;
    // iOS only grants motion (for tilt) from a tap, so ask now; the drop listens once it's allowed.
    const Orientation = window.DeviceOrientationEvent as (typeof DeviceOrientationEvent & { requestPermission?: () => Promise<string> }) | undefined;
    if (window.matchMedia("(pointer: coarse)").matches) void Orientation?.requestPermission?.().catch(() => undefined);
    const controller = new AbortController();
    runRef.current = controller;
    setIsDropped(true);
    const finish = () => {
      if (runRef.current !== controller) return;
      runRef.current = null;
      dropRef.current = null;
      if (!controller.signal.aborted) setIsDropped(false);
    };
    dropGlyphs(page, glyphsRef.current, { signal: controller.signal, onFinish: finish })
      .then(next => {
        if (controller.signal.aborted) next.cancel();
        else { dropRef.current = next; next.update(glyphsRef.current); }
      })
      .catch(finish);
  }, [reducedMotion]);

  // Leaving the page cancels both a loading module and an active/returning drop.
  useEffect(() => () => {
    const controller = runRef.current;
    runRef.current = null;
    controller?.abort();
    dropRef.current = null;
  }, []);

  const dropLabel = isDropped ? "Put the letters back" : "Drop the letters";

  const vote = (keep: boolean) => {
    if (!candidate) return;
    setCopied(false);
    setVotes(current => ({ ...current, [candidate.hex]: keep }));
    setReviewIndex(null);
  };

  const copySettings = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify({ palette: palette.map(color => ({ name: color.name, hex: color.hex })), votes, glyphs }, null, 2));
      setCopied(true);
    } catch { setCopied(false); }
  };

  return <>
    <button ref={triggerRef} type="button" className="footer-palette palette-toy-trigger" aria-label={dropLabel}
      aria-pressed={isDropped} onClick={toggleDrop}>
      <span ref={trackRef} className="palette-toy-track">
        {Array.from({ length: STRIP_SWATCHES }, (_, index) => <i key={index} style={{ backgroundColor: palette[index % palette.length].hex }} />)}
      </span>
    </button>
    {ready && createPortal(<>
      {labEnabled && <aside className={`palette-lab text-captionSans${panelOpen ? "" : " is-collapsed"}`} aria-label="Palette and glyph controls">
        <div className="palette-lab-heading"><span className="text-captionSans"><InspectableText>Palette lab</InspectableText></span><button type="button" onClick={() => setPanelOpen(value => !value)} aria-expanded={panelOpen}><InspectableText>{panelOpen ? "Minimize" : "Open"}</InspectableText></button></div>
        {panelOpen && <>
          <div className="palette-lab-tabs" role="tablist" aria-label="Tune the palette or the glyph drop">
            <button type="button" id="palette-tab" role="tab" aria-selected={tab === "palette"} aria-controls="palette-panel" onClick={() => setTab("palette")}><InspectableText>Colors</InspectableText></button>
            <button type="button" id="glyphs-tab" role="tab" aria-selected={tab === "glyphs"} aria-controls="glyphs-panel" onClick={() => setTab("glyphs")}><InspectableText>Glyphs</InspectableText></button>
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
          <div id="glyphs-panel" role="tabpanel" aria-labelledby="glyphs-tab" hidden={tab !== "glyphs"}>
            <div className="palette-lab-controls">{GLYPH_CONTROLS.map(control => <label key={control.key}>
              <span><span><InspectableText>{control.label}</InspectableText></span><output className="text-captionSans"><InspectableText>{`${control.unit === "%" ? Math.round(glyphs[control.key] * 100) : glyphs[control.key]} ${control.unit}`}</InspectableText></output></span>
              <input aria-label={control.label} type="range" min={control.min} max={control.max} step={control.step} value={glyphs[control.key]}
                onChange={event => { setCopied(false); setGlyphs(current => ({ ...current, [control.key]: Number(event.target.value) })); }} />
            </label>)}</div>
            <button type="button" className="palette-lab-reset" onClick={() => { setGlyphs({ ...DEFAULT_GLYPHS }); setCopied(false); }}><InspectableText>Reset glyphs</InspectableText></button>
          </div>
          <div className="palette-lab-current" aria-label="Current palette">{palette.map(color => <span key={color.hex} style={{ backgroundColor: color.hex }} title={`${color.name} ${color.hex}`} />)}</div>
          <div className="palette-lab-bottom"><button type="button" disabled={reducedMotion} onClick={toggleDrop}><InspectableText>{reducedMotion ? "Reduced motion on" : dropLabel}</InspectableText></button><button type="button" onClick={copySettings}><InspectableText>{copied ? "Copied" : "Copy settings"}</InspectableText></button></div>
        </>}
      </aside>}
    </>, document.body)}
  </>;
}
