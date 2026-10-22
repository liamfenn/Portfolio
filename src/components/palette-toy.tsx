"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cubicBezier } from "motion";
import { DEFAULT_GLYPHS, STRIP_PALETTE, GLYPH_CONTROLS, GLYPH_MIN_CONTRAST, PALETTE_CANDIDATES, colorsFromVotes, contrastOnWhite, glyphColors, parsePalettePreferences, setGlyphPalette } from "@/lib/palette-toy";
import type { GlyphSettings, PaletteVotes } from "@/lib/palette-toy";
import { startSwarm } from "@/lib/glyph-swarm";
import type { GlyphSwarm } from "@/lib/glyph-swarm";
import { InspectableText } from "@/components/design-inspector";
import { usePortfolioExperiments } from "@/components/portfolio-experiments";
import { GlyphGlobe } from "@/components/glyph-globe";
import type { GlyphMode } from "@/components/glyph-globe";

const STORAGE_KEY = "portfolio-palette-lab-v2";
// Votes on the first, pastel palette stay saved under the old key, untouched; only the glyph tuning carries over.
const LEGACY_STORAGE_KEY = "portfolio-palette-lab-v1";
// The quiz previews each colour as it will be used: thin glyphs on the white page.
const PREVIEW_GLYPHS = "a&Ro7?g*Q2ks@m0yt%cWb#f5j";
// The strip holds each color, then slides one swatch left. Position and colors come from the same clock,
// so a new color and the snap back always land in the same frame.
const STRIP_SWATCHES = 6;
const STRIP_STEP_PX = 20;
const STRIP_PERIOD_MS = 1000;
const STRIP_HOLD = 0.65;
const stripEase = cubicBezier(0.16, 1, 0.3, 1);

