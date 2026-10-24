# Progress and goals

Last updated 2026-10-19. Branch: `portfolio-v3-homepage`. Update this file when something ships, gets
decided, or gets dropped.

## Where things stand

Raw design-thesis conversations, prompts, and drafts are saved in [`design-thesis-raw.md`](design-thesis-raw.md) for later editing.

The v3 homepage is built and live on the branch preview (see [`workflow.md`](workflow.md)). `main` (and
production) is still the August version. Merging is Liam's call.

**Desktop bottom spacing toggle (2026-10-23)**
- Added “Extra bottom space” to the avatar's inspector menu on desktop. The toggled page bottom padding is 32px (reduced from the initial 56px), giving 48px below the footer content instead of 24px. It starts off on each page load and leaves mobile spacing unchanged. The toggled value derives from the existing content-padding token; no new tokens.

**Work reel video (2026-10-24)**
- Storyboard: Figma 442:1405. `/og/reel` (dev only) plays it: the six-letter glitch, then the burst nudges the letters outward and they accelerate off the card (no pumped glyphs, no walls), glitching to palette colours. As the last few leave (three-quarters gone), the work grid slides up from below on an accelerate-then-decelerate curve (cubic-bezier 0.65, 0, 0.35, 1). It drifts, ramps up from about midway with vertical motion blur, then flies off the top, accelerating. The letters float back in from where they left, land in reading order, and glitch back. About 13.5s.
- The grid carries exactly the 12 projects (16:9: six rows of the storyboard's 469px blocks, two across; 9:16: twelve in one column with 60px side margins), 8px apart both ways; rows that leave the top come round below the last. Its sides bow slightly inward toward the top and bottom in one rounded arc (an SVG displacement warp growing with the square of the distance from the middle), rather than tilting in perspective. Blocks are `--bg-secondary-fill` placeholders; they will become videos.
- Two returns, both cut in 16:9 and 9:16: the letters float back in and land in reading order (default, about 13.4s), or glitch back in place in a random order, 40ms apart, with ticks (`/og/reel?return=glitch`, capture `--reel --glitch-return`, sound `--reel --glitch-return`; about 10.4s). Not yet chosen.
- Tried: a flat grid that tipped more the faster it went and was sucked into the centre to exit; springy pop-ins; a 3D wheel (its rows tilted back and the gaps between them opened up); a warp only near the edges (bent at a corner).
- Code: `away` mode in `src/lib/og-burst.ts` (fly off, park, interlude, come back), the grid in `src/lib/og-reel.ts` (pure timing tested in `tests/og-reel.test.mjs`). `node scripts/capture-og.mjs <url> 7 --reel` writes `out/share/office-of-liam-fennell-reel-{16x9,9x16}.{mp4,png}`; `node scripts/sound-og.mjs --reel` adds the glitch ticks only (other sounds to come once the visuals are settled).

**Favicon (2026-10-23)**
- The footer globe at rest, mid-glitch (a teal @, a pink y, and a violet % lit), its glyphs spanning 80% of the square on white: `public/images/meta/favicon-globe-{32,180,192}.png`. Captured from the real component on `/og/favicon` (dev only) by `node scripts/capture-favicon.mjs <url>`, which fits the globe, saves frames while a glitch is under way (3+ glyphs lit; the glitch ripples a few at a time), and writes a choosing sheet to `out/favicon/sheet.png`; `--pick <n>` writes the icons from a 1024px master (captured at 2×). The favicon card turns off the glyphs' `will-change: transform`, which otherwise makes Chrome raster them at their tiny layout size and stretch the bitmap, so the first capture was blurry.
- Tried: a seeded scatter of five tilted burst glyphs (commit 824472d), then Liam's "O LF" mark (`favicon-olf-*.png`, still in the repo, no longer referenced).

**Link preview video (2026-10-23)**
- og:video and og:image come from the Figma card (435:198): "Office of Liam Fennell" on white. Six letters glitch (~0.35s), every letter pops out and floats like the swarm's entry, then is kicked loose to bounce freely off the card's edges and each other for ~4s, pumping out 2–4 glyphs each (mostly punctuation, from a shuffled bag so none repeats until all have appeared). A pump: the letter squeezes while flickering between itself and the new glyph, then the glyph splits off its edge at under half size and springs to full size while the letter recoils. Loose pieces are topped back up to a cruising speed, since Matter stops bouncing slow contacts and they otherwise park along the walls.
- Exit: pumped glyphs pop (a 120ms swell with a glitch, then gone) across 0.9s. Each letter slows to a float on its own schedule, then glides on its own spring back to where its float ended and plays its recorded pop-out backwards into its slot, landing in reading order (below). Letters fly home in the colours they left with, then the six glitched letters glitch back to black, mirroring the intro. 12.2s loop, seamless (last frame equals the first). Letters collide only with the walls until kicked loose, so the recorded pop-out carries no neighbour nudges.
- Landing (default since 2026-10-23): letters land left to right within each word, words 320ms apart and overlapping, 90ms between letters. Each letter's landing time is fixed and its rewind and glide are worked back from it; early letters hover at their float until their turn. The earlier last-out-first-home landing is still available (`/og?landing=reverse`, capture `--reverse` → `out/share/*-reverse.*`).
- Glitch: the six Figma letters, kept by Liam's choice. Every letter glitching (left to right, then in a shuffled order) was tried and rejected; the left-to-right version is still opt-in (`/og?glitch=all`, capture `--all-glitch`).
- Sound (2026-10-23, approved and baked into `scripts/og-sound/settings.json`): effects only, no music, on the 16:9 and 9:16 share cuts (`out/share/*-{16x9,9x16}-sound.mp4`, master +8 dB, about −21 LUFS); the site's og:video stays silent. Liam's brief, after OpenAI's brand video: understated, shallow, punchy and springy rather than muddy or game-like, few sounds at once. Sounds and the rules for when they play live in `scripts/og-sound/synth.mjs`: glitch ticks (opening and closing glitches only); glyph pops the whole time glyphs bounce (as extra glyphs split off and on knocks between pieces, capped per second), played backwards as extra glyphs are sucked away; and a soft finishing pop 250ms after the last tick (the glyph pop's recipe, lower, rounder, and longer, with no click; Low pop, −5 st, 1.2× length, 0.65× brightness). No whoosh. Nothing wraps into the loop's start: the sound cuts run on past the loop until the last sound has rung out, holding the final frame (the plain name) for that tail, and the lab plays the same way. Each sound has presets with a `character` slider morphing between them, plus adjustments. Tuned by ear in the sound lab (private artifact: https://claude.ai/artifact/C2Ws8XyB6KAwkp9duq6WDU), built by `node scripts/og-sound/build-lab.mjs` from the same synth, so the lab plays exactly what renders. Its Copy settings JSON goes in `scripts/og-sound/settings.json`, then `node scripts/sound-og.mjs` renders the cuts (no loudness normalisation: levels are the ones chosen). Events come from the capture (`events.json` beside each frames folder, logged only when it asks, so the silent video is byte-identical). Tried and rejected: glassy taps, blips, bloops, crisp pops, return swells, tuned landing taps (too game-like), then a muffled low pluck (too underwater and muddy), then knocks altogether (noise once the pops run through the bounce), a Return sound for the letters coming home, an airy, long whoosh, a typewriter margin bell (still a ding even reduced to its body), a plucked-string finish (too string-like), and the whoosh altogether, even short and low.
- Engine: `src/lib/og-burst.ts` (Matter.js, separate from the site's swarm, which still pulls letters to the cursor). Pure helpers tested in `tests/og-burst.test.mjs`.
- Outputs: `public/images/meta/og-office.{mp4,png}` (1200×630, 60fps, ~1.1 MB; the PNG is the first frame), plus social share cuts in `out/share/`, each a video and a still of its first frame: `office-of-liam-fennell-16x9.{mp4,png}` (1920×1080, laid out at 1200×675 and scaled 1.6×), `-9x16` (1080×1920, 675×1200 scaled 1.6×), and `-1x1` (2400×2400). The 1.91:1 shape is only for og:video, not social. New filenames so platforms don't serve the old blank `opengraph.png` from cache. og:video has no length limit in the spec; most platforms other than Discord show the image anyway.
- `/og` (dev only) plays the loop in real time at any viewport size. `node scripts/capture-og.mjs http://localhost:3000/og` records it on a virtual clock with seeded randomness, so reruns match; `--quick` records only the 1200×630 frames for tuning. Rerun it after palette changes.
- Glitched letters settle on glyph-palette colors rather than the Figma card's, which predate the current palette. The card's 40px size is a new token (`--text-og-card`).
- Tried: the real swarm, sucking letters into a central cloud and springing them home (too little bouncing, clunky reset); fading the pumped glyphs out (replaced by the pop); growing pumped glyphs from zero on top of their parent (read as overlap; replaced by the split); one blended path home for every letter at once (too abrupt and synced; replaced by per-letter settle, spring, and rewind).

**Album-cover transitions and test controls (2026-10-21)**
- Replaced blur with an 8 × 8 grid swap: irregular clusters reveal the new artwork over ~200ms, with sparse 32ms glyph-palette flashes. Artwork preloads; reduced motion swaps directly.
- The avatar opens the inspector/test menu on desktop and mobile in development and previews. Palette position and palette-lab controls now live there; footer strip and “by ABC Dinamo” are no longer buttons. Existing inspector switches remain in the same menu. Normal sort/grid controls and the globe keep their primary interactions.

**Mobile toolbar targets (2026-10-21)**
- Reverted the half-width mobile tap targets; original control widths and spacing restored. Album-cover transitions remain.

**Color strip removed (2026-10-23)**
- Removed the strip from both player and avatar, including its animation loop, portal slots, placement toggles/state, strip-only tokens/styles, and muted strip palette.
- The music player always renders its existing numeric timer. Glyph colors, globe/party mode, album transitions, and palette-lab controls are unchanged.
- Validation: build, type check, and 40 tests pass. Touched-file lint also flags the existing render-time `modeRef.current = mode` assignment in `palette-toy.tsx`; the strip removal leaves that behavior unchanged.

**Hover letters join the party (2026-10-23)**
- Replaced preemptive random masks on hidden dropdown options and project labels. Newly visible labels donate a few actual final characters (up to three per label, with a short random stagger), using the existing pop, capture physics, and palette glitch. Selected sort/grid controls still contribute to the original startup swarm.
- Donations happen once per project label or menu option for the entire party, using stable identities that survive dropdown remounts and grid moves. Returning to a label preserves the same missing positions without adding letters. Menu options donate on their own first hover/focus; mobile expanded labels follow the same persistent rule. Exit clears all donation state.
- These extra letters have no permanent return slot. Exiting immediately restores their labels and sends their floating copies past the nearest viewport edge. Ordinary page/globe letters retain their existing return animation.
- Verified real desktop dropdown/tile hovers with the inspector on/off, individual-option activation, persistence across dropdown remounts and tile re-entry, immediate label restoration on exit, offscreen exits (no visible removal), repeated touch expansion, and reduced motion. Added nearest-edge exit coverage to the motion tests.

**Mobile grid/list transitions (2026-10-23)**
- The mobile 1-column/2-column control now uses the same 180ms layout tween as desktop density changes and mobile project expansion. Label counter-scaling, interrupted transitions, and reduced-motion behavior share the existing implementation.

**Returning glyphs while scrolling (2026-10-23)**
- Return flights now move with their text destinations when the page scrolls or reflows. The spring and final settle preserve their remaining offset from the slot, rather than chasing a moving viewport target.
- This prevents fast scrolling from keeping intro letters airborne until scrolling stops or the five-second safety timeout restores them. The existing stagger, spring speeds, and landing animation remain unchanged.

**Swarm performance and intro trim (2026-10-23)**
- Removed the draft second intro paragraph; kept the original first paragraph while replacement copy is being considered. This reduced the local desktop swarm from 455 to 249 characters.
- Returning letters now measure all home positions before any letter transforms or removals. This avoids per-character style/layout flushes while preserving live destinations during scrolling and layout changes.
- Text changes share one text-node lookup per anchor element. Waiting for a stable character no longer rebuilds every source anchor and transient UI mask each animation frame; DOM mutations still reattach masks before paint.
- Local Chromium with 4× CPU throttling, comparing the same 249-character page before/after batching: return-phase style recalculation fell from ~2.56s to ~0.76s across a 5.5s sample. Synthetic scroll tests still slow down under throttling; this is not a guarantee of device-specific frame rates. No reduction in swarm amount, physics, or motion timing.
- Verified desktop/mobile dynamic text, scrolling, return cleanup, and reduced motion in the production build; 39 tests, type check, and touched-file lint pass.

**Menu masks and intro (2026-10-23)**
- Hidden menu options now use individually rendered characters with random opacity masks, independent of browser highlight painting. The selected control still feeds the real swarm, while hover project text retains its working mask-only behavior. Cleanup removes all menu masks.
- Removed intro paragraph indentation and superscript references. Intro links now use text-primary without underlines; replacement copy pending.

**Transient mask painting (2026-10-23)**
- Menu labels now have explicit text boxes, avoiding anonymous flex text that Safari cannot paint with custom highlights. Re-register dynamic highlight ranges after updates. Selected control text keeps participating in the actual swarm; menu options and project labels remain mask-only.

**Swarm masks for transient labels (2026-10-23)**
- Sort/grid menu options and project hover labels now lose random characters while the swarm is active, including labels opened after activation. Masks track character positions through scrambles and rerenders; these characters are excluded from source selection and add no floating glyphs. All masks clear on exit/cancel.

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
