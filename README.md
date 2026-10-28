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

Shared loading surfaces use `Skeleton` and `SkeletonText` in `src/components/skeleton.tsx`.
Images, the profile photo, and initial album art show a subtle gray sweep until loaded. Video tiles
keep that skeleton until their first frame is presented, then retain the current picture through buffering
and resolution upgrades. Posters remain available for reduced motion, data saving, failed/blocked
playback, and no JavaScript. Text skeletons
cover initial track/time/weather gaps; cached track data stays visible during refreshes. Missing project
assets remain static placeholders. Reduced motion removes the sweep, image failures stop it, and
no-JavaScript visitors see available images and static fallback copy. Timing, fill roles, and line height
live in the `--skeleton-*` tokens. Run `node scripts/check-loading-states.mjs [origin]` with the optional
Playwright browser setup to verify delayed resources, failures, cached images, and no-JS behavior.

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
- **Skeleton preview** keeps the real loading sweep visible over media and dynamic music/weather text
  even after loading finishes. Switch it off to reveal the current content immediately; it resets off
  on reload. Available in the hidden avatar menu, with reduced-motion preferences respected.
- **Safari edge test** adds opaque green top and purple bottom strips above mobile project focus,
  using native fixed edges without viewport-positioning JavaScript. Liam confirmed color extension in
  all Safari tab layouts on iOS 27.2. It stays available for debugging and resets off on reload.
  Normal focus uses the same placement with #f6f8f9 at the top and white at the bottom. A short inward
  fade sits behind the navigation controls; the edge sampled by Safari stays solid.
- Project tap/click opens the focused project view by default. The hidden avatar menu’s **Inline project expansion** toggle restores the earlier behavior for comparison: mobile taps expand tiles in the grid, while desktop retains hover previews. This toggle starts off on each page load. The media moves into an overlay with a white 92% backdrop and 10px blur, and its text fades in from top to bottom; Close, Escape, or the backdrop returns it to the grid. Close stays 24px above the mobile safe-area bottom and 44px on desktop. Reduced motion skips the effects.
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
Each project can provide `team: [{ name, href }]` for linked credits in the focused view; the entire Contributors field is hidden when the array is absent or empty.
The focus view also accepts `description` and `tech: string[]`. The description uses bodySerif. All focus
text uses the same 600ms opacity fade starting 120ms after opening, staggered 40ms from top to bottom; rows at
the same height enter together. Exit reverses the row order with 180ms fades and a 12ms bottom-to-top
stagger; the stagger scales with the exit/entry duration ratio. P, Close, and N are visible immediately with no intro animation.
On exit, those buttons fade out first over 180ms; the bottom-to-top content stagger starts after they disappear, followed by the card return.
Grid hover labels hide immediately for the focus session, so their reverse stream cannot linger behind the moving media.
Linked credits appear under **Contributors**,
beside **Tech**, and empty fields are omitted. Current projects share the Figma placeholder description
and Swift/UIKit/Metal stack until their final content is ready.
Focus labels render as ordinary native text without decorative glyph copies.
Focused media stays inside its original grid button for the entire session. A single controller in
`src/lib/project-focus-media.ts` positions that element over the overlay's layout slot and shares the
paging/return transforms. Native video keeps playing through entry, scrolling, paging, and exit; there
are no focus canvas copies, clock holds, or landing timers. Event-driven scroll/resize updates keep media
aligned without an idle rendering loop. Text and controls occupy higher overlay layers, and the slot
provides the media's accessible label while background controls remain inert.
The dialog wrapper stays unstacked; its panels are viewport-fixed so their layer tokens can sit above
background menus/globe glyphs and share the same stacking hierarchy as the original grid media.
Focus text is removed after every staggered exit fade, with its layout height retained. The removal
paints before the 180ms card return begins; scrolling locks during this sequence. Rendition upgrades wait
until motion settles and retain one frame only while an actual source change loads; pause/error/policy
handling remains owned by the shared video coordinator.
On initial playback, the native video stays visible beneath an opaque skeleton until a presented frame
has had two paint opportunities, avoiding a simultaneous surface unhide and skeleton removal.

The fixed **P / Close / N** strip works on desktop and mobile. P or Left Arrow goes to the previous project;
N or Right Arrow goes to the next. Buttons and shortcuts loop through the displayed grid order, including
Recent and Random sorting. Letter/arrow shortcuts keep control focus without an outline; Tab navigation
and Enter/Space button activation retain the normal focus indicator. Alt/Ctrl/Command shortcuts are
left to the browser. Navigation retains
the overlay, page lock, and media elements, resets the focus content's scroll to the top, and announces
the current project to screen readers. Closing restores the original page position and opener focus.
Desktop focus also supports horizontal trackpad/wheel scrolling and Shift+wheel: right advances and left
returns, one project per finger stroke. New strokes can interrupt a previous fling’s momentum without
moving the pointer; the idle reset uses the shared 150ms hover duration. On desktop the native scroller
stays stationary while its panel slides inside it, preserving the wheel target across page changes. Vertical scrolling and pinch zoom remain native.
Mobile focus also supports horizontal swipes: left advances and right goes back, with the next project
following the drag. Short/canceled drags snap back; vertical scrolling, pinch zoom, and edge gestures
remain available. Buttons and keys use the same directional whole-page slide on desktop and mobile.
Paging uses the shared 300ms motion duration and focus easing, shortened for the remaining swipe
distance. The backdrop, Safari edge strips, bottom fade, and controls stay fixed. Text fades on initial
open and stays fully readable during page changes. Reduced motion switches pages without sliding.
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
