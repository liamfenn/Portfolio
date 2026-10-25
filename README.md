# Colophon

Built with Next.js 16, Tailwind CSS 4, and TypeScript. The current homepage is set in ABC Oracle and ABC Otto. Deployed on Vercel.

Weather data from OpenWeatherMap. Now playing from the Spotify API. Designed and developed by Liam Fennell with assistance from Claude.

Working on the site: start with [`AGENTS.md`](AGENTS.md) (rules for people and coding agents), then
[`docs/progress.md`](docs/progress.md), [`docs/workflow.md`](docs/workflow.md), and
[`docs/design-principles.md`](docs/design-principles.md).

## Design tokens

Edit `src/app/tokens.css` to change the homepage's shared colors and typography.
Use these variables in component styles instead of adding raw color or type values.

- Text colors: `--text-primary` (#000000), `--text-secondary` (#555555),
  `--text-muted` (#999999), and `--text-green` (#1ED760).
- Fills: `--bg-fill` (#FFFFFF), `--bg-secondary-fill` (#F6F8F9),
  `--bg-green-fill` (#1ED760), and `--bg-purple-fill` (#5343EB).
- Borders, shadows, and translucent overlays derive from those roles with opacity.
  White text on filled controls uses `--bg-fill`; there is no extra inverse token.
- Fonts: `--font-oracle` and `--font-otto` bind to the loaded font files.
- Primitive type values: 15px body text and 14px captions on desktop;
  14px body text and 13px captions on mobile; regular weight and family tracking.

Apply one class from `src/app/text-styles.css` to get the whole text style.
Colors remain independent so the same style can use primary or secondary text.

| Style class | Font | Desktop size / leading | Mobile size / leading |
| --- | --- | --- | --- |
| `text-bodySerif` | Otto | 15px / 20px | 14px / 18px |
| `text-bodySans` | Oracle | 15px / 20px | 14px / 18px |
| `text-captionSerif` | Otto | 14px / 19px | 13px / 18px |
| `text-captionSans` | Oracle | 14px / 19px | 13px / 18px |

These are the four named styles, including the palette lab and inspector UI.
All use weight 400. Serif styles track at -2%; sans styles track at -1%.
Change a named style's `--type-*` bundle to update its family, size, weight,
and leading together. Email and social links use bodySerif. Project details,
project dates, and the player's listening status and time use captionSans.

The built-in inspector is a debugging tool: on in local development and on
previews, never in production. Open a page with `?inspect=off` to turn it off in
that browser (it's remembered) and `?inspect` to turn it back on. When off,
`InspectableText` renders plain text.

On desktop or mobile, tap the avatar to show or hide the panel (it skips the Shop link
while the inspector is on), then choose a mode or test control. Palette-lab access lives here.

It works on the homepage and the palette lab:

- **T** cycles content → text style → font size / line height → content (for example, `15 / 20`, in pixels).
- **O** cycles content → color token → hex → content. (C is taken by the Vercel
  toolbar's comment shortcut on previews.)
- **P**, **M**, and **G** draw padding, margins, and gaps; **S** draws all three.
  Each cycles vertical → horizontal → off. The 8px page frame is its own purple layer.
- **F** previews the page in one typeface: every serif style (bodySerif,
  captionSerif) swaps to its sans counterpart. Press again to
  restore. It works alongside the other modes.
- **H** (or tapping the avatar) hides or shows the floating panel, even with no mode active.
- Project tap/click opens the focused project view by default. The hidden avatar menu’s **Inline project expansion** toggle restores the earlier behavior for comparison: mobile taps expand tiles in the grid, while desktop retains hover previews. This toggle starts off on each page load. The media moves into an overlay with a white 88% backdrop and 8px blur, and its text color-glitches on entry; Close, Escape, or the backdrop returns it to the grid. Close stays 24px above the mobile safe-area bottom and 44px on desktop. Reduced motion skips the effects.
- **Extra bottom space** in the avatar menu sets desktop page bottom padding to 32px instead of 8px
  (48px below the footer content instead of 24px).
  It starts off on each page load and does not affect mobile.
- **Escape** restores content. Switching families starts at that family's first
  view. Shortcuts ignore editable fields and modifier keys.

Use `InspectableText` for new visible text, inside its text-style class. Its
original React content stays mounted, and transitions share the filters' glyph
effect. Pair text color declarations with `--inspect-color-token: text-primary`
so the inspector reports the semantic token; unmatched colors show `unassigned`.
The inspector reads rendered font metrics and color values at the current width.
Labels retain the original text styling without added backgrounds or swatches.
The intro is inspected as one paragraph, using its shared bodySerif style and base color.

Only Shop previews are listed in `src/lib/project-previews.ts`; their badges use
`--bg-purple-fill`. Other project assets remain available for later use.
Each project can provide `team: [{ name, href }]` for linked credits in the focused view; the entire Team field is hidden when the array is absent or empty.
The palette lives in `src/lib/palette-toy.ts`, independent of UI colors: 29
colours kept from a 64-colour, full-spectrum quiz (pinks and raspberries,
periwinkles through amethysts, light aquas and greens, highlighter yellows). It
colours the globe, the exit ring and the swarm's
colour glitch. Colours under 1.5:1 on white (the yellows) sit out glyph effects, where they would vanish. `?palette-lab` → **Colors**
reruns the quiz locally: each colour is previewed as type and glyphs on white
(Y/N or arrow keys, Backspace to undo), then a final cut; **Copy settings**
exports the result to bake in as the new default.

The globe and exit ring use short runs of tightly staggered palette flickers rippling through scattered characters from changing origins, returning to black between bursts. Hover or keyboard focus speeds up the spin and increases the flickers, while keeping fewer than half the characters colored.

A 44px globe of orbiting characters sits in the middle of the footer on desktop
and centered below it on mobile. Tapping it bursts the globe and frees about
70% of every letter on the page, including letters scrolled out of view, which
enter from the screen edge. Letters pop out of their text at their own moments
over about a second and a half, float loose for a while, then are sucked in at
their own pace and strength before relaxing into the swarm. Their original spots
go blank while the text stays mounted and current. Each blank is tied to its
character position rather than a text node, so it survives re-renders: menu labels
that rewrite themselves on hover stay masked, and when the song or clock changes,
a floating letter quietly becomes the new character at its place (after the text
has held still for a moment, so scrambles pass by). If a new title is shorter,
letters without a place fade into the end of the line on exit. Twelve of its characters
stay behind as the exit: a flat ring of glyphs around an empty centre, like a
stroke, turning slowly clockwise. The swarm keeps a small clear pocket around it
so it always reads.

While the swarm is active, first hovering a sort/grid menu option or revealing a project's title and date releases a few
more letters into it. These hover-only labels stay intact until revealed, then their letters pop out and
color-glitch with the same capture motion. Each label keeps the same missing characters for that party,
including across dropdown remounts and repeated mobile taps, without donating more on re-entry. On exit,
these extra copies fly offscreen while labels restore at once; permanent page letters still glide home normally.

The swarm has no downward gravity. It floats in a loose zone that trails the
cursor lazily and sways a little. Each letter circles its own spot in the zone and
keeps some room from its neighbours, so the cloud flows and bumps without packing
into one shape; strays past the edge are drawn gently back, and a small pocket at
the cursor stays clear. Moving the cursor through the swarm pushes letters away
and they float back. On touch, a flick, or a vertical drag from open space, still
scrolls the page (and the finger pushes letters as it goes). A touch that starts
on the swarm, rests before moving, or starts sideways is play: the page holds
still for that touch so you can draw through the letters. Lifting the finger lets the swarm drift to the centre.

The ring (or the Esc key) mirrors the entry: each letter loosens and floats free for
a moment, then glides home on a spring at its own speed. It arrives just off its
slot, still a little tilted and turning, then settles the last few pixels on its own
short ease and reappears in its text. Like the entry in reverse, the globe's own letters come home last, flying back into their exact spots as the ring folds back into the globe. Reduced motion
disables the toy.

Open `?palette-lab` and choose **Glyphs** to tune how many letters are pulled in,
anchor pull, pointer push, bounce, ambient drift, and spacing. Preferences stay
local. Matter.js preloads when the globe is hovered, focused, or touched.

## Spotify authorization

Spotify development-mode refresh tokens expire after 180 days. To reconnect the
music widget, make sure the redirect URI in `.env.local` is registered in the
Spotify developer dashboard, then run:

```bash
npm run spotify:authorize
```

Open the printed authorization URL. After approval, the local callback updates
`SPOTIFY_REFRESH_TOKEN` in `.env.local` without printing it. Rotate the matching
Production environment variable in Vercel and redeploy the current release.

The color strip and its placement controls have been removed. The music player always shows its numeric timer. The globe, swarm, color glitches, and palette lab retain their existing palette.

## Adding project videos

Keep the original high-quality, tagged SDR master and its frame rate. `npm run media:import -- /path/to/master.mp4 --id project-id --alt "Project interaction prototype"` preserves 60fps sources, generates responsive H.264 and posters, validates and uploads immutable files, and updates the imported registry. Use `--local` for an unpublished check. See [`docs/media-workflow.md`](docs/media-workflow.md) for options, playback limits, and device validation.

Video tiles suppress native long-press callouts and text selection; there is no custom media menu. Real image tiles retain native image callouts and hit testing. Ordinary mobile taps still expand tiles. Text selection is also disabled on the globe/exit control and Spotify bar, while the intro and other page text remain selectable.
