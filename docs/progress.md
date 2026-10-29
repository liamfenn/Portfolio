# Progress and goals

Last updated 2026-10-19. Branch: `portfolio-v3-homepage`. Update this file when something ships, gets
decided, or gets dropped.

## Where things stand

Raw design-thesis conversations, prompts, and drafts are saved in [`design-thesis-raw.md`](design-thesis-raw.md) for later editing.

The v3 homepage is built and live on the branch preview (see [`workflow.md`](workflow.md)). `main` (and
production) is still the August version. Merging is Liam's call.

**Intro copy comparison in debug menu**
- Added an Intro cycle in the avatar debug menu: Long → Short → Short · resonates. Long remains the default on refresh. Both short variants omit the opening three sentences of paragraph two; the third variant also uses “If something here resonates, get in touch”.
- All variants retain the primary colors and two unindented paragraphs with no ending periods. Shop's following period remains outside the link. Only “process” is linked in the final sentence; “Read about the” uses the normal secondary text color.
- Validation: 64 tests, TypeScript, touched-file lint, production build, and diff checks pass. Production browser checks at 1440px and 390px verified all three variants, cycling back, Long on reload, paragraph endings, six primary links, Shop/process link boundaries, and no horizontal overflow.

**Intro copy and links**
- Replaced the intro with Liam's two supplied paragraphs, with no indentation and one line of space between them. The existing serif type, pretty wrapping, and 520px desktop width remain.
- Liam Fennell stays unlinked in text-primary. Shop, OpenPurpose, Bird, Plasticity, get in touch, and Read about the process use text-primary and the supplied web/mail destinations.
- Validation: 64 tests, TypeScript, touched-file lint, production build, and diff checks pass. Production browser checks at 1440px and 390px verified all six destinations, primary link/name colors, paragraph spacing, zero indentation, and no horizontal overflow.

**Back to the first shader, with a Fade toggle (2026-10-28)**
- Liam preferred the first diagonal lens wipe to the Glow and Particles styles, the 65° sweep, and the rewinding exit, so both of those commits are reverted (903c547, 11cebfe); the code matches 1a7ba39 again. Their designs remain in git history (9d160f0, 898f1b1) if we want to revisit them.
- The avatar menu's **Card entry** control switches between **Shader** (the default) and **Fade**, the original 180ms CSS fade, for comparison. A switch applies from the next opening.

**Card overlay entry wipe (2026-10-28)**
- Opening a card overlay now runs a WebGL shader: a diagonal front from the top-left corner sweeps to the bottom-right over 900ms on `.85, 0, .15, 1`, bending the media in a lens as it passes and leaving the 10px blur and 88% white tint set behind it. Credit rows reveal as the blur sets under their centers (not before, so text never sits on sharp, bent video). Once the front has crossed, the CSS surface appears beneath the canvas and the canvas fades out over 180ms and is removed with its context released. Exit is unchanged.
- The blur moved from the panel onto its own `.project-card-surface` layer: the canvas has to sit between blur and text, and opacity on the panel would cut its backdrop-filter off from the media.
- Grid videos and posters now load with `crossOrigin="anonymous"` so WebGL can read their frames; the Blob host returns `Access-Control-Allow-Origin: *`. Without it the texture upload throws a cross-origin error. If a frame is still unreadable, the sweep runs over the media's backdrop color, which under the 88% tint looks nearly the same.
- New tokens `--project-card-overlay-enter-duration` (900ms) and `--project-card-overlay-enter-ease`; no existing motion role was long or strong enough. Shape constants (band width, lens strength) live in `card-overlay-wipe.ts`. No dependencies added.
- Validation: 64 tests (new `tests/card-overlay-wipe.test.mjs` covers the bezier solver, front range, row reveal, and cover fit), TypeScript, touched-file lint, production build. Chromium card overlay, focus, paging, navigation, Safari edge, and loading checks pass at desktop and mobile widths. Headless captures confirmed the lens, row sync, and settle at both widths; closing mid-sweep, rapid reopen, and reduced motion leave no canvas or inline styles. Not checked: WebKit (not installed on this machine) and real Safari/iPhone GPU performance.

**Card overlay is the default (2026-10-28)**
- Surface lightened to an 88% white tint and the focused view's 10px blur (`--project-focus-blur`), replacing 92% and 12px. 88% has no existing role, so `--project-card-overlay-opacity` holds it directly instead of aliasing the focus backdrop.
- Project clicks and taps now open the card overlay. Focused view and Inline expansion stay in the avatar menu's **Projects** cycle (Card overlay → Focused view → Inline expansion), which resets to Card overlay on reload.
- `?projects=<mode>` selects a mode on load, applied on the first frame after hydration. The focus browser checks load `?projects=focus` and wait for the dialog trigger before clicking, so they keep covering Focused view.

