# Progress and goals

Last updated 2026-10-19. Branch: `portfolio-v3-homepage`. Update this file when something ships, gets
decided, or gets dropped.

## Where things stand

Raw design-thesis conversations, prompts, and drafts are saved in [`design-thesis-raw.md`](design-thesis-raw.md) for later editing.

The v3 homepage is built and live on the branch preview (see [`workflow.md`](workflow.md)). `main` (and
production) is still the August version. Merging is Liam's call.

**Favicon (2026-10-23)**
- Liam's "O LF" mark on white, 192px original: `public/images/meta/favicon-olf-{32,180,192}.png` (32 and 180 scaled down with Lanczos). The old `favicon.png` is no longer referenced.
- Tried: a seeded scatter of five tilted burst glyphs (commit 824472d has the render script). Replaced by Liam's mark.

**Link preview video (2026-10-23)**
- og:video and og:image come from the Figma card (435:198): "Office of Liam Fennell" on white. Six letters glitch (~0.35s), every letter pops out and floats like the swarm's entry, then is kicked loose to bounce freely off the card's edges and each other for ~4s, pumping out 2–4 glyphs each (mostly punctuation, from a shuffled bag so none repeats until all have appeared). A pump: the letter squeezes while flickering between itself and the new glyph, then the glyph splits off its edge at under half size and springs to full size while the letter recoils. Loose pieces are topped back up to a cruising speed, since Matter stops bouncing slow contacts and they otherwise park along the walls.
- Exit: pumped glyphs pop (a 120ms swell with a glitch, then gone) across 0.9s. Each letter slows to a float on its own schedule, then glides on its own spring back to where its float ended and plays its recorded pop-out backwards into its slot, landing in reading order (below). Letters fly home in the colours they left with, then the six glitched letters glitch back to black, mirroring the intro. 12.2s loop, seamless (last frame equals the first). Letters collide only with the walls until kicked loose, so the recorded pop-out carries no neighbour nudges.
- Landing (default since 2026-10-23): letters land left to right within each word, words 320ms apart and overlapping, 90ms between letters. Each letter's landing time is fixed and its rewind and glide are worked back from it; early letters hover at their float until their turn. The earlier last-out-first-home landing is still available (`/og?landing=reverse`, capture `--reverse` → `out/share/*-reverse.*`).
- Glitch variant to compare (`/og?glitch=all`, capture `--all-glitch` → `out/share/*-all-glitch.*`, site og:video untouched): every letter glitches instead of the six, 25ms apart left to right, in at the start and back to black after landing. 12.85s loop. Not yet chosen over the default.
- Engine: `src/lib/og-burst.ts` (Matter.js, separate from the site's swarm, which still pulls letters to the cursor). Pure helpers tested in `tests/og-burst.test.mjs`.
- Outputs: `public/images/meta/og-office.{mp4,png}` (1200×630, 60fps, ~1.1 MB; the PNG is the first frame), plus share cuts in `out/share/`, each a video and a still of its first frame: `office-of-liam-fennell-og.{mp4,png}` (2400×1260, the 1.91:1 preview shape), `-9x16` (1080×1920, laid out at 675×1200 and scaled 1.6×), and `-1x1` (2400×2400). New filenames so platforms don't serve the old blank `opengraph.png` from cache. og:video has no length limit in the spec; most platforms other than Discord show the image anyway.
- `/og` (dev only) plays the loop in real time at any viewport size. `node scripts/capture-og.mjs http://localhost:3000/og` records it on a virtual clock with seeded randomness, so reruns match; `--quick` records only the 1200×630 frames for tuning. Rerun it after palette changes.
- Glitched letters settle on glyph-palette colors rather than the Figma card's, which predate the current palette. The card's 40px size is a new token (`--text-og-card`).
- Tried: the real swarm, sucking letters into a central cloud and springing them home (too little bouncing, clunky reset); fading the pumped glyphs out (replaced by the pop); growing pumped glyphs from zero on top of their parent (read as overlap; replaced by the split); one blended path home for every letter at once (too abrupt and synced; replaced by per-letter settle, spring, and rewind).

**Album-cover transitions and test controls (2026-10-21)**
- Replaced blur with an 8 × 8 grid swap: irregular clusters reveal the new artwork over ~200ms, with sparse 32ms glyph-palette flashes. Artwork preloads; reduced motion swaps directly.
- The avatar opens the inspector/test menu on desktop and mobile in development and previews. Palette position and palette-lab controls now live there; footer strip and “by ABC Dinamo” are no longer buttons. Existing inspector switches remain in the same menu. Normal sort/grid controls and the globe keep their primary interactions.

**Mobile toolbar targets (2026-10-21)**
- Reverted the half-width mobile tap targets; original control widths and spacing restored. Album-cover transitions remain.

**Desktop grid gutters (2026-10-23)**
- Grid-level hover ownership keeps the last hovered tile’s label active across horizontal/vertical gutters, transfers it on entering another tile, and clears it on leaving the grid. Mobile taps and keyboard focus remain unchanged.

**Desktop project interaction (2026-10-23)**
- Mouse clicks no longer keep project labels visible after the pointer leaves: only hover or keyboard-visible focus reveals labels. Mobile tap expansion stays unchanged.

**Desktop density transitions (2026-10-23)**
- Desktop grid-size selections now share the mobile expansion tween: 180ms ease-out with no spring, steady label type/insets, and interruptible changes. Reduced motion remains instant.

**Intro width (2026-10-22)**
- Desktop intro text is 520px wide via `--intro-text-width`, with no right padding on the intro section. Mobile keeps its full-width layout and existing padding.

**Figma footer and player palette (2026-10-22)**
- Locked in desktop 435:165 / mobile 436:266: copyright and location blocks left, office/weather right; no type credit or footer palette. Desktop retains the centered live globe; mobile uses serif for the name only, with the live globe restored centered below the footer.
- Avatar menu offers palette by avatar (3 equal swatches, 4px wide) or on player (5 equal swatches, 6px wide, full height, timer hidden). Player is default. Both stream downward and retain the original muted strip colors; the glyph palette is unchanged.
- Reused live globe and Spotify components in place of their Figma sample imagery. Existing named text styles take precedence over the reference's slightly different 1.35 leading.

**Spotify freshness (2026-10-22)**
- A paused current track no longer gets replaced by the last completed track. Empty/paused currently-playing responses are confirmed once after 350ms before falling back to recently played.
- Client retains the original 30-second polling interval. Focus/visibility refreshes share the same 30-second minimum gap, bypass browser cache, and cannot overlap requests.
- Public production API was independently returning isPlaying:false on fresh cache-miss requests; preview is behind Vercel protection. These fixes improve transient handling but cannot guarantee Spotify reports every active device/session. No production merge authorized.

**Toolbar mark feedback (2026-10-22)**
- Dot and square flash through the glyph palette on the same frames as selection text scrambles, returning to their original fill when the text settles. Re-selecting Random retriggers the effect. Reduced motion skips it.
- Desktop square is 9px (dot 9.9px); mobile remains 8px (dot 8.8px). Desktop sizing uses the work-glyph-desktop-size token.

**Project grid update (2026-10-21)**
- Removed 5 × 5 from both desktop density menus. Added nine blank tiles using the existing Shop placeholders, for 12 total projects.

**Project labels (2026-10-21)**
- Hover/focus on desktop or tap on mobile reveals company and short quarter/year inside the tile, both captionSans. Company uses text-primary, date text-secondary, with a 2px gap and 16px desktop / 12px mobile insets, defined as project-info tokens.
- Mobile expansion/collapse uses a 180ms ease-out tween (no spring), including surrounding tiles. The label scramble waits 40ms on mobile taps only; reduced motion skips the movement and delay. Timing lives in project-layout / project-label tokens.
- Labels scramble and glitch in palette colors on both reveal and dismissal using the shared effect, respecting reduced motion.
- Removed the project logos, cursor tooltips, separate mobile detail panels, and avatar Shop badge pop-out. Tapping a tile in the mobile two-column grid expands it to full width in its current row. A right-column selection moves before its row partner so both tiles flow down without leaving a gap. Collapse restores the original sort order; its label stays inside the tile.

**The page**
- Header with avatar and bio, a work grid with sort (Featured / Recent / Random) and density (2–4 columns, plus 6 on wide screens)
  menus, contact links, a now-playing music player (Spotify), and a footer with weather, clock, type credit,
  and the palette strip.
- Shop project previews with AV1 and H.264 video renditions (see [`media-workflow.md`](media-workflow.md)).
- A design inspector for development and previews (keyboard modes for text styles, colors, and spacing).
  Production never shows it.

**Footer decision (2026-10-21)**
- Kept the original footer. Removed the nine alternate layouts and the office-name cycle.
- Globe and exit ring are monochrome at rest with short runs of tightly staggered palette flickers, separated by quiet pauses. Pulses now stagger 8–11 glyphs at rest (11–15 on hover), with quiet gaps shortened by 250ms. Each burst selects scattered glyphs and loosely ripples outward from a random origin, leaving gaps rather than a connected band. Hover/focus increases burst frequency and count, capped below half the glyphs. Each flicker returns to the inherited color; reduced motion disables it.

**Intro experiment (2026-10-19)**
- Two paragraphs in the existing bodySerif style, using draft copy in the second paragraph. First paragraph stays flush left; subsequent paragraphs indent by the new `--bio-paragraph-indent` token (2em) with no blank line, following the book reference.
- Links use numbered captionSerif superscripts instead of underlines. Each number gets an independent random color from the existing legible glyph palette on page load, stable until refresh.

**The letter swarm (the "glyph toy")**
- A 44px globe of orbiting characters in the footer (centered in the footer on desktop, below it on mobile).
  On hover it spins faster, swells to 1.12×, and more of its characters briefly glitch through palette colors.
- Tapping it bursts the globe. About 70% of every letter on the page pops out, floats, and is pulled into a
  loose, drifting swarm around the cursor (or the screen center on touch), changing to palette colors as
  it goes.
- The exit is a ring of 12 of the globe's characters, spinning slowly clockwise in the globe's spot. Hover
  speeds it up, swells it, and glitches its colors. Tapping it, or pressing Esc, plays the entry in reverse:
  letters float loose, glide home on springs, settle tilted and slightly off, and turn back to their own
  colors. The ring spins until it folds back into the globe.
- Pointer hits sometimes glitch a letter to a new color (about 1 hit in 5).
- On touch, the page still scrolls. A touch counts as "play" (page holds still) when it starts on the swarm,
  rests first, or starts sideways. A vertical flick or drag from open space scrolls.
- Masks survive re-renders, song changes, and clock ticks, since letters are anchored by character position.

**Strip position test (2026-10-21)**
- Use “Palette by avatar” in the avatar menu to attach the strip directly to the left edge of the avatar. Vertical strip: 4px wide, three visible swatches filling the avatar's 28px desktop / 24px mobile height (9⅓px / 8px each), streaming downward.
- The attached pair shifts right by the strip width, keeping the strip at the original content padding (12px on mobile).
- “by ABC Dinamo” replaces the strip in the footer; use the avatar menu to restore the original horizontal strip. Default remains the footer. Reduced motion freezes the stream; the glyph palette remains independent.

**Strip palette (2026-10-21)**
- Restored the original 18 kept muted colors for the animated footer strip only (`STRIP_PALETTE`). The globe, ring, explosion, scrambles, and intro markers retain the brighter glyph palette. Palette-lab votes continue to tune glyphs without changing the strip.

**The palette**
- 29 colors in hue order, from a 64-color full-spectrum quiz built around Liam's references (risograph
  pinks and reds, periwinkles through amethysts, light aquas and greens, highlighter yellows). See
  [`design-principles.md`](design-principles.md#palette).
- Used by the footer strip, the globe and ring, the swarm, and every text scramble's color glitch. The three
  pale yellows show only in the strip, since they vanish as thin glyphs on white.
- `?palette-lab` reruns the quiz and tunes the swarm. **Copy settings** exports the result for baking in.

**Performance (measured 2026-10-18)**
- About 0.8 MB before video: fonts ~570 KB (now ~450 KB), JS ~200 KB gzipped, CSS 9 KB. Video loads only near
  the viewport.
- Removed unused fonts (Suisse, Geist Mono), kept Agentation out of production, and capped video pixel
  density at 2×.

## Open items and next steps

- [ ] **Oracle font as WOFF2.** `ABCOracle.ttf` (741 KB raw, ~340 KB transferred) is the biggest asset. It needs
      the Dinamo web license files: ideally a regular-only WOFF2, or the variable WOFF2. Liam is buying the
      licenses. Then swap the file in `src/app/layout.tsx` and remeasure.
- [ ] **Pre-existing lint error** in `src/hooks/use-video-rendition.ts` (setState inside an effect). It has
      been there since before this work; fix it deliberately in its own commit.
- [ ] **Merge to `main` / production**, when Liam decides the branch is ready.
- [ ] **More projects** in the work grid. Only Shop previews are listed in `src/lib/project-previews.ts`.
- [ ] **Hover stuck after the swarm (minor).** The globe can't hear the pointer while the letters are out. If the
      pointer never leaves it, the re-formed globe can keep spinning fast and glitching until the next hover.
      It's a small reset if anyone notices it.
- [ ] **Toy on very long pages.** `swarmCount` caps the swarm at 520 letters. The homepage has about 340
      characters today. Revisit if pages get much longer.

## Decisions and things we tried

Kept here so nobody re-proposes them.

**Exit control for the swarm**
- "Esc" text fixed to the bottom of the viewport: rejected, it got in the way.
- "Esc" in the globe's spot: better placement, but the word didn't feel right.
- An X made of nine globe characters, with a hover spin: rejected, too big at 48px and lost among floating
  letters.
- A 12px black dot, like the toolbar dot, including a version where a glyph swells into it: rejected.
- **Kept:** a ring of globe glyphs, spinning slowly clockwise, empty center, in the globe's spot.

**Motion**
- First pull-in: every letter flew straight to the anchor. Too uniform. Now each pops out, floats, and is
  sucked in at its own pace and strength.
- First anchor: a tight point that packed letters into one blob. Now a loose zone with per-letter orbits and
  neighbor spacing.
- Exit: straightened every letter first and landed them all at once. Now it mirrors the entry, with staggered
  springs and a tilted, slightly-off settle.

**Palette**
- The original 20 pastels were too desaturated to read as thin glyphs on white. Replaced by the
  full-spectrum quiz.
- Thinning to 20 colors and shuffling the strip order around the hue wheel: **reverted**, it looked worse
  than hue order.
- Removed later: Light Apricot.

**Sizes**
- Globe: 28 → 40 → 48 → **44px** on desktop; 28 → 32 → 40 → **44px** on mobile. 32px of space above it on
  mobile.
- Toolbar marks: 10px square, 11px dot (unchanged since August). Sort menu options line up with the
  "Featured" text; grid menu options line up with the label's right edge.

## Ideas (not committed to)

- Palette lab: a "copy as code" button that outputs the `DEFAULT_HEXES` array directly.
- Let the swarm react to scroll speed on desktop (a gentle drift opposite the scroll).
- Sound, opt-in only: soft ticks when letters land.