export function PaletteToy() {
  const [votes, setVotes] = useState<PaletteVotes>({});
  // Colours voted Yes and then dropped in the final cut, and the order of votes for undo.
  const [cuts, setCuts] = useState<string[]>([]);
  const [voteHistory, setVoteHistory] = useState<string[]>([]);
  const [glyphs, setGlyphs] = useState<GlyphSettings>({ ...DEFAULT_GLYPHS });
  // The swarm lasts until Esc; a refresh resets it.
  const swarmRef = useRef<GlyphSwarm | null>(null);
  const runRef = useRef<AbortController | null>(null);
  const glyphsRef = useRef(glyphs);
  const [mode, setMode] = useState<GlyphMode>("idle");
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const [ready, setReady] = useState(false);
  const { paletteAtAvatar: attachedToAvatar, paletteLabOpen: labEnabled, setPaletteLabOpen } = usePortfolioExperiments();
  const [avatarHost, setAvatarHost] = useState<HTMLElement | null>(null);
  const [globeHost, setGlobeHost] = useState<HTMLElement | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [tab, setTab] = useState<"palette" | "glyphs">("palette");
  const [reviewIndex, setReviewIndex] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const globeRef = useRef<HTMLButtonElement>(null);
  const trackRef = useRef<HTMLSpanElement>(null);
  const palette = colorsFromVotes(votes, cuts);
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
        swarmRef.current = null;
        setMode("idle");
      }
    };
    const frame = window.requestAnimationFrame(() => {
      let raw: string | null = null, legacy: string | null = null;
      try { raw = localStorage.getItem(STORAGE_KEY); legacy = raw ? null : localStorage.getItem(LEGACY_STORAGE_KEY); } catch { /* Preferences are optional. */ }
      const saved = parsePalettePreferences(raw);
      setVotes(saved.votes);
      setCuts(saved.cuts);
      setGlyphs(raw ? saved.glyphs : parsePalettePreferences(legacy).glyphs);
      if (new URLSearchParams(window.location.search).has("palette-lab")) setPaletteLabOpen(true);
      updateMotion();
      setGlobeHost(document.getElementById("glyph-globe-slot"));
      setAvatarHost(document.getElementById("avatar-palette-slot"));
      setReady(true);
    });
    motionQuery.addEventListener("change", updateMotion);
    return () => {
      window.cancelAnimationFrame(frame);
      motionQuery.removeEventListener("change", updateMotion);
    };
  }, [setPaletteLabOpen]);

  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ votes, cuts, glyphs })); } catch { /* Private browsing may disable storage. */ }
  }, [ready, votes, cuts, glyphs]);

  // Slider changes apply to letters that are already down.
  useEffect(() => {
    glyphsRef.current = glyphs;
    swarmRef.current?.update(glyphs);
  }, [glyphs]);

  // The globe, ring and swarm keep the brighter palette; the strip uses its original muted colors.
  const glyphPaletteKey = glyphColors(palette).map(color => color.hex).join(" ");
  const paletteRef = useRef(glyphPaletteKey);
  useEffect(() => { paletteRef.current = glyphPaletteKey; setGlyphPalette(glyphPaletteKey.split(" ")); }, [glyphPaletteKey]);
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const colors = STRIP_PALETTE.map(color => color.hex);
    const swatches = Array.from(track.children) as HTMLElement[];
    let shownStep = -1;
    const paintStep = (step: number) => {
      if (step === shownStep) return;
      shownStep = step;
      swatches.forEach((swatch, index) => { swatch.style.backgroundColor = colors[((attachedToAvatar ? index - step : step + index) % colors.length + colors.length) % colors.length]; });
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
      slideTo(attachedToAvatar
        ? `translateY(${(slide - 1) * track.clientHeight / 3}px)`
        : `translateX(${-slide * STRIP_STEP_PX}px)`);
      frame = window.requestAnimationFrame(render);
    };
    frame = window.requestAnimationFrame(render);
    return () => window.cancelAnimationFrame(frame);
  }, [reducedMotion, attachedToAvatar, avatarHost]);

  // The globe bursts into the swarm; Esc balls it up and sends every letter home.
  const toggle = useCallback(() => {
    if (reducedMotion) return;
    const current = modeRef.current;
    if (current === "collapsing") return;
    if (current === "active") {
      if (!swarmRef.current) return;
      setMode("collapsing");
      void swarmRef.current.collapse();
      return;
    }
    // A second tap while the physics module loads cancels that pending run.
    if (current === "loading") {
      runRef.current?.abort();
      runRef.current = null;
      setMode("idle");
      return;
    }
    const globe = globeRef.current, page = globe?.closest("main");
    if (!globe || !page) return;
    const controller = new AbortController();
    runRef.current = controller;
    setMode("loading");
    const finish = () => {
      if (runRef.current !== controller) return;
      runRef.current = null;
      swarmRef.current = null;
      setMode("idle");
    };
    startSwarm(page, globe, glyphsRef.current, { signal: controller.signal, onFinish: finish, keepClear: () => document.querySelector(".glyph-exit"), palette: () => paletteRef.current.split(" ") })
      .then(next => {
        if (controller.signal.aborted) next.cancel();
        else { swarmRef.current = next; setMode("active"); }
      })
      .catch(finish);
  }, [reducedMotion]);

  // Esc on the keyboard collapses the swarm too, unless something else already handled the key.
  useEffect(() => {
    if (mode !== "active") return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape" && !event.defaultPrevented) toggle(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, toggle]);

  // Leaving the page cancels both a loading module and an active or returning swarm.
  useEffect(() => () => {
    const controller = runRef.current;
    runRef.current = null;
    controller?.abort();
    swarmRef.current = null;
  }, []);

  const swarmLabel = mode === "idle" ? "Play with the letters" : mode === "loading" ? "Loading" : "Put the letters back";

  const vote = useCallback((keep: boolean) => {
    if (!candidate) return;
    setCopied(false);
    setVotes(current => ({ ...current, [candidate.hex]: keep }));
    setVoteHistory(current => [...current.filter(hex => hex !== candidate.hex), candidate.hex]);
    if (!keep) setCuts(current => current.filter(hex => hex !== candidate.hex));
    setReviewIndex(null);
  }, [candidate]);
  // Undo takes the last vote back and shows that colour again.
  const undo = useCallback(() => {
    const last = voteHistory[voteHistory.length - 1];
    if (!last) return;
    setVoteHistory(current => current.slice(0, -1));
    setVotes(current => { const next = { ...current }; delete next[last]; return next; });
    setReviewIndex(null);
  }, [voteHistory]);
  const toggleCut = (hex: string) => setCuts(current => current.includes(hex) ? current.filter(cut => cut !== hex) : [...current, hex]);

  // While the quiz is open: Y or → keeps a colour, N or ← passes, Backspace undoes the last vote.
  useEffect(() => {
    if (!labEnabled || !panelOpen || tab !== "palette") return;
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || (event.target as Element | null)?.closest?.("input, textarea")) return;
      const key = event.key.toLowerCase();
      if (key === "y" || key === "arrowright") vote(true);
      else if (key === "n" || key === "arrowleft") vote(false);
      else if (key === "backspace") undo();
      else return;
      event.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [labEnabled, panelOpen, tab, vote, undo]);

  const copySettings = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify({ palette: palette.map(color => ({ name: color.name, hex: color.hex })), votes, cuts, glyphs }, null, 2));
      setCopied(true);
    } catch { setCopied(false); }
  };

  const strip = <span ref={trackRef} className="palette-toy-track" aria-hidden="true">
    {Array.from({ length: STRIP_SWATCHES }, (_, index) => <i key={index} style={{ backgroundColor: STRIP_PALETTE[index % STRIP_PALETTE.length].hex }} />)}
  </span>;

  return <>
    {attachedToAvatar
      ? <span className="footer-palette-credit text-bodySans"><InspectableText>by ABC Dinamo</InspectableText></span>
      : <span className="footer-palette" aria-hidden="true">{strip}</span>}
    {attachedToAvatar && avatarHost && createPortal(<span className="avatar-palette">{strip}</span>, avatarHost)}
    {globeHost && createPortal(<GlyphGlobe mode={mode} disabled={reducedMotion} reducedMotion={reducedMotion} palette={glyphPaletteKey} globeRef={globeRef} onToggle={toggle} />, globeHost)}
    {ready && createPortal(<>
      {labEnabled && <aside className={`palette-lab text-captionSans${panelOpen ? "" : " is-collapsed"}`} aria-label="Palette and glyph controls">
        <div className="palette-lab-heading"><span className="text-captionSans"><InspectableText>Palette lab</InspectableText></span><button type="button" onClick={() => setPanelOpen(value => !value)} aria-expanded={panelOpen}><InspectableText>{panelOpen ? "Minimize" : "Open"}</InspectableText></button></div>
        {panelOpen && <>
          <div className="palette-lab-tabs" role="tablist" aria-label="Tune the palette or the letter swarm">
            <button type="button" id="palette-tab" role="tab" aria-selected={tab === "palette"} aria-controls="palette-panel" onClick={() => setTab("palette")}><InspectableText>Colors</InspectableText></button>
            <button type="button" id="glyphs-tab" role="tab" aria-selected={tab === "glyphs"} aria-controls="glyphs-panel" onClick={() => setTab("glyphs")}><InspectableText>Glyphs</InspectableText></button>
          </div>
          <div id="palette-panel" role="tabpanel" aria-labelledby="palette-tab" hidden={tab !== "palette"}>
            <div className="palette-quiz-progress text-captionSans"><span><InspectableText>{`${answered} / ${PALETTE_CANDIDATES.length}`}</InspectableText></span><span><InspectableText>{`${liked.length} kept`}</InspectableText></span></div>
            {candidate ? <>
              {/* Judged as it will be used: thin type and glyphs on the white page. */}
              <div className="palette-quiz-preview" style={{ color: candidate.hex }} aria-label={`${candidate.name}, ${candidate.hex}`}>
                <span className="text-bodySans">Liam Fennell is a designer based in Atlanta.</span>
                <span className="text-bodySerif">Office of Liam Fennell</span>
                <span className="palette-quiz-glyphs">{PREVIEW_GLYPHS}</span>
                <span className="palette-quiz-swatch" style={{ backgroundColor: candidate.hex }} />
              </div>
              <div className="palette-quiz-name"><span><InspectableText>{candidate.name}</InspectableText></span><span className="text-captionSans"><InspectableText>{`${candidate.hex} · ${contrastOnWhite(candidate.hex).toFixed(1)}:1${contrastOnWhite(candidate.hex) < GLYPH_MIN_CONTRAST ? " · strip only" : ""}`}</InspectableText></span></div>
              <div className="palette-quiz-actions"><button type="button" onClick={() => vote(false)} aria-keyshortcuts="N ArrowLeft"><InspectableText>No</InspectableText></button><button type="button" onClick={() => vote(true)} aria-keyshortcuts="Y ArrowRight"><InspectableText>Yes</InspectableText></button></div>
              <div className="palette-quiz-hint text-captionSans"><span><InspectableText>Y / N or arrow keys</InspectableText></span>{voteHistory.length > 0 && <button type="button" onClick={undo} aria-keyshortcuts="Backspace"><InspectableText>Undo</InspectableText></button>}</div>
            </> : <div className="palette-quiz-cut">
              <p className="palette-quiz-complete"><InspectableText>{liked.length ? "Final cut: tap a color to drop it from the palette." : "Round complete. Select a color below to revisit it."}</InspectableText></p>
              {liked.length > 0 && <div className="palette-quiz-cut-grid" aria-label="Kept colors">
                {liked.map(color => <button key={color.hex} type="button" aria-pressed={!cuts.includes(color.hex)} onClick={() => toggleCut(color.hex)}
                  aria-label={`${color.name}: ${cuts.includes(color.hex) ? "dropped" : "kept"}. Toggle.`}>
                  <span className="palette-quiz-cut-swatch" style={{ backgroundColor: color.hex }} />
                  <span style={{ color: color.hex }}>{color.name}</span>
                </button>)}
              </div>}
            </div>}
            <div className="palette-quiz-history" aria-label="Color votes">
              {PALETTE_CANDIDATES.filter(color => votes[color.hex] !== undefined).map(color => <button key={color.hex} type="button" style={{ backgroundColor: color.hex }}
                aria-label={`${color.name}: ${votes[color.hex] ? "Yes" : "No"}. Revisit color.`} onClick={() => setReviewIndex(PALETTE_CANDIDATES.indexOf(color))}>
                <span><InspectableText>{votes[color.hex] ? "+" : "−"}</InspectableText></span>
              </button>)}
            </div>
            {answered > 0 && <button type="button" className="palette-lab-reset" onClick={() => { setVotes({}); setCuts([]); setVoteHistory([]); setReviewIndex(null); setCopied(false); }}><InspectableText>Restart quiz</InspectableText></button>}
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
          <div className="palette-lab-bottom"><button type="button" disabled={reducedMotion || mode === "collapsing"} onClick={toggle}><InspectableText>{reducedMotion ? "Reduced motion on" : swarmLabel}</InspectableText></button><button type="button" onClick={copySettings}><InspectableText>{copied ? "Copied" : "Copy settings"}</InspectableText></button></div>
        </>}
      </aside>}
    </>, document.body)}
  </>;
}
