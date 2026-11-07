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
- Fills: `--bg-fill` (#FFFFFF), `--bg-secondary-fill` (#F6F8FA),
  `--bg-green-fill` (#1ED760), and `--bg-purple-fill` (#5343EB).
- The site currently stays light. Dark overrides remain in `tokens.css` under `:root[data-theme="dark"]` for future use: #120F12 / #1B191D surfaces and #FAF8FA / #CDC9CE primary/secondary text. Muted and accent colors retain their values. The theme toggle and theme-switch animations have been removed.
- Borders, shadows, and translucent overlays derive from those roles with opacity.
  White accent logos use `--text-on-accent`, which stays white in both themes.
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

On the redesigned homepage, click the avatar in the header to show or hide the inspector panel in development/previews. Palette-lab access lives here. Other pages retain their existing inspector access.

The redesigned homepage displays **all nine filled projects, with no blank placeholders**, including Shopping agent for Milktooth (Q1 26, Next.js and OpenAI API) and Blink for Milktooth (Q4 26, UIKit and Metal). The existing project IDs, media, and credits are retained. `ProjectFeed` filters the registry to entries with media.

The November layout uses a centered 552px column, a 480px bio, 8px desktop / 4px mobile tile gaps, and a fixed header bar with the avatar, name, and Contact email link, plus a music player row above the footer. Tapping a project opens one of two views, set by the avatar menu's **Projects** control or `?projects=overlay`: **Focused view** (default) or **Card overlay**. Desktop narrows the bar on scroll. Over the images it turns translucent, the avatar leaves, the name and Contact color-glitch into the current sort and Top, and the sort circle fades, grows, and unblurs in. Clicking the label there cycles the sort; scrolling back reverses this. The new spacing roles live in `tokens.css` under `--portfolio-*`, with scoped layout rules in `homepage.css`. The intro and contacts use bodySerif (15/20 desktop, 14/18 mobile). Existing 20/19px leading and #F6F8FA fill are used instead of Figma’s fractional leading and #F7F8FA; the feed uses the shared 552px measure instead of the frame’s 553px rounding.

The feed order lives in `src/lib/featured-order.json`. Recent, the default sort, shows exactly that order rather than sorting by date; Random shuffles it. A project the order doesn't name yet slots in by date, after others from its quarter. Projects may carry an optional `stackTag: "top" | "bottom"`: Top search and Collections sheet are `top` and Bottom search is `bottom`. A top-tagged tile can't sit directly above a bottom-tagged one, including in Random; a small swap resolves it.

It works on the homepage, `/process`, and the palette lab:

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
  Normal focus uses the same placement with #f6f8fa at the top and white at the bottom. A short inward
  fade sits behind the navigation controls; the edge sampled by Safari stays solid.
- The hidden avatar menu’s **Projects** control cycles **Focused view → Card overlay** and resets to Focused view, the default, on reload. `?projects=overlay` picks Card overlay on load. Focused view is an opaque full-screen modal: the media keeps playing as it moves into place, the header morphs into the project's company, name, and date with a color glitch, and tapping anywhere except a link, pressing Escape, or on mobile swiping down from the top closes it. If paging left the project's tile off screen, the media collapses in place instead of flying back. Left and Right Arrow move between projects; there are no on-screen controls.
- **Card overlay** adds Contributors/Stack credits inside the selected tile over an 88% white tint and 10px background blur. The blur surface fades over 180ms; credit rows enter top to bottom and exit bottom to top within the same window. The company and quarter labels color-glitch in with the panel on click, with no hover state, and stay until a second click, another selection, or keyboard focus on another project. Escape closes it. Credits reuse the focused-view component and links; the original video keeps playing in place. Reduced motion shows the surface and credits immediately. There is no shader or entry-style toggle.
- The intro has three paragraphs: the Shopify role, Milktooth creative practice (linked to https://milktooth.studio), and the site/process paragraph. Only “process” is linked in the final sentence. The comparison variants and Intro toggle have been removed.
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
the same height enter together. On exit, the text disappears instantly.
The backdrop and media start on the same tap.
Grid hover labels hide immediately for the focus session, so their reverse stream cannot linger behind the moving media.
Linked credits appear under **Contributors**,
beside **Stack**, and empty fields are omitted. Stack takes the left column when contributors are absent.
Projects may override their contributors and stack independently; placeholders retain the shared defaults.
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

Left Arrow goes to the previous project and Right Arrow to the next, looping through the displayed order, including
Recent and Random sorting. Alt/Ctrl/Command shortcuts are left to the browser. Navigation retains
the overlay, page lock, and media elements, resets the focus content's scroll to the top, and announces
the current project to screen readers. Closing restores the original page position and opener focus.
Desktop focus also supports horizontal trackpad/wheel scrolling and Shift+wheel: right advances and left
returns, one project per finger stroke. New strokes can interrupt a previous fling’s momentum without
moving the pointer; the idle reset uses the shared 150ms hover duration. On desktop the native scroller
stays stationary while its panel slides inside it, preserving the wheel target across page changes. Vertical scrolling and pinch zoom remain native.
Mobile focus also supports horizontal swipes: left advances and right goes back, with the next project
following the drag. Short/canceled drags snap back; vertical scrolling, pinch zoom, and edge gestures
remain available. Arrow keys use the same directional whole-page slide on desktop and mobile.
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

Text links repeatedly flash one to three random alphabetic graphemes while hovered or keyboard-focused, never more than 60% at once. The 90ms flashes have random 40–100ms pauses, use the globe’s legible palette, and stop immediately on mouse-out. Native text stays intact via CSS Custom Highlights, beneath the swarm’s masks. Reduced motion disables the flashes; unsupported browsers retain ordinary hover dimming. The contact links also work with inspector display:contents wrappers enabled. The song timestamp opts out with `data-hover-glitch-skip`; alongside the track text, the Spotify block flashes while playing and its icon flashes when idle. The sort control shares the flash on its text and dot; tapping switches between Recent and Random, on desktop and mobile, on the page and in the header. Sorting changes each tile's CSS `order` rather than moving it in the DOM, because moving a playing video can flash black. Marks flash on about a third of pulses (`--link-glitch-mark-chance`). Timing and density live in `--link-glitch-*` tokens.

The globe and exit ring use their own quiet ripples: a scattered subset of glyphs flickers from a random origin every couple of seconds at rest, and hover or keyboard focus shortens the gaps and colors more of them. This matches the v3 branch.

A 44px globe of orbiting characters sits in the middle of the footer on desktop
and centered below it on mobile. Tapping it bursts the globe and frees about
70% of every letter on the page, including letters scrolled out of view, which
enter from the nearest screen edge or a random side: all from the sides on mobile, about 40% on desktop (`--glyph-side-entry-share`). Letters pop out of their text at their own moments
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
Party mode temporarily allows custom text highlights on project cards, menus, the player, and footer;
a selection guard still blocks manual text selection. The temporary overrides disappear when the party ends.
`node scripts/check-party-hover-masks.mjs [origin]` verifies painted project-label gaps and cleanup in WebKit;
set `PARTY_BROWSER=chromium` to check Chromium too.

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