**Three project interaction options with a card overlay (2026-10-28)**
- The hidden avatar menu now cycles Focused view → Inline expansion → Card overlay and resets to Focused view on reload. Both existing modes are preserved. The new mode follows [Figma 518:3001](https://www.figma.com/design/nIi2Tpt2b8yYxYsuCq38OJ/New-Portfolio?node-id=518-3001): company/quarter at the top and shared contributors/tech columns at the bottom, over a uniform 92% white tint with 12px background blur (Liam’s surface adjustment after the initial Figma match). Mobile retains the existing expansion/FLIP and company/quarter color glitch; desktop pins its existing hover labels above the surface until another selection, second click, or keyboard focus on another project.
- The tint and detail rows share one 180ms window in both directions. Rows enter top to bottom and exit bottom to top, with a scaled 12ms stagger and 144ms fade for today's four aligned rows. CSS handles interrupted transitions; reduced motion is immediate. Contributor links are siblings of the card button, closed content is inert, Escape restores the trigger, and the overlay preserves its keyboard focus outline. Credits reuse the focused-view markup; no new dependencies, extra video elements, or media lifecycle changes.
- Reused 12px mobile/16px desktop insets, semantic colors, and the four existing type roles. Mobile leading remains 18px instead of Figma's 17.55/18.9px, making the credit group roughly 3px shorter. New `--project-card-overlay-*` roles expose the surface duration/opacity/blur; duration and opacity alias existing tokens.
- Validation: 59 tests, TypeScript, touched-file lint, and production build passed. Chromium and current WebKit 26.5 cover the cycle/default, mobile one/two-column expansion, pinning/second-click/selection behavior, enter/reverse-exit timing, real links, keyboard focus/Escape, reduced motion, and original-video continuity. Existing Chromium desktop/mobile focus checks, WebKit rapid/scrolled/paged video continuity, and painted party-hover donation checks pass. The optional card browser script supports an external `PLAYWRIGHT_MODULE` for current test engines; legacy WebKit 18 cannot resolve CSS variables inside its prefixed backdrop-filter, including the pre-existing focus blur. No application workaround or dependency was added for that old test engine. Physical iPhone compositor behavior remains a device check.

**Paint party-mode donation gaps in project labels (2026-10-28)**
- Project cards were missing from party mode's temporary text-selection exception. WebKit registered the donated character ranges but did not paint their transparent highlight while the card button retained `user-select: none`. Added cards to the existing active-party exception; the selection guard still blocks manual selection and removing the party style restores normal button behavior.
- The painted-pixel regression fails on the previous build: a donated project character has a registered mask but zero changed pixels when that mask is revealed. The check also covers stable donated positions after hover reentry, source-text preservation, and full cleanup.
- Validation: 59 tests, TypeScript, touched-file lint, and production build passed. WebKit and Chromium show actual painted donation gaps, retain the same missing positions on repeat hover, keep source text mounted, prevent manual selection during the party, and restore selection policy/listeners when it ends.

**Share focus layers above background controls and globe (2026-10-28)**
- The fixed focus wrapper created its own stacking context even with an automatic z-index, trapping the backdrop/content/buttons below positively layered page controls and globe glyphs. The wrapper now stays unstacked, while its backdrop, pages, buttons, and bottom fade are fixed to the viewport and share the existing layer tokens with native grid media. No video placement/playback code, extra layers, or new tokens were added.
- Added a regression that temporarily enables background hit testing: inert elements can paint above a modal while being absent from ordinary hit tests, which is why previous interaction checks missed it. The new check fails against the previous build with both desktop menu controls above focus.
- Validation: 59 tests, TypeScript, touched-script lint, and production build passed. WebKit and Chromium stacking checks cover menus and in-view globe glyphs at desktop/mobile widths, with viewport geometry, navigation, scroll restoration, and screenshots checked. Existing focus/exit sequencing, real-video continuous entry/paging/rapid exit/resize/policy recovery, and Safari edge/safe-area checks pass.

**Hide grid hover labels immediately on focus entry (2026-10-28)**
- Grid card labels become hidden as soon as the focus root mounts and stay hidden through its return animation. The ordinary hover reverse-stream effect remains available outside focus, but cannot linger behind the expanded card. This is a scoped visibility rule with no new animation state, timers, or media changes.
- Validation: 59 tests, TypeScript, and production build passed. WebKit and Chromium browser checks start from visible hover text, verify hidden labels on the first focus frame and throughout paging/return, then confirm normal hover visibility after closing and immediate hiding on keyboard entry.

**Focus controls leave before the content (2026-10-28)**
- Reversed the dismissal order: P, Close, and N complete their existing 180ms fade before the 180ms/12ms bottom-to-top content stagger starts. The same completion chain then removes text, allows its removal to paint, and returns the card. No independent delay timer, media-controller change, or playback pause was added; interrupted entry and reduced motion keep their existing handling.
- Confirmed the skeleton remains active during initial video loading until frame presentation plus two paint opportunities; focus integration did not remove it. Existing loaded media keeps playing instead of returning to a loading state on focus changes.
- Validation: 59 tests, TypeScript, touched-file lint, and production build passed. Chromium desktop/mobile checks verify buttons fade while content holds still, controls are hidden before the reverse stagger, and card movement follows text removal, including interrupted entry/reduced motion. WebKit paged/scrolled exit checks, initial/reloaded skeleton coverage, and real-video entry/paging/rapid-exit/resize/policy continuity checks pass.

**Integrated stable media through the complete focus session (2026-10-28)**
- Replaced focus-time media reparenting with one `ProjectFocusMedia` controller. Original videos/images/placeholders remain inside their grid buttons; fixed geometry and shared transforms align them with overlay slots during entry, native scrolling, paging, live swipe previews, and return. Layout updates are event-driven, with no idle rendering/canvas loop or extra media elements/dependencies. Tokenized layers keep the backdrop below media and text/buttons/edge samplers above it; the overlay slot supplies the accessible media label while the background remains inert.
- Deleted focus capture/present APIs, close-time clock holds, stationary landing canvases, their callbacks/timers, and the old pause/handoff probe scripts. The shared video coordinator retains only a small frame cover for actual rendition replacement. Existing sources cannot upgrade until the full entry or paging sequence settles; an unloaded focus asset can request its target rendition directly. Playback/load budgets, hidden-page/source release, reduced motion/data-saving/error handling, and the startup paint coverage stay shared.
- Preserved 120ms-delayed 600ms/40ms entry text, 180ms/12ms reverse exit, and buttons held opaque until the text disappears. Text removal still paints before the card returns; closing holds only the media's visual position, with the video clock running. Cleanup restores original inline styles, scroll position, and opener focus, including interrupted/rapid paging and responsive changes.
- Validation: 59 tests, TypeScript, touched-file lint, and production build passed. Real WebKit checks verify uninterrupted initial entry, four rapid/scrolled exits per mobile/desktop width, continuous native video in both paging directions, unchanged DOM parents, no close-time pause/load/duplicate/copy, resize during return, and background/reduced-motion recovery. Updated Chromium focus/navigation/touch-paging and WebKit wheel/exit/source-upgrade checks pass; midpoint screenshots show aligned media/metadata. Startup/reload, loading/failure/no-JS/pre-hydration, and Safari edge-layer checks pass. The twelve-video lab retains two initial load slots and four desktop/two mobile playing slots, with zero video requests in reduced-motion/data-saving/no-JS modes. Native iPhone Safari's final compositor result remains a device check.

**Delay focus controls until content exit completes (2026-10-28)**
- P, Close, and N remain opaque through all reversed content-row fades. Their existing 180ms fade starts after the text is removed, alongside the card-return stage, so fading buttons cannot reveal lingering text behind them. This uses the existing completion chain instead of a separate timer and adds no extra exit wait. Entry, row timing, and video protections are unchanged.
- Validation: 59 tests, TypeScript, touched-file lint, and production build passed. Chromium desktop/mobile focus checks and WebKit paged/scrolled exits verify opaque controls while text remains and gradual button fading afterward, with the same card-return timing. WebKit rapid video exits/reentry retain the same source with no added loads.

**Quicker exit, startup paint coverage, and video lifecycle audit (2026-10-28)**
- Shortened reversed focus text exit from 300ms/20ms to 180ms/12ms. The duration aliases the existing card movement token and the stagger scales with the entry/exit duration ratio. The full sequence is 40% shorter; text removal/paint still completes before the card returns.
- Liam confirmed the refresh flash is confined to the video/card. Startup previously unhid the native video and removed its skeleton on the first video-frame callback. It now keeps the native surface visible beneath an opaque skeleton through two paint opportunities after that callback. The bounded paint callbacks cancel on pause/release, with no extra media element or continuous drawing. This targets a first-paint race; physical Safari flash elimination is not yet confirmed. Source teardown policy remains unchanged.
- Audited each entry/page/exit/startup owner and checked PhotoSwipe, Video.js, and WebKit sources. The [audit](focus-media-audit.md) recommends keeping native media in its original subtree and replacing the focus handoff machinery as a unit, rather than adding guards or a player package. A separate WebKit probe performs four geometry cycles per mobile/desktop width with continuous frames and zero pauses, loads, DOM removals, or canvases. It does not replace the production controller or cover native Safari, focus scrolling/paging, or accessibility integration yet; the production clock hold remains in place.
- Validation: 59 tests, TypeScript, touched-file lint, and production build passed. Updated Chromium focus and WebKit paged/scrolled exit checks confirm the 180ms/12ms reverse sequence and text-free card movement. A new held-frame startup regression fails against the previous build and passes initial load plus two reloads per width and stale-reveal policy cancellation. WebKit real-video focus/loading/upgrade/swipe/rapid-reentry checks and Chromium loading/failure/reduced-motion/no-JS/pre-hydration/preview checks passed.

**Primary focus navigation labels (2026-10-28)**
- P and N now inherit `text-primary` and its inspector annotation from the shared focus action style, matching Close. Removed the secondary-color override; hover styling remains shared.

**Reverse-staggered focus content exit (2026-10-28)**
- Focus rows now fade out bottom to top with the same easing as entry, at twice the speed: 300ms per fade and 20ms stagger, derived from the existing 600ms/40ms tokens. Aligned rows leave together, partially entered rows continue from their current opacity, and reduced motion remains immediate. Removed the obsolete independent 120ms exit token.
- The existing completion chain waits for every row before removing text, painting that removal, and starting the card return. Layout height, scroll lock, video clock hold, landing guard, and fresh-frame reveal stay intact; no dependencies or extra media work were added.
- Validation: 59 tests, TypeScript, touched-file lint, and production build passed. Updated Chromium desktop/mobile focus checks assert reverse row order, 300ms/20ms timing, gradual opacity, stationary media during text exit, text removal before collapse, interrupted entry, and reduced motion. WebKit exit-order checks pass after paging/scrolling across video/placeholder cards and a wide grid; real-video rapid exit/reentry checks retain the same video/source with zero added loads.

**Keep the video clock aligned with the focus safety image (2026-10-28)**
- Liam confirmed the Safari flicker and desktop text fixes, then noticed a small video jump on rapid focus exits. A real-video WebKit regression measured about 0.367 seconds of hidden playback advancing behind the frozen closing image before this fix.
- Kept the original video and existing canvases. Closing pauses the video clock; at landing, a fresh presented frame refreshes the canvases once, then the clock pauses through the remaining paint guard and resumes at reveal. Pending guards rearm when reopening before cleanup. No extra video/decoder, source load, dependency, or continuous canvas drawing loop; playback limits and resolution-upgrade policy remain unchanged.
- Validation: 59 tests, TypeScript, touched-file lint, and production build passed. Real H.264 WebKit checks cover four rapid exits at desktop/mobile widths, a reopen before the pending landing frame, paused clock during close, reveal within 100ms of capture, resumed playback, unchanged video identity/count/source, and zero added source loads. Existing WebKit repeated-handoff/policy cleanup and loading/upgrade/text/swipe regressions also passed. Native Safari's final visual feel remains a device check.

**Completion-ordered focus exit after paging and scrolling (2026-10-28)**
- Liam's desktop Safari screenshot exposed the remaining overlap: the old 80ms media delay was shorter than the 120ms text exit. Reproducing four page changes and a vertical scroll in WebKit showed media moving around 100ms while 285 characters remained in the DOM until about 130ms. The new regression fails against that behavior.
- Closing now completes both text fades, removes the metadata through React, and gives the removal a paint opportunity before starting the 180ms asset return and backdrop fade. The return no longer races an independent timer. Scrolling locks at its current offset with scrollbar space retained, and return geometry is measured after the text stage. The existing video landing shield is retained.
- Validation: 59 tests, TypeScript, touched-file lint, and production build passed. New WebKit and Chromium exit-order checks cover paged/scrolled placeholders, paged/scrolled video, a wide grid, and solo viewing, including continued wheel input during close. Every moving frame has empty text DOM and a stable scroll offset. The full focus suite verifies the 120ms text stage holds the asset still, followed by a separate 180ms return; WebKit real-video regression and repeated handoff checks cover the landing protections.

**Final landing surface and exit text removal**
- Liam confirmed loading and repeated trackpad paging now work, with a remaining brief white iOS Safari landing flash and desktop text persistence after multiple project changes. Focus text is now removed from React's DOM when its fade completes, preserving its measured wrapper height so the closing scroller cannot jump. The update flushes during the animation callback, before media collapse finishes.
- Video close now paints an independent, pointer-transparent canvas directly under body at the final card rectangle. It gets a paint opportunity before the focus compositing tree unmounts, survives the media's parent change and page unlock, and clears with the existing cover only after fresh frame presentation, two paints, and the existing 80ms handoff interval. Rapid reopening hides the old shield; policy/error/disposal/watchdog cleanup removes it as well.
- Validation: 59 tests, TypeScript, touched-file lint, production build, WebKit real-video regressions/handoffs, and Chromium desktop/mobile focus checks passed. Expanded regressions page forward/back four times before close, assert empty text DOM without height changes, and check the shield is painted before unmount, matches the returned video, and clears after presentation or a policy change. Native iOS Safari's final visual result remains for device confirmation.

**Video loading, trackpad rearming, and complete focus exits (2026-10-27)**
- The skeleton previously stopped when a poster loaded. Active video loads now keep it until a presented video frame; loaded posters no longer flash ahead of playback. Coordinator display state retains poster fallbacks for reduced motion/data saving, blocked/failed playback, unprepared cards, and no JavaScript. Real loading and the preview toggle remain separate.
- A canvas now covers the whole close animation, starting before media collapses, and remains until a fresh destination video frame plus two paint opportunities. Resolution upgrades keep their current picture rather than reverting to the silver poster. Closing mid-upgrade holds the existing cover, and new upgrades wait while a close cover is held. Policy/error/disposal still clear covers with bounded cleanup.
- Focus details and controls become hidden when their existing 120ms exit fades complete; the root leaves painting before React unmounts it. This explicitly invalidates retained text layers after paging. Entry remains 120ms/600ms with a 40ms stagger.
- Desktop paging now animates the panel inside a stationary native scroller. Passive content hits that persistent scroller; contributor links retain pointer interactions. The wheel guard recognizes a renewed or reversed finger stroke within an older fling, and idle reset aliases the existing 150ms hover duration. Continuous deceleration and tiny jitter do not rearm it. Mobile swipe tracking remains unchanged.
- Validation: 59 tests, TypeScript, touched-file lint, and production build passed. New real-video WebKit regressions cover poster-loaded/video-delayed skeletons in grid/focus, resolution upgrades and early close, hidden text before collapse completion, held covers through return, and four successive strokes without moving the pointer or waiting for momentum silence. Loading-state coverage passes failures, reduced motion, no JS, pre-hydration images, and preview controls; focus, navigation, WebKit/Chromium paging, mobile swipes, and repeated real-video handoff checks passed. Automated checks verify the coverage/lifecycle; physical Safari black-flash and Apple-trackpad feel still need Liam’s device check.

**New Rewards card master (2026-10-27)**
- Replaced Rewards card media with Liam's new `/Users/liamfennell/Downloads/shop-card.MP4` (source SHA-256 `3e99a5a118c90b971736587e0d4f651276b048f31d3a8f8755e3877452cb4822`). Preserved the tagged SDR 2160px master's 60fps and 27.1-second duration, generating immutable 800/1200/1600px H.264 files under `089ee713120b1620` (1.07/1.98/3.00 MB). Regenerated all responsive posters at the existing 10-second selection.
- Validation: every rendition passed full decode checks; all six CDN hashes match the local report, and byte-range delivery returns 206. WebKit desktop/mobile checks confirmed actual new-source playback, the same video node across focus entry/exit, correct Rewards card content, and poster-only reduced motion. Reviewed the source contact sheet, poster, and focus screenshots. All 58 tests, TypeScript, registry-consumer lint, and production build passed.

**Persistent wheel hit targets (2026-10-27)**
- Liam still reproduced the desktop stationary-pointer failure after the window-listener change. That change only addressed bubbling of delivered events; the original media could still leave the overlay and become inert, and keyed details were still replaced on each project.
- Desktop focused media now lets its persistent media slot receive pointer hit testing. Project details update in place instead of remounting per project, retaining the title/description target nodes. Mobile media hit testing and native touch paging are unchanged, as are the 120ms entry delay, fade, stagger, and wheel momentum guard.
- Expanded check-focus-paging.mjs with actual repeated wheel input at one fixed media coordinate and assertions that the hit target and metadata DOM remain the same across paging. The target-identity regression fails before this change. Added FOCUS_BROWSER=webkit for the desktop checks; mobile CDP touch checks remain Chromium-only.
- Validation: all 58 tests, TypeScript, touched-file lint, and production build passed. Production-build paging checks pass in WebKit 18 and Chromium, including stable targets, repeated forward/backward input without pointer movement, wrapping, momentum, vertical scrolling, reduced motion, and cleanup; Chromium mobile touch checks and desktop/mobile navigation checks also pass. The dev server served stale globals.css during the initial rerun, so final CSS checks used the production build. Native Safari trackpad confirmation remains for Liam; native UI input was unavailable through computer use.

**Stationary-pointer paging and earlier focus text (2026-10-27)**
- Fixed repeated desktop wheel gestures stopping after the first page when the pointer stays still. A wheel transaction can retain its original media target after that media returns to its grid card, outside the focus root. The wheel listener now captures on window for the focus session and is removed on dismissal; gesture thresholds, momentum protection, vertical scrolling, and mobile behavior are unchanged.
- Added a regression that retains the same media target across multiple forward/backward gestures without pointer movement. It failed on the second page before the fix and now passes, including listener cleanup after close.
- Liam approved reducing the initial text delay from 180ms to 120ms. Added a separate focus text-enter-delay token so the media transition remains 180ms; the 600ms fade and 40ms stagger are unchanged.
- Validation: all 58 tests, TypeScript, touched-file lint, production build, and desktop/mobile focus, navigation, and paging browser checks passed.

**Desktop horizontal scroll paging (2026-10-27)**
- Horizontal trackpad/wheel gestures now use the existing focused-project page transition on desktop, including both loop boundaries and displayed project order. Shift+wheel also pages. Horizontal intent uses the existing swipe axis rule and page-frame threshold; pixel, line, and page wheel units are normalized.
- Each wheel stream commits at most one project, including momentum after the animation completes. A new wheel-idle role aliases the existing 300ms motion duration. Vertical gestures, modifier/pinch zoom, and mobile touch paging keep their native/existing behavior. The root listener is removed on dismissal and gesture state resets on resize.
- Validation: all 58 tests, TypeScript, touched-file lint, production build, and desktop/mobile paging browser checks passed. Trusted wheel checks cover jitter, both directions and loop boundaries, continuous momentum beyond animation completion, vertical scrolling, and reduced motion; synthetic checks cover modified/diagonal gestures, Shift+wheel, and line/page units. Existing mobile swipe, media retention, fixed controls, and interrupted-close cleanup checks also passed.

**Staggered focus fades and immediate controls (2026-10-27)**
- Removed the focus-only streamed color glitch and its duplicate text layers. Every text row, including the description, now shares a 600ms opacity fade with the existing focus easing after the media handoff. Rows enter top to bottom at 40ms intervals; aligned rows across the two columns enter together. The existing focus text-enter token now defines the shared duration, and a new stagger role aliases the existing project-label delay.
- P, Close, and N render immediately with no entrance animation. Paging keeps plain text fully visible, reduced motion skips entry motion, and early dismissal preserves partial row opacity before the existing exit fade.
- Validation: all 58 tests, TypeScript, touched-file lint, production build, and desktop/mobile focus, navigation, and swipe/paging browser checks passed. Browser checks verify identical fade durations/easing, ordered delays including the description, immediate controls, reduced motion, interrupted closing, and navigation cleanup. Reviewed the mobile focus screenshot.

**Updated Rewards card video (2026-10-27)**
- Replaced the second project's media with Liam's `shop-card-v2.MP4`, including its revised background. Re-imported the tagged SDR master at the original 60fps and 27.1-second duration into immutable 800/1200/1600px H.264 renditions (about 1.08/1.98/2.99 MB), with fresh responsive posters from the visible card at 10 seconds.
- Validation: all renditions passed full decode checks, all six CDN files match the local SHA-256 reports, and video byte-range delivery passed. Reviewed the new poster and desktop/mobile focus screenshots; browser checks confirmed the new poster URLs in grid/focus, retained project metadata/media identity, clean return to the grid, and poster-only reduced-motion delivery. All 58 tests, TypeScript, registry-consumer lint, and the production build passed. H.264 playback on native devices uses the existing player and remains for device review.

**Close fades with the description (2026-10-27)**
- Removed Close from the streamed color glitch. Its plain, inspectable label and button fade in with the description's existing delay, duration, and easing. Paging keeps the control visible, and reduced motion skips the fade.
- Validation: 58 tests, TypeScript, touched-file lint, production build, and desktop/mobile focus and navigation checks passed. Browser checks compare Close and description fade timing/opacity, confirm Close has no glitch renderer, and cover reduced motion, entry/exit, paging, and keyboard focus.

**Shortcut navigation without control outlines (2026-10-27)**
- P/N and Left/Right Arrow now use a separate shortcut input mode, keeping focus on the active navigation control without drawing its outline. Tab/Shift+Tab and Enter/Space button activation retain the shared keyboard ring. Pointer and swipe navigation remain outline-free; paging behavior and focus restoration are unchanged.
- Validation: 58 tests, TypeScript, touched-file lint, production build, and desktop/mobile navigation checks passed. Expanded the browser checks to verify ring-free shortcuts, restoration via Tab/Shift+Tab, visible feedback after Enter/Space activation, and switching back to a shortcut from keyboard focus.

**Swipe and button project paging (2026-10-27)**
- Added mobile horizontal swipe navigation: left advances and right returns, following the current grid order and wrapping at both ends. A neighboring poster/details page follows the finger. Horizontal intent locks after the existing page-frame slop; short/canceled gestures snap back. Vertical scrolling, pinch zoom, links/buttons, and the outer screen-edge gesture area are left to their native interactions. A captured swipe click cannot accidentally dismiss or reopen a tile.
- P/N buttons and P/N/arrow keys now animate the outgoing and incoming media/details together on desktop and mobile. Added a paging duration role aliased to the existing 300ms motion token, with the existing focus easing; release/snap-back timing scales to remaining travel with the existing handoff minimum. Opening/closing retain their existing media FLIP timing. Backdrop, edge samplers, bottom fade, navigation strip, body lock, and original opener remain stable throughout. New pages start at the top; initial-entry text still streams/fades, while paging text stays fully readable rather than restarting the glitch.
- The outgoing page copies only static metadata and retains the actual media node until its slide finishes, then returns that node to the grid with the existing decoded-frame cover. Media elements are never cloned. Outgoing/peek pages are inert and aria-hidden, copied IDs are removed, and the focus trap skips them. Rapid navigation, resizing, dismissal, and reduced-motion changes cancel/finish transitions and return all media without orphaned pages.
- Validation: 58 tests, TypeScript, touched-file lint, production build, and desktop/mobile focus/navigation/paging browser checks passed. Trusted touch checks cover finger tracking, both swipe directions and loop boundaries, short/canceled drags, native vertical scrolling, edge exclusion, and reduced motion. Paused halfway frames verify paired directional transforms, visible text, actual outgoing media, constant backdrop/control positions, and cleanup on mid-page dismissal. Existing checks cover rapid P/N, keyboard focus, displayed sorting order, native text metrics, and original scroll/focus restoration. Video-handoff and Safari-edge suites also passed during implementation. Reviewed desktop/mobile midpoint and mobile drag screenshots. iPhone Safari gesture feel remains for device confirmation.

**Normal Safari edges and focus flicker handoffs (2026-10-27)**
- Liam confirmed the green/purple diagnostic extends correctly behind Safari controls in all tab layouts on iOS 27.2. Kept the default-off hidden toggle. Normal focus now shares the same opaque, topmost, native-fixed sampler placement with bg-secondary-fill at the top and bg-fill at the bottom. Removed visualViewport positioning/listeners and the redundant inner top surface. The existing background-only large-viewport extension remains. Added Liam's requested short inward white bottom fade, using the existing 44px hit-size role above the solid safe-area strip; it animates with the backdrop and sits behind P/Close/N.
- Focus text no longer swaps from its revealed text node to a second copy through :has/visibility rules at completion. The growing native text node remains the visible final copy, preserving the finite stream, native shaping, and layout reserve. Reveals also wait for fonts. This removes a paint handoff that could contribute to the reported flicker without restoring per-character final positioning or changing type tokens.
- Returning video temporarily retains its current decoded frame in a display-only canvas while the video changes compositing parents. The cover clears after a fresh frame callback plus a paint opportunity, or on policy/source release, error, blocked playback, or disposal, with a bounded watchdog. Normal pauses retain frame-ready status instead of switching immediately to a differently timed poster. The same video/source/playhead and existing decoder/load limits remain. This addresses likely handoff sources; intermittent native Safari flashes were not reproduced in Chromium and need phone confirmation.
- Validation: 55 tests, TypeScript, touched-file lint, production build, desktop/mobile focus, navigation, loading, and edge diagnostics passed. Focus checks assert one visible text-node identity through settle and plain-text-equivalent kerning, stable settled copy, native edge anchoring independent of mocked visualViewport changes, and synchronized bottom fade timing. New check-focus-video-handoff.mjs deliberately holds the next-frame callback, verifies the cover persists through return, then checks presentation removal, repeated exits, no source reload, paused-frame retention, and policy cleanup. Edge checks confirm the normal/debug colors, direct topmost strips, resize/safe areas, and a gradient below clickable controls. Reviewed normal mobile and final native-type screenshots; no new tokens or dependencies.

**Safari edge-color diagnostic (2026-10-27)**
- Liam confirmed iOS 27.2 with Safari's Bottom tab layout. Investigation of Josh Puckett's seamless-mobile-safari post, its live CSS, and linked/current WebKit source found our existing solid samplers sit below the full-screen overlay. WebKit has special color-retention rules for viewport-sized candidates; larger background coverage and a nested scroller do not establish that Safari selected the intended edge. The earlier screenshot's flat lower band measures #f6f8f9, matching media/top surfaces, while document and bottom sampler backgrounds are white. Exact native selection remains unconfirmed.
- Added a default-off **Safari edge test** in the hidden avatar menu. Only during mobile focus, it paints separate opaque green/purple top/bottom fixed strips above the overlay, using existing bg-green-fill/bg-purple-fill roles and the existing 12px/safe-area sizing. They are direct body children, outside animated/blurred ancestors, with no viewport JS or animation. Existing samplers, document colors, theme hint, foreground layout, and normal mode remain unchanged to isolate the diagnostic. Close removes the strips; reload resets the toggle.
- Validation: 55 tests, TypeScript, touched-file lint, production build, and normal desktop/mobile focus checks passed. New check-safari-edge-test.mjs verifies toggle/default/reset, direct topmost layers, exact colors, opacity/absence of blur or animation, pointer pass-through, safe-area sizes, scroll/resize, P/N navigation, cleanup, and unchanged white fallback colors; desktop strips stay hidden. Reviewed the mobile diagnostic screenshot. Chromium verifies web layers only; native iOS 27.2 toolbar colors require Liam's expanded/collapsed/re-expanded observations.

**Navigation control focus (2026-10-27)**
- P/N clicks and navigation shortcuts now explicitly focus the corresponding navigation control instead of leaving Close active. Pointer navigation suppresses action outlines; keyboard navigation retains the shared ring on P/N. Input-mode handlers own the active mode throughout the focus session rather than letting project renders rewrite it.
- Validation: 55 tests, TypeScript, touched-file lint, production build, and desktop/mobile focus and navigation browser checks passed. Added assertions for pointer outlines, keyboard rings on the correct control, keyboard-to-pointer changes, and clicks with native mouse focus suppressed to exercise Safari-style behavior.

**Focus keyboard navigation (2026-10-27)**
- Added Left Arrow alongside P for previous project and Right Arrow alongside N for next. All four keys use the same wrapping displayed-grid navigation while focused view is open. Alt/Ctrl/Command combinations retain browser behavior; accessible shortcut metadata lists both alternatives.
- Validation: 55 tests, TypeScript, touched-file lint, production build, and desktop/mobile navigation browser checks passed, including arrow-key wrap boundaries and modified-key exclusions.

**Expanded focus content and looping navigation (2026-10-27)**
- Implemented Figma 502:2452 and the P/Close/N strip at 502:2457. Added a bodySerif description and side-by-side Contributors/Tech columns. Every current project shares the supplied placeholder description and Swift/UIKit/Metal stack; existing titles, dates, media, and contributor links remain project-specific. Description, tech, and contributors are optional and empty sections are omitted.
- The description stays plain text and fades over the duration of the longest streamed label, starting with the media handoff. Metadata retains the finite native-kerning reveal. Added focus roles for the 500px/361px description measures, 36px desktop section rhythm (32px mobile via existing spacing), 35px P/N visuals, and the existing 4px gap. Named type styles remain unchanged, using 20px/18px body leading instead of the mocks' fractional 1.35 leading. Kept the previously requested 92% white and 10px blur.
- P/N buttons and unmodified keyboard keys loop through the displayed grid order in either direction, including Recent/Random. Navigation swaps media in place using the existing 180ms timing, retains the overlay, page lock, edge samplers, and control DOM, returns old media to its source, resets focused content scroll, and announces project position. Closing restores the original opener and page position. The control strip stays 24px/44px above the mobile/desktop safe-area bottom; mobile content scrolls far enough to clear every metadata row above it.
- Split focus-session setup/cleanup from per-project media transitions so navigation does not unlock/relock the page. Preserved pointer/keyboard focus rings, trapping, reduced motion, existing media elements/playheads, early dismissal, and skeleton preview.
- Validation: 55 tests, TypeScript, touched-file lint, production build, full focus/loading browser regressions, and new desktop/mobile navigation checks passed. Checked both wrap boundaries, keyboard shortcuts, sorted order, rapid changes, zero page-lock mutations during navigation, media-node reuse/return, focus/scroll restoration, description fade/plain copy, responsive columns/measure/gaps, and reachable mobile content at a 650px viewport. Reviewed desktop/mobile screenshots against the Figma renders. Updated backdrop-click and tab-order checks for the new content/controls. Native Safari toolbar collapse/tint remains a device check; scrollability is not a guaranteed fix for native browser chrome.

**Native focus typography restored (2026-10-27)**
- The previous flicker fix positioned every glyph separately. Liam's screenshot exposed distorted spacing despite those measured positions; that approach is removed. Resolved letters now grow in one native text run, with only the active glitch frontier wrapped in colored inline spans. After the reveal, the untouched original text copy becomes visible and the decorative layer is hidden. Reduced motion shows that same normal copy immediately. Font size, weight, family, and tracking tokens are unchanged.
- Kept the finite reveal, no accidental random matches, media-completion handoff, and cancellation on dismissal. Settled text cannot restart on a parent update. The stationary grid mark, 92% white / 10px blur, and pointer/keyboard Close focus behavior remain.
- Validation: 53 tests, TypeScript, touched-file lint, production build, and desktop/mobile focus checks passed. Replaced the per-glyph-position assertion with checks for a visible native text node, matching font styles and character advances against a plain-text reference, and a hidden decorative layer. Monotonic prefixes, repeated entry, post-settle stability, reduced motion, grid stability, and pointer/keyboard focus remain covered.

**Close outline on first pointer open (2026-10-27)**
- Opening a project now records whether the activation came from a pointer or keyboard/assistive click. Close retains automatic focus and the focus trap, while its outline uses the shared ring token only in keyboard mode. This avoids Safari's first programmatic-focus outline after a click/tap without removing keyboard feedback. Tab/other keys switch to keyboard mode; pointer interaction switches back.
- Pointer tracking uses a native capture listener because temporarily reparented project media retains its original React event ancestry. The listener is removed on dismissal.
- Validation: 53 tests, TypeScript, touched-file lint, production build, and desktop/mobile focus checks passed. Added assertions for a ring-free pointer open after page navigation, a visible Close ring after Tab/Shift+Tab or a keyboard open after reload, and removal when interacting with the media by pointer. The reload keyboard check waits for hydration before sending Enter. Focus trapping, restoration, and dismissal remain covered. Native Safari still needs device confirmation.

**Stable focus text and grid mark (2026-10-27)**
- Introduced a finite left-to-right reveal that shares the card effect's speed and character range, waits for the real media handoff, and prevents settled text from restarting. Its initial attempt to position glyphs individually was later rejected because it distorted native typography; see the restoration above. Random-match prevention and early-dismissal cleanup remain.
- Replaced the grid mark's remaining desktop Motion layout projection with a normal span, matching the static mobile mark. Label scrambles and palette flashes remain; body scroll locking/restoration can no longer trigger an independent square projection.
- Updated focus tokens to 92% white and 10px blur. All 53 tests, TypeScript, touched-file lint, production build, and desktop/mobile focus/loading browser checks passed. Checks verify settled letters never change (including after repeated entry and parent updates), active character positions stay fixed, the square has no transform or relative drift through entry/exit, and the updated backdrop values. Reviewed final text rendering and checked loading/skeleton previews alongside the focus changes. Physical Safari rendering still needs device confirmation.

**Hidden skeleton preview (2026-10-27)**
- Added a default-off **Skeleton preview** toggle behind the profile photo. It forces the existing skeletons over loaded project media, the profile photo, album art, and dynamic music/weather fields until switched off. It also follows media into the focused view. Refresh resets it, and reduced motion still removes the sweep.
- Actual fetch/load state stays independent: switching off reveals current content immediately, and media nodes remain mounted. Real skeletons remain behind loading images; only the explicit preview layer paints above already loaded media. Idle text wrappers stay inline to preserve the normal layout.
- Validation: 53 tests, TypeScript, touched-file lint, production build, and the full loading-state browser suite passed. Desktop/mobile preview checks cover toggle state, forced loaded-media/text placeholders, focused media, reduced motion, media-node identity, restoration, and reload reset. The initial inspector-preview test needed to wait for inspector hydration before targeting its remounted content; no product change was needed for that test race.

**Shared skeleton loading states (2026-10-27)**
- Added a subtle 1.6-second gray/white sweep for pending project posters and images, profile photos, initial album artwork, and initial track/time/weather text gaps. Available page content and cached music remain visible. Posters replace skeletons as soon as loaded and stay visible until a decoded video frame is presented; buffering does not restart the loader. Placeholder projects without assets remain static.
- Shared Skeleton/SkeletonText components use semantic fill aliases and new skeleton duration/line-height roles; the sweep waits the existing 150ms hover interval before starting. Image load/error and cached-completion handling stop loading states. Reduced motion uses a static fill, and a no-script override leaves available images and fallback copy visible. Existing artwork stays in place while its replacement loads. Retaining the decoded URL from the load event fixed an artwork-swap timing issue exposed by the extra loading-state render.
- Validation: 53 tests, TypeScript, touched-file lint, production build, desktop/mobile delayed-image/data checks, failures, reduced motion, no-JS, and pre-hydration image completion passed. Verified stable card dimensions, cached song text, old artwork during refresh, successful artwork swaps, and zero video requests in no-JS/reduced-motion checks. The full desktop/mobile focus regression passed on rerun after one sampled color-duration failure; that headless timing assertion is unchanged.

**Rewards card project (2026-10-27)**
- The second Featured tile now uses Liam's `shop-card.MP4`, titled **Rewards card**, Shop, Q4 26. Team is Julian Kelly, Max Kaplun, and Ben Parker, each linked to the supplied X account. Recent sorting uses Q4 2026; the remaining placeholders and first project retain their existing content.
- Imported the 2160px square, 27.1-second SDR master through the versioned media workflow, preserving 60fps in validated 800/1200/1600px H.264 renditions (about 1.08/2.00/3.03 MB). Uploaded all renditions and responsive posters to Blob. The poster uses the visible card at 10 seconds because the opening frame is empty. Generated files remain outside Git; the registry stores immutable public URLs.
- Validation: 53 tests, TypeScript, touched-file lint, production build, full decode checks, and CDN byte-range delivery passed. Desktop/mobile focus checks verified Featured position, video identity, title/date, all three team links, real poster loading, and reduced-motion poster-only delivery. Reviewed both focused layouts. Browser motion checks use the supported-codec fixture because this Chromium cannot decode H.264; actual device playback remains to be reviewed. Corrected the browser assertion to measure visible text/media overlap rather than hidden glyph updates just before the fade, after two failures exposed that timing-sensitive check.

**Updated profile photo (2026-10-26)**
- Replaced the profile photo with Liam's latest `profile-v3.jpg`, keeping the original 2048px JPEG in `public/images/profile/headshot.jpg` and serving a 384px quality-95 WebP directly. The new `headshot-v2-384.webp` URL avoids stale cached photos. Removed the previous source and rendition from the profile folder.
- Validation: source matches the attachment byte-for-byte, reviewed the generated rendition, and confirmed the production HTML uses the new image URL. All 53 tests, TypeScript, touched-file lint, and production build passed.

**Swarm masks on non-selectable content**
- The recent user-select:none rules interfere with custom-highlight painting in the Spotify bar, footer, and selected sort/grid controls. While a swarm owns its highlight stylesheet, those containers temporarily use user-select:text; the existing selectstart guard still prevents manual selection throughout entry, floating, and return.
- Removing the swarm stylesheet restores the normal non-selectable state. Text content, layout, floating-letter counts, hover donations, and return timing are unchanged.
- Validation: 53 tests, TypeScript, touched-file lint, production build, and diff checks pass. Development/production Chromium checks at 1440px and 390px verified highlight painting in all four regions, cancellation of manual selection during the swarm, and non-selectable styling/normal intro selection after cleanup. Native Safari rendering still requires device confirmation.

**Project focus is the default (2026-10-25)**
- Project clicks/taps now open the focused view on every page load, including when the developer inspector is disabled. The avatar menu now offers a default-off **Inline project expansion** toggle for the previous behavior: mobile tiles expand in the grid and desktop keeps hover previews.
- Validation: all 53 tests, TypeScript, touched-file lint, and production build passed. Desktop/mobile browser checks verified the toggle in both directions, a fresh load with the inspector disabled, and the existing focus animations, media continuity, accessibility, dismissal, and reduced-motion behavior.

**Focused text streams like card labels (2026-10-25)**
- Replaced the whole-label burst with the desktop preview cards' blank-to-text, one-character-at-a-time reveal and shared scramble timing. All focused labels, including Close, stream left to right after the existing 180ms media movement. Kept forward seeding disabled to prevent stray flashes ahead of the reveal and retained final-text layout reserves and accessible copy.
- Reduced motion still shows final text immediately, and closing before the reveal starts cancels it. Entry/exit geometry, Safari surfaces, and button behavior are unchanged.
- Validation: 53 tests, TypeScript, touched-file lint, production build, and development/production desktop/mobile browser checks passed. All eight labels produced partial left-to-right reveals with non-decreasing visible frontiers, colored frames after media motion, stable reserved lengths, and no second flash during the post-settle observation.

**Gray top band and large-viewport background (2026-10-25)**
- Changed the mobile top sampler and its visible gutter surface to bg-secondary-fill (#f6f8f9). The gutter surface paints above the translucent tint and below the content so it retains the exact requested gray without covering the artwork. Bottom remains bg-fill white.
- Added the runtime `--project-focus-full-height: 100lvh` alias. Background/blur now extend to the larger of the current root height and large viewport height, plus safe-area coverage. The bottom white plane starts just inside the visible bottom and fills the remaining gap through the large viewport and bottom safe area. Media, Close, and the content scroller keep their existing viewport dimensions.
- Validation: 53 tests, TypeScript, touched-file lint, production build, and development/production desktop/mobile checks passed. With a simulated full height of 900px, visible viewport bottoms of 650/820/802px all retained background coverage through 900px without changing document or content scroll heights. A separate 852px → 1100px background extension likewise kept document/content viewport heights at 852px. Verified both top surfaces use #f6f8f9 and bottom stays white. Safari may still exclude native toolbar pixels from DOM painting; this extends the available web background, not a guarantee of native chrome appearance.

**Visible focus-entry color glitch (2026-10-25)**
- The short glitch had mostly finished while text was still fading in. Metadata and Close now wait until the 180ms media movement ends, then fade in over 80ms as their glitch begins. This retains the same 260ms overall entry timing while making the color effect visible after the media settles.
- Tripled the focus-only scramble cycles, retaining the complete-label pass, zero forward seeding, stable replay timer, and single final settle. Closing before the queued effect starts suppresses it. Exit timing and reduced motion are unchanged.
- Validation: 53 tests, TypeScript, touched-file lint, production build, and development/production desktop/mobile browser checks passed. All eight labels showed color for at least 80ms at 75% or greater container opacity, with no color frames during media movement, no shortened/streaming frames, and no second flash during the post-settle observation.

**Safari toolbar states and gradient bleed (2026-10-25)**
- Liam confirmed the previous 5px edge treatment helped with Safari's collapsed controls but left gray bands with the expanded toolbar or sometimes at the top. Its inward white gradients also washed over the media and Close. Removed both gradients and their unused tokens.
- Replaced pseudo-elements with opaque white fixed strips, at least 12px tall, directly under body and outside the overlay's fading/isolation context. They sit behind all focused-view content and do not animate opacity. The mobile media has a 12px-or-safe-area top gutter so the sampler stays clear of the artwork. The 88% backdrop and 8px blur remain separate absolute layers inside the focus view.
- Strip positions now follow visualViewport resize/scroll and window resize, covering both expanded and collapsed browser-control geometry. A temporary theme-color hint uses bg-fill and restores the prior hint on close. All listeners, frames, and sampling elements are cleaned up on dismissal.
- Validation: 53 tests, TypeScript, touched-file lint, production build, and development/production desktop/mobile browser checks passed. Simulated visual viewport heights of 650/820px plus a 12px offset confirmed both strips follow the visible edges, remain opaque, have no gradient pseudo-elements, and stay behind content. Reviewed a mobile screenshot; verified Close colors, theme hint restoration, and edge cleanup. Actual Safari chrome tint remains a device-only confirmation.

**Focus handoff timing and settled text (2026-10-25)**
- Added an 80ms handoff delay: opening media/backdrop move immediately, with metadata and Close beginning their fade/glitch after 80ms. On exit, text fades immediately over 120ms; media and backdrop wait 80ms before the existing 180ms return. Reduced motion skips both delays and transitions. Opening completion now waits for the delayed text as well as the media.
- Focus text now starts from the complete label and glitches the whole label once, with forward seeding disabled. This avoids streaming names and re-flashing letters that appeared settled. A ref keeps the delayed replay callback current without rearming its timer on rerenders; the timer is canceled on unmount.
- Validation: 53 tests, TypeScript, touched-file lint, and the production build passed. Development and production desktop/mobile browser checks verified opening delays, held media while text fades on exit, movement after the delay, no shortened text frames, and no colored mutations during 600ms after settling. Repeated/interrupted exits, reduced motion, media reuse, and focus/scroll restoration passed.

**Close hover and mobile grid mark (2026-10-25)**
- Desktop pointer hover on the focused-view Close button now uses text-primary for its black fill and bg-secondary-fill for its light-gray text, with the existing hover timing. Touch layouts retain their original colors; reduced motion removes the color transition.
- Disabled Motion layout projection for the mobile grid/list square while retaining desktop position animation and the square's palette flashes. This keeps mobile grid reflows and viewport/scroll changes from animating the mark independently along the vertical axis. The existing grid transition and text scramble remain.
- Validation: 53 tests, TypeScript, touched-file lint, and the production build passed. Browser checks confirmed desktop hover colors, unchanged mobile colors, and a constant 5px square-to-control vertical offset with no projection transform across repeated list/grid toggles and scrolling. The original Safari-specific vertical motion was not reproduced in local Chromium; actual phone confirmation remains useful.

**Focus text glitch and Safari viewport edges (2026-10-25)**
- Every focused-view text item now uses the shared color scramble on appearance: company, project title, period, Team, each linked member, and Close. Final-text reserves prevent layout shifts, stable screen-reader text remains available, and reduced motion renders the final copy immediately (also when changed while open).
- Enabled `viewport-fit=cover`, added safe-area environment aliases, and made html/body backgrounds explicitly white. Body content respects safe areas; focused media/Close also stay clear of system insets. The backdrop and blur extend past those edges. The fixed 88% white tint is now separate from the absolute 8px blur layer, with both fading on the existing 180ms timing. This is a targeted Safari toolbar sampling/coverage workaround, not a confirmed diagnosis or device-verified fix for Liam's screenshot. Related WebKit report: https://bugs.webkit.org/show_bug.cgi?id=319479. Safe-area guidance: https://webkit.org/blog/7929/designing-websites-for-iphone-x/.
- Validation: 53 tests, TypeScript, touched-file lint, and production preview build passed. Browser checks observed palette-colored glyphs in all eight text fields, correct final copy, no color glitch with reduced motion, existing open/close behavior, and separate tint/blur layers. Simulated 59px top / 34px bottom insets verified extended backdrop coverage, safe media/Close placement, white root/body backgrounds, and clean dismissal without horizontal overflow. Mobile Safari's native chrome cannot be verified by these simulations and still needs Liam's device check.
- Liam supplied Josh Puckett's https://joshpuckett.me/seamless-mobile-safari guide. Added mobile-only fixed top/bottom pseudo-element strips in the focus portal, outside transformed media: white 12px-or-safe-area strips extend 7px beyond each edge so at least 5px remain visible, with a 48px inward fade. They use bg-fill like the document fallback, fade with the overlay, ignore pointers, and disappear on close. This supplies a solid edge color for Safari to sample; Safari's own controls cannot reproduce the live page blur.
- Rechecked the production build, 53 tests, and full browser flow after adding the strips. Verified their fixed positions, 5px visible area, solid white, 48px fade, pointer pass-through, synchronized overlay animation, and removal on dismissal. Safari chrome appearance still requires a real iPhone check.

**Project focus experiment (2026-10-25)**
- Added the default-off **Project focus** toggle to the avatar's developer menu. With it enabled, desktop clicks and mobile taps open the focused project view from Figma 481:892. The current mobile inline expansion remains the default when disabled.
- Media moves between its tile and a 620px desktop / full-width mobile panel over the existing 180ms grid duration, using cubic-bezier(.65, 0, .35, 1). The 88% white backdrop with 8px blur, metadata, and Close fade on the same timing. The mobile mock's device status-bar space is left to the browser; media begins at the content viewport top. Desktop starts 24px from the top. Close remains fixed 24px/44px above the mobile/desktop viewport bottom.
- Temporarily moves the existing media DOM into the overlay and restores it before unmount, retaining the video element/playhead instead of creating a second player. Video visibility also responds to the overlay's scroll container. Escape, Close, and backdrop dismiss; background interaction and scrolling are locked, keyboard focus stays inside, and dismissal restores scroll and tile focus. Reduced motion skips spatial/fade transitions, including live preference changes.
- Added optional `team: { name, href }[]` project data. Team is omitted entirely when missing or empty, and each member renders a separate external link. Liam requested Annabel Lake, Luke Dupont, and Jon Rundle on all current projects, with every title set to “Product details page” until final work arrives. Annabel and Luke link to their verified Shopify LinkedIn profiles; Jon links to his personal design site.
- Added focus tokens for the new layout, backdrop, easing, and close-control roles; spacing and typography reuse the existing tokens and named text styles.
- Validation: 53 tests, TypeScript, touched-file lint, and the production preview build passed. `scripts/check-project-focus.mjs` checks default-off/on/off behavior, desktop/mobile geometry, synchronized 180ms timing, interrupted/repeated transitions, media-node reuse, backdrop dismissal, focus trapping/restoration, scroll locking, and reduced motion. Production checks also covered a short scrolling viewport, live resizing, and live reduced-motion changes. Reviewed desktop/mobile screenshots against the Figma layout. This Chromium build cannot decode H.264, so playback/playhead continuity used a supported-codec fixture; actual media poster fallback passed, and Safari/device playback remains for confirmation.
- After adding the shared title and credits, repeated the 53 tests, TypeScript, touched-file lint, production build, and desktop/mobile focus checks; verified all three link destinations, title, populated-team spacing, and keyboard traversal through the links.

**Profile asset cleanup (2026-10-25)**
- The current photo now lives in `public/images/profile/`: `headshot.png` is the full-resolution source and `headshot-384.webp` is the quality-95 image served directly by the homepage. Both files were moved without re-encoding. Removed all six superseded profile assets, including `public/profile.JPG`; earlier filenames below are historical. Future profile assets belong in this folder.
- Validation: both moved files match their previous bytes, the new component path resolves, and no runtime references to old profile paths remain. All 51 tests, TypeScript, touched-file lint, and production build passed.

**Latest headshot replacement (2026-10-25)**
- Swapped in Liam's new 2048px `profile-v3.png` attachment, saved as `public/images/profile-v5.png` to distinguish it from the older repository asset. The homepage uses `profile-v5-384.webp` with the same 384px, quality-95 direct delivery, supplied square framing, and existing display dimensions. New asset URLs avoid stale cached photos.
- Validation: source checksum matches the attachment, reviewed the generated 384px image (20,646 bytes), and 51 tests, TypeScript, touched-file lint, and production build passed.

**Headshot background replacement (2026-10-25)**
- Replaced the avatar with Liam's supplied `Headshot-bg.png`, saved as `public/images/profile-v4.png`. The new `profile-v4-384.webp` uses the same 384px, quality-95 direct delivery, preserving the sharper image setup, supplied framing, and existing desktop/mobile dimensions. New asset paths avoid the previous photo's cache.
- Validation: source checksum matches the attachment, reviewed the generated 384px image (19,710 bytes), and 51 tests, TypeScript, touched-file lint, and production build passed.

**Avatar image quality (2026-10-25)**
- The display-sized optimized headshot looked soft when zoomed on a phone. Added a 384px WebP at quality 95 (19,956 bytes), derived from the original PNG, and serve it directly without another optimizer resize/compression pass. This retains more detail for high-density screens and pinch zoom while preserving the existing framing and 28px/24px layout. The original PNG remains the source.
- Validation: 51 tests, TypeScript, touched-file lint, and production build passed. Production Chromium checks confirmed the full 384px source on desktop DPR 2 and mobile DPR 3, including 4× page zoom; reviewed the zoomed screenshot. Actual Safari rendering remains for device confirmation.

**New profile photo (2026-10-25)**
- Added Liam's supplied square headshot as `public/images/profile-v3.png` and switched the homepage avatar to it. Removed the old full-body photo's zoom/offset crop so the supplied framing fills the existing 28px desktop / 24px mobile avatar. Responsive image sizes now match those display dimensions.
- Validation: 51 tests, TypeScript, touched-file lint, and production build passed. Production browser checks at 1440px and 390px confirmed the new optimized image loads square, fills the avatar without offsets, and retains its existing dimensions and button.

**Avatar link removed**
- Replaced the avatar's Shop link with a button, preserving the inspector menu trigger and existing desktop/mobile dimensions. The new headshot was added on 2026-10-25 (above).
- Validation: 51 tests, TypeScript, touched-file lint, and production build passed. Local browser checks confirmed no outbound link, unchanged 28px/24px dimensions, and working inspector toggles at desktop/mobile widths.

**Menu/footer selection and reference-site research**
- Disabled text selection on both work-menu containers (selected controls and dropdown options) and the footer. Image-tile native callouts remain enabled; intro text remains selectable.
- Inspected mariajosemunita.co without changing our media behavior. Cargo renders a normal MP4 video with a separate AVIF/JPEG poster above it. During playback the poster has opacity 0, z-index 2, and pointer-events auto; hit testing still targets that image. This supports a native image callout for the static poster, rather than a capture of the current frame. Actual iOS menu presentation was not tested here.
- Validation: 51 tests, TypeScript, production build, and diff checks passed. Local browser checks verified the controls, revealed desktop options, and footer are unselectable; intro selection and the uncancelled image-tile context-menu path remain intact. Mobile expansion and globe entry/exit still work.

**Long-press behavior simplified**
- Removed the custom media menu, hold timers/gesture interception, keyboard menu shortcut, menu-only tokens/styles, and menu-specific swarm exclusion.
- Project tiles still suppress text selection. Native callouts are disabled for video/blank tiles and globe/exit controls. The Spotify bar also disables text selection; its normal link behavior is retained.
- Image tiles explicitly retain the browser’s default image callout and image hit testing. A media-kind data attribute scopes the exception, and no context-menu handler cancels image actions. Video posters remain inside their non-interactive wrapper and do not receive the image exception.
- Normal mobile tap expansion, desktop hover, viewport/PiP guards, and the video-edge mask remain in place. The intro and other page copy remain selectable.
- Verified production mobile holds/taps, no custom dialog or media navigation, globe entry/exit, scoped selection styles, and a server-rendered image fixture whose image receives hit tests and uncancelled context-menu events. Actual iOS menu contents remain browser-controlled. All 51 tests, TypeScript, touched-file lint, and the production build pass.

**Mobile viewport scale guard**
- After the native-video callout regression, Liam reported a refreshed page rendering at roughly quarter scale with an apparent collapsed PiP tab on the right. Fresh Chromium mobile audits at 375/390/393/430px showed matching layout/document/visual widths, scale 1, and no horizontal overflow, so the screenshot’s native Safari state was not reproduced locally.
- Exported an explicit device-width viewport with initialScale 1 and minimumScale 1. It defines a zoom-out floor while leaving maximum scale/user scaling unrestricted. Inline project previews opt out of picture-in-picture where the browser supports the flag. This does not forcibly reset a user’s active zoom or close an already-running native player.
- Inline playback and the video-edge mask remain. The in-page hold menu was subsequently removed. Actual Safari recovery from the old viewer state still requires Liam’s device confirmation; a fresh tab helps distinguish retained native state from the document layout.

**In-page media menu experiment (removed)**
- The direct-video-link approach triggered Safari’s fullscreen viewer before showing useful options, and Liam reported the page returning at the wrong zoom. Media tiles are buttons again, native media hit testing/callouts are suppressed, and no viewport or pinch-zoom restrictions are added. The video-edge mask is retained.
- A stationary touch/pen hold opens a small in-page modal. Movement, pointer cancellation, a second touch, or release cancels the pending hold. The release after a completed hold does not expand the tile; a new ordinary tap still does. Right-click and Shift+F10 also open the menu; Cancel, outside tap, and Escape dismiss it.
- Copy media link is always available. Where supported, the menu prepares the actual file before the user presses Share / Save, preserving iOS user activation for the native share sheet. Unsupported/failed file preparation falls back to Share link; the browser/OS decides which save targets the share sheet offers. Preparation is canceled on close and does not launch the media viewer.
- Added dedicated menu tokens for the 500ms hold, 8px movement cancellation, 320px panel width, and 44px action targets; existing roles did not cover these interactions. Menu text uses captionSans and existing color/spacing tokens.
- Validation: 51 tests, TypeScript, touched-file lint, and production build passed. Chromium mobile touch emulation verified real held touches, short taps, scroll cancellation, menu dismissal, stable URL/viewport scale, file sharing with fresh user activation, and copying; desktop Shift+F10/Escape passed. Native sharing was mocked in automation; actual iPhone confirmation remains necessary.

**Native media long-press attempt (replaced)**
- Tried real links to the original media URL. Ordinary taps still toggle mobile expansion; desktop hover/click behavior is retained, and modified link clicks can open the media. Blank placeholders remain buttons.
- Removed pointer-event suppression on the video wrapper, disabled tile text selection, and left the browser's touch callout/context-menu event enabled. The video coordinator recognizes both link and button intent targets. The explicit mask for the reported Safari edge artifact remains in place.
- Browser/iOS controls the menu and preview. Link actions commonly include open/copy/share, with download/image actions where supported; no custom menu items or guaranteed Save Video action. Actual iOS native-callout appearance needs device confirmation.

**Video edge artifact investigation**
- Liam reports the explicit-mask change appears to have fixed the artifact on his screen. He supplied a phone photo of a thin top/right video edge that disappears in screenshots. The video/poster have no CSS border, outline, or shadow; playback coordination does not modify those properties.
- Checked the outer two pixels of the top/right edges in every decoded frame of all three current renditions (800/1200/1600px, 887 frames each): channel values stay between 241 and 245, with no encoded dark line.
- Added an explicit opaque alpha mask to the media wrapper, in addition to overflow clipping, to constrain independently composited video surfaces. It uses the existing bg-fill token and does not change media geometry, source files, frame rate, layout animation, or playback policy. This is a targeted compositor workaround, not a confirmed diagnosis of the affected Mac/display path.
- Local production Chromium checks passed at 1441px DPR 1/2 and 390px DPR 2: decoded playback advances, video/wrapper bounds match through grid changes and fractional scrolling, sampled rendered top/right edges remain clean, and reduced-motion poster fallback works. All 51 tests, TypeScript, and the production build pass.
- The screen-only artifact cannot be reproduced or verified with these headless screenshots. Actual Safari/Mac confirmation remains necessary; do not claim the reported border is definitively fixed based on the local checks.

**Video foundation and source frame rate (2026-10-24)**
- Rebuilt grid playback around shared visibility/resize observers and a coordinator: two initial load slots, four desktop/two mobile playback slots, intent priority, deferred sources, 15-second idle release, hidden-page cleanup, and bounded failure recovery. Reduced motion and data-saving leave images only. A real poster covers the video until a decoded frame is presented; exact media bounds replace the negative inset and video opacity switch. The old one-time `use-video-rendition` hook (and its known lint issue) is retired as part of the rewrite.
- `media:import` preserves the master frame rate by default, including 60 and fractional 59.94fps. It generates H.264 rungs and responsive posters, checks complete decode/dimensions/rate/duration/audio, uploads immutable content-versioned files, and atomically writes `src/lib/imported-media.json`. AV1 is an optional export; grid playback establishes H.264 as the baseline. Re-import verified to skip encoding and uploads. See `docs/media-workflow.md` for incoming clips and options.
- Re-imported the current 2160px/60fps master at 800/1200/1600px, still 60fps: about 1.17/1.80/2.28 MB for 14.78 seconds. The old 30fps/reel files remain available for existing capture work.
- Added development-only `/dev/video-lab` and `scripts/check-video-grid.mjs`: twelve independent URLs for copies of the current clip. WebKit 18 checks passed at desktop/mobile DPR 2 for budgets, priority, upgrades, source release, simulated background/foreground, live reduced-motion changes, clean sampled top edges at fractional scroll positions, and poster fallbacks. Reduced-motion, save-data, and JavaScript-disabled modes requested zero video bytes; blocked playback and failed files stopped retrying. First-frame observations in the local dev fixture were about 1.6s desktop / 0.6s mobile, not production/device guarantees.
- Validation: 51 tests, TypeScript, touched-file lint, production build, production-mode playback, and the development lab’s production 404 passed. A real 59.94fps encode also retained 60000/1001.
- Current macOS Safari WebDriver is unavailable because Remote Automation is disabled; its settings were left alone. Current Safari/iPhone testing and the actual mix of forthcoming clips remain validation steps. WebKit tests do not prove the reported Safari seam is fixed on Liam's device.

**Desktop bottom spacing toggle (2026-10-23)**
- Added “Extra bottom space” to the avatar's inspector menu on desktop. The toggled page bottom padding is 32px (reduced from the initial 56px), giving 48px below the footer content instead of 24px. It starts off on each page load and leaves mobile spacing unchanged. The toggled value derives from the existing content-padding token; no new tokens.

**Work reel video (2026-10-24, chosen version)**
- Storyboard: Figma 442:1405. `/og/reel` (dev only) plays the chosen version: from the plain name, the letters glitch out of their places in a random order (40ms apart, with ticks); once about half are gone the work grid slides up from below on an accelerate-then-decelerate curve (cubic-bezier 0.65, 0, 0.35, 1). It drifts, ramps up from about midway with vertical motion blur to a peak 80% of the way through, eases down to 45% of that peak, and slides off at that speed, so the exit reads as a slide rather than a vanish; as it nearly clears, the letters glitch back into their places the same way, settling to black. About 7.4s (16:9) and 7.5s (9:16), seamless.
- 16:9: two columns of the storyboard's 469px blocks moving in opposite directions, the left up from below and the right down from above, each carrying six projects. 9:16: one column of twelve 8px from each side, the same as the gap. 8px gaps both ways; rows that leave come round again. The sides bow slightly inward toward the top and bottom in one rounded arc, growing with the square of the distance from the middle. The grid is painted onto one full-density canvas a pixel row at a time, each row squeezed toward the middle with smoothed sampling; an SVG displacement filter did this at first but samples unsmoothed and at 1x, so the tiles came out soft and stair-stepped. The vertical motion blur is an SVG filter on the canvas, on only while it is moving fast.
- Tiles are `--bg-secondary-fill` placeholders, or with `?tiles=video` the Shop product-page prototype (`REEL_VIDEO` in `og-card.tsx`, from the local `public/media/shop/preview-01-*`) (AV1 where the browser plays it; the capture's Chromium has no H.264), drawn into each tile from one video; under the capture it is seeked to each frame's time, so it stays frame-exact. The same frame shows in every tile.
- Margins option (`?margin=<px>`, capture `--tight` for 8): the tiles grow to fill the card but for that much at each side. Chosen: 8px on 9:16 (now its default); 16:9 keeps the storyboard's 469px blocks (588px at 8px was too big).
- Other versions, still reachable: `?exit=burst` throws the letters off the card instead (accelerating out; `?return=glitch` glitches them back in place, otherwise they float home and land in reading order), and `?columns=rows` moves the grid as rows.
- Code: `away` mode in `src/lib/og-burst.ts` (for the burst versions), the grid in `src/lib/og-reel.ts` (pure timing tested in `tests/og-reel.test.mjs`), the glitch in and out in `src/components/og-card.tsx`. `node scripts/capture-og.mjs <url> 7 --reel [--video]` writes `out/share/office-of-liam-fennell-reel[-video]-{16x9,9x16}.{mp4,png}` (other versions: `--burst`, `--glitch-return`, `--rows`); `node scripts/sound-og.mjs --reel [--video]` adds the glitch ticks only (other sounds to come once the visuals are settled).
- Tried: a flat grid that tipped more the faster it went and was sucked into the centre to exit; springy pop-ins; a 3D wheel (its rows tilted back and the gaps between them opened up); a warp only near the edges (bent at a corner); 60px margins on 9:16 (too much space at the sides); accelerating right through the exit (the grid seemed to disappear).

**Project video replacement (2026-10-24)**
- Replaced the homepage's basket tile with Liam's supplied Shop product-page clip. Reused the existing 800/1200/1600 AV1/H.264 renditions and poster after comparing frames against the supplied master. This asset uses absolute public Blob URLs so previews can load it even without `NEXT_PUBLIC_MEDIA_BASE_URL`; the old basket assets remain registered.
- Verified public rendition/poster availability, real desktop/mobile playback from Blob, reduced-motion posters, 46 tests, TypeScript, and touched-file lint.

**Earlier project video attempt (2026-10-24, reverted)**
- Tried replacing the homepage's one project video (shop-01) with a Shop app product-page prototype (`public/media/shop/preview-01-*`, AV1 and H.264 at 800/1200/1600, uploaded to the Blob store), plus a fallback so deployed builds without `NEXT_PUBLIC_MEDIA_BASE_URL` read the store. It still didn't show on Liam's preview, so both commits are reverted; Liam is redoing it in Codex. The preview-01 files remain in the store, unreferenced. Likely cause worth checking: the variable isn't set for Vercel's Preview environment, so previews ask their own domain for the gitignored media.

**Favicon (2026-10-28)**
- Liam's serif "LF" mark on white: `public/images/meta/favicon-lf-{32,180,192}.png`. Supplied as a 192px PNG; the 32 and 180 sizes are lanczos downscales (ffmpeg).
- Before that (2026-10-23), the footer globe below.

**Favicon, globe version (2026-10-23, replaced)**
- The footer globe at rest, mid-glitch (a teal @, a pink y, and a violet % lit), its glyphs spanning 80% of the square on white: `public/images/meta/favicon-globe-{32,180,192}.png`. Captured from the real component on `/og/favicon` (dev only) by `node scripts/capture-favicon.mjs <url>`, which fits the globe, saves frames while a glitch is under way (3+ glyphs lit; the glitch ripples a few at a time), and writes a choosing sheet to `out/favicon/sheet.png`; `--pick <n>` writes the icons from a 1024px master (captured at 2×). The favicon card turns off the glyphs' `will-change: transform`, which otherwise makes Chrome raster them at their tiny layout size and stretch the bitmap, so the first capture was blurry.
- Tried: a seeded scatter of five tilted burst glyphs (commit 824472d), then Liam's "O LF" mark (`favicon-olf-*.png`). The olf and globe files are still in the repo, no longer referenced.

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
