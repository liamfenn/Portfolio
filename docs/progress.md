# Progress and goals

Last updated 2026-11-05. Branch: `portfolio-v4-redesign`. Update this file when something ships, gets
decided, or gets dropped.

## Where things stand

Raw design-thesis conversations, prompts, and drafts are saved in [`design-thesis-raw.md`](design-thesis-raw.md) for later editing.

The v3 homepage is built and live on the branch preview (see [`workflow.md`](workflow.md)). `main` (and
production) is still the August version. Merging is Liam's call.

**Two project views and a morphing header (2026-11-05)**
- The feed now uses the previous branch's `HomepageCard` with two debug modes: Card overlay (white blurred panel with credits in the tile) and Focused view. Inline details and the `[i]` squares are gone, along with their assets and tokens.
- Focused view follows Figma 597:24279 on the existing `ProjectFocus`, so it keeps continuous video, page lock, and Safari edge samplers: an opaque white modal, 720px media flush to the top, and description plus Contributors and Tech below. Tapping anywhere except a link closes it on desktop and mobile. There are no visible controls for pointer users; P, Close, and N show only after keyboard input. Swipes, wheel paging, and arrow keys still page between projects.
- Instead of a separate bar, the header morphs on open as Liam asked: name, then Contact, color-glitch into company and date, the project name glitches in, the avatar leaves, and the bar goes translucent at 696px on desktop. It reverses as the view starts closing. The header ignores scroll changes while the page is locked, so it can't flicker through other states. Removed the bottom gradient fade, which Figma omits.

**No on-screen project controls (2026-11-05)**
- Rejected: showing P, Close, and N after keyboard input, since any key press made them appear over the content. They and the P and N shortcuts are gone from Focused view. Left and Right Arrow, Escape, tapping, and mobile swipes remain, and a visually hidden Close button stays for screen readers. `/process` keeps its own Close, which shares those styles.

**Focused view as default, collapse, and swipe down (2026-11-05)**
- Focused view is now the default project mode; the debug toggle and `?projects=overlay` still reach Card overlay.
- When paging leaves the project's tile mostly off screen (under 25% visible), exit shrinks the media to 96% and fades it in place, because a flight back read as a snap. The page keeps its original scroll position.
- On mobile, a downward swipe of at least 64px exits if it starts with the view scrolled to the top and is mostly vertical. It uses touch events because native vertical scrolling cancels pointer events, and it fires on release with no drag tracking.

**Immediate focused view exit (2026-11-05)**
- Rejected: exiting in sequence (controls, then text, then media), which left about 440ms between the tap and the media moving. Backdrop and media now start on the tap and finish in 180ms, and the text disappears instantly. Fading the text, even over 80ms with the media raised above it, still read as overlapping the returning image. This drops the earlier wait for text to clear first, which guarded against Safari retaining glyphs after paging, so recheck exits after swiping between projects. `scripts/check-focus-exit-order.mjs`, `check-project-focus.mjs`, and `check-focus-video-continuity.mjs` still wait on the old `data-exit` stages and need updating before their next use.

**Player marquee right fade (2026-11-05)**
- The right fade now hides while the marquee rests fully scrolled left, using the same animation as the v3 player, which was missed when the player was rebuilt.

**Focused view type (2026-11-05)**
- All Focused view text is now bodySans or bodySerif, including the Contributors and Tech headings, which were captionSans in Figma. The company and project name in the header sit 12px apart instead of 3px. Card overlay keeps its caption credits.

**Contact stack, focused view links (2026-11-05)**
- The email and social links each take their own line at half the container's width, 2px apart. The gap reuses `--project-info-gap`.
- Contributor links in the focused view no longer dim on hover, matching other links. The view is portaled outside `main`, so it missed the rule that cancels the dim during the glitch.
- The focused view's "Tech" heading now reads "Stack", the same as the card overlay.

**Player artist gap (2026-11-05)**
- The song and artist in the music player sit 6px apart (`--player-artist-gap`, a new token, since the 3px control gap it borrowed no longer fit).

**Focused view bottom margin (2026-11-05)**
- On desktop, the focused view ends with the page's 60px bottom margin (`--portfolio-bottom`) instead of 32px. Mobile is unchanged.

**Inspector in the focused view, reverted (2026-11-05)**
- The design inspector ran in the focused view for one debugging pass, then came back out once Liam had checked what he needed. Its shortcuts are ignored there again and Escape closes the view. If it returns, `ef27f4e` has the change. Its label reported the project name as `text-primary` while the name rendered as `text-secondary`; the rendered color is correct.

**Focused view overscroll (2026-11-05)**
- On a short screen, a hard scroll made the text jump. The likely cause is overscroll bounce: the media is positioned separately from the scrolling content to keep its video playing, so only the text bounced. Set `overscroll-behavior: none` on the focused view's scroller. Liam confirmed on a device that the jump is gone.
- A bounce on desktop would be fine, since the homepage has one, as long as the text doesn't move on its own. A native bounce on this scroller moves only the text, so it stays off.

**One published order, reorder editor removed, flash fix (2026-11-05)**
- Removed the Reorder Featured debug tool and browser-saved orders, since order changes are now published directly. Also deleted the unused previous grid (`project-work.tsx`), which was the only other user of that plumbing; it's in git history. The Recent and Random control and the Focused view / Card overlay debug toggle both stay. (The control was briefly removed after a misread of "remove the toggle".)
- Recent shows `featured-order.json` exactly, not a date sort; Random shuffles it, still subject to the top and bottom stacking tags. A project the order doesn't name slots in by date, before the first older project and after others from its quarter. Unfilled placeholder IDs came out of the JSON so filling one later places it by date.
- On desktop, the scrolled header is now 504px and the focused view header 672px, 48px narrower than their columns and still centered (`--header-narrow-inset`). Mobile is unchanged.
- Liam saw brief black flashes on some previews when switching to Random. Sorting moved some tiles in the DOM, and moving a playing video can repaint black. Tiles now keep their DOM position in Recent order and sorting only changes CSS `order`. Tab order therefore follows Recent order while Random is showing.

**Overlay labels on click (2026-11-05)**
- In Card overlay, the corner company and date labels no longer appear on desktop hover or keyboard focus; they color-glitch in with the panel on click. Focused view tiles have no hover labels either, so previews have no hover state in either mode.

**Featured order update (2026-11-05)**
- Published Liam's exported order: Top search, Shop card, Bottom search, Shop Incentives, Canvas, Baskets, Collections sheet.

**Shop sculpture removed (2026-11-05)**
- Rejected: the long-hover Shop glyph sculpture. Liam asked to remove it everywhere, so its trigger, swarm branches, `glyph-shop.ts`, tests, check script, and `--glyph-shop-*` tokens are gone. It's in git history before this commit if it's ever wanted again. The ordinary swarm is unchanged.

**Mobile bottom margin (2026-11-05)**
- The page's bottom padding on mobile is now 32px, matching the mobile section gap; desktop stays 60px.

**Side entry for the swarm (2026-11-05)**
- Letters scrolled out of view can now enter at a random height on a random side instead of the nearest edge, which sent the intro's letters through the top. All do on mobile and about 40% do on desktop, set by `--glyph-side-entry-share`. They still return to their own positions on exit.

**Inset mobile player (2026-11-05)**
- The mobile player now sits inside the 12px gutters instead of running full bleed, following Figma 592:23901.

**Header action text style (2026-11-05)**
- Contact and Top now use bodySans, at Liam's request; Figma's frames show captionSans. The name uses bodySerif. It's the same element as the sort label, so it returns to bodySans over the images, with the swap landing as the color glitch starts.

**Song bar clock format (2026-11-05)**
- While playing, the time shows bare seconds under a minute (5, 34), then minutes and padded seconds with a blank gap the width of the colon (3 34). Removed tabular numerals, which looked off in Oracle at this size; a hidden widest-digit copy, as on v3, keeps the width steady. The type was already captionSans.

**Quieter hover marks (2026-11-05)**
- The Featured dot and the Spotify square or icon now flash on about one in three hover pulses instead of every one, because Liam found them too busy next to the letters. `--link-glitch-mark-chance` tunes it; letter flashes are unchanged.

**Spotify logo in the hover glitch (2026-11-05)**
- The Spotify block now flashes palette colors with the track text on hover and keyboard focus, using the same `data-hover-glitch-mark` hook as the Featured dot. While playing, the green square flashes and the icon stays white; when idle, the icon flashes and the square stays gray. The square has no color transition: the 150ms hover transition kept the 90ms flashes from reaching full color. Browser checks should read the rendered color, not the inline style, since the inline style was set correctly while the flash was barely visible.

**Safari top edge (2026-11-05)**
- The mobile bar now sits 5px below the safe area, 1px below Figma's 4px, and stays fully opaque. Liam tested heights on an iPhone: Safari pulled the bar's gray into its top area at 4px, and 5px stays clean. There's no strip, gradient, or blur, so content scrolls up under the status bar natively.
- Rejected: a solid white strip (hard cut), the same strip with an inward fade (felt odd), and a 97% opaque bar. 8px read as failing once and then clean, so results may vary between page loads; recheck if the tint returns. This is Safari's own sampling behavior and could change with an iOS update.

**Tap-to-change Featured and plain Safari edge (2026-11-05)**
- Removed the Featured menu: every copy now taps to change, on desktop and mobile, on the page and in the header. Hovering uses the same color flashes as text links, on the label and its dot, as Liam clarified. The desktop dot drops from 9.9px to 9px; mobile stays 8.8px.
- Rejected: the inward fade under the top strip, which Liam found odd on iPhone Safari. No gradient or blur remains. The solid white strip stays so Safari doesn't sample the header's gray, and it now runs down to the bar's top so content can't show as a sliver between them. Content is cut at that line.

**Safari edge fade and filter corrections (2026-11-05)**
- The white top strip alone left a harsh white cut on iPhone Safari. The project modal's samplers were never only a strip: its bottom edge pairs a solid sampler with a short inward fade, so Safari samples the solid color while content dissolves into it. Added the same fade under the header, below the top strip. Liam still needs to confirm this on a device.
- Featured now uses the circle with the shared 1.1 dot ratio and the v3 gap to the first tile: 12px desktop, 8px mobile. The header's copy cycles on click instead of opening a menu, so the downward menu is gone.
- The song timestamp opts out of link flashes with `data-hover-glitch-skip`.
- Rejected: running the globe and ring at the links' 90ms cadence, at rest or on hover. Liam found it too fast. `glyph-globe.tsx` is restored from `portfolio-v3-homepage`, and `--globe-hover-extra-letters` and the `glitchLetters` minimum are removed.

**Header and music player split (2026-11-05)**
- Follows Figma 585:23614 and 585:23615, replacing the earlier filter handoff the same day. The fixed header is the avatar, Liam Fennell, and Contact (a mailto link to info@fennell.cv). Desktop narrows from 552px to 528px on any scroll; mobile stays at its gutters, 4px below the safe area. When the page filter is fully behind the opaque bar, the bar turns translucent with a 6px blur and the avatar leaves.
- Rejected: flying the page filter into the bar. Liam found it not smooth enough and asked not to connect the two. Now the same label scrambles with the color glitch, Liam Fennell ↔ current sort and Contact ↔ Top, and the square fades, grows, and unblurs in over 280ms. Only sort selections flash the square, so its entrance stays clean. The page filter stays hidden while over images so it can't ghost through the blur. Reduced motion swaps text and states immediately.
- The player moved to `PortfolioPlayer`, its own row between the contacts and the footer (583:23224, 583:23515): album, Spotify block, then track panel. Removed the mobile footer divider, which the new frames omit. Name and role are back; the Shop badge stays out, and `shop-badge.svg` is unused but kept. The avatar remains the inspector toggle.
- Safari on iPhone tinted its top area from the fixed header's gray, leaving a hard color cut. Added the same opaque, topmost, fixed sampler strip the project modal used, in white, sized to the larger of 12px and the safe area. The bar starts 4px below it, which matches Figma wherever the safe area is at least 12px. It needs JavaScript for nothing, and only exists below 768px.
- Near-token differences: `--bg-secondary-fill` #F6F8FA instead of #F7F8FA, and the frames' 14px contacts and 15px mobile intro stay on the shared bodySerif sizes. Figma's desktop frame labels the filter "Filter" and its mobile frame "Featured"; both show the current sort.
- Validation: tests, TypeScript, touched-file lint, and browser checks in the built-in pane at 1440px and 375px. The Safari tint itself can only be confirmed on a device.

**Mobile bodySerif correction (2026-11-05)**
- Removed the intro-specific 15/20 mobile font bundle. Intro paragraphs now inherit shared bodySerif at 14/18 below 768px; desktop remains 15/20.

**Stacked desktop header hover (2026-11-05)**
- Applied the vertical detail-panel-over-badges treatment to the default desktop header as requested. Avatar/Spotify badges glide down to reveal their detail bar above, with the Shop mark beside the avatar. Both retain fixed horizontal anchors and the earlier slide/fade easing; scrolled panels retain their compact clock-free stack. Mobile tap expansion remains horizontal.

**Globe default glitch cadence correction (2026-11-05)**
- Applied the links’ 90ms flash / 40–100ms pause cadence to the globe and ring by default. Hover/focus increases density from 1–3 to 4–6 glyphs without resetting or speeding up the burst clock. Both retain the 60% cap, visibility suspension, reduced motion and cleanup. Added --globe-hover-extra-letters for the density increase.

**Desktop media info affordance (2026-11-05)**
- Hide each media tile’s info block by default on desktop, revealing it on hover or keyboard-visible focus with the shared hover fade. The open tile’s close affordance stays visible, and mobile presentation is unchanged.

**Softer scroll header slide (2026-11-05)**
- Gave the avatar/Spotify scroll relocation its own 360ms motion token and cubic-bezier(.4,0,.2,1) easing. A gradual acceleration replaces the shared curve’s abrupt initial jump, followed by a quick middle and gentle settle. Hover/tap expansion timing is unchanged; reduced motion still disables transitions.

**Intro width cap (2026-11-05)**
- Enforced the existing 480px bio-width token at all breakpoints and removed the mobile max-width:none override. The intro shrinks to the available text width on smaller screens.

**Compact header player states and transitions (2026-11-05)**
- Restored the previous playing/last-listened behavior using its shared duration/relative-time helpers and track-change scrambles: green playing badge/time, gray inactive badge with relative age, cached track fallback and whole-second clock ticks. Added measured overflow marquee with edge fades to mobile, desktop and the compact desktop scrolled player; only the scrolled desktop time is hidden. Reduced motion leaves overflowing copy manually scrollable.
- Replaced flex/display expansion swaps with anchored controls and fixed-measure reveal panels, animated width/clipping and opacity. Hover clicks no longer immediately close an already hovered control; tap toggling, outside dismissal and Escape remain available. Scrolled tooltip hover regions are bridged, and their clock-free panels stay in the viewport.
- Fixed the mobile Shop badge being resized twice (responsive max-width plus transform). The original SVG now scales once to the shared 28px control height, matching photo and panel. Existing 32px desktop geometry is retained. Added header marquee duration/fade, compact panel width and mobile badge ratio tokens.
- Validation: 79 tests, TypeScript and touched-file lint pass; Chromium/WebKit checks cover playing/paused states, relative time, long/short tracks, marquee motion, desktop scrolled time suppression, mobile geometry, rapid toggles and reduced motion. The same checks pass against an optimized production build.

**Contact typography correction (2026-11-05)**
- Email and social links use text-bodySerif, as requested. Removed the mobile caption-size override so the shared bodySerif tokens control both viewport sizes and the inspector reports the correct style.

**Contact/filter hover parity and restored Featured menu (2026-11-05)**
- Fixed visibility checks for text inside the inspector's display:contents wrappers. Email/social links now flash in previews as well as with the inspector off; native text and links remain intact. The hover controller also supports explicitly opted-in filter controls, with the Featured square changing palette color alongside its label. Safari selection overrides let the custom highlights paint on the control while a scoped selection guard retains its button behavior.
- Restored the previous branch's compact sort menu: desktop hover/focus reveals only the two alternate options above the current label, with the original staggered entry/exit, option handoff, and selection scramble. Mobile taps cycle Featured → Recent → Random. The new feed retains its square mark and alignment. Shared glyph-label/option-motion components are reused by both the previous grid and the new menu. Added a pointer-bounds guard for Safari option handoffs and a 110ms menu-exit token matching the previous behavior.
- The globe and exit ring now use the exact same 90ms / 40–100ms hover flash settings and one-to-three-letter selection cap as text links; quiet idle ripples and spin behavior remain unchanged. Shared selection/timing logic lives in src/lib/color-glitch.ts.
- Validation: 79 tests, TypeScript, touched-file lint, production build, and Chromium/WebKit checks pass. Browser checks verify actual colored pixels on all five contact links with the inspector enabled, repeating filter text/mark colors, desktop alternate-option selection and mouse-out cleanup, mobile sort cycling, shared globe cadence/caps, and reduced motion. The same checks pass against the optimized production build.

**Continuous link-hover color glitches (2026-11-05)**
- Text links across the homepage and process page now flash one to three randomly selected letters while hovered, with a strict floor(60% of alphabetic graphemes) ceiling. Each 90ms burst is followed by a random 40–100ms pause; the shared legible glyph palette supplies the colors. Hovered text stays at full opacity, and mouse-out clears its color immediately. Keyboard-visible focus gets the same behavior.
- Uses CSS Custom Highlights over untouched native text, preserving React/inspector updates, selection, link destinations, line breaks, and accessible names. Lower highlight priority lets the swarm's transparent masks win. No animation timer runs while inactive; reduced motion, hidden pages, window blur, removed links and unmount all stop/clear the effect; touch pointer events never start it. Browsers without Custom Highlights retain ordinary dimming.
- New --link-glitch-* tokens expose flash duration, pause range, fraction cap and maximum simultaneous letters. Validation: 79 tests, TypeScript, touched-file lint, production build, and Chromium/WebKit checks for sustained random flashes, exact short-label cap, text/geometry preservation, cleanup, keyboard focus, reduced motion, inline contributor links and process navigation. The same checks pass against the optimized production build, including simultaneous link highlights/swarm masks and full swarm cleanup.

**Centered homepage redesign (2026-11-05)**
- Created `portfolio-v4-redesign` from the up-to-date `portfolio-v3-homepage` branch. Implements the desktop/mobile layouts from the Figma “new new new” page (575:20180): centered 552px feed, 480px intro, 8px desktop / 4px mobile gaps, stacked contacts, footer globe, and compact identity/Spotify controls. The desktop controls move to the viewport edges on scroll; mobile controls scroll away naturally. Live Spotify, artwork transitions, weather, and glyph effects reuse existing systems.
- Liam confirmed all existing filled projects, with no placeholders. Seven stable project IDs remain in the feed. Native inline disclosures show each project's real title/date, contributor links, and Tech below the tile; one opens at a time, Escape closes it, and other tiles dim. Existing responsive media, video policy, Featured order editor, Recent/Random sorting, and stacking constraints are retained. Added summary support to video retry intent. The alternate 720px Project focus v2 treatment is not enabled in this first pass.
- Added `--portfolio-*` layout tokens and scoped `homepage.css`; downloaded the exact Figma avatar/Spotify/Shop/info/close assets locally. Avatar is served as a 14KB WebP. Reused existing dynamic project media and album art, plus the interactive globe. Near-token differences: 552px shared feed rather than 553px frame rounding; existing 20/19px leading and #F6F8FA media fill rather than fractional leading / #F7F8FA.
- Validation: 77 existing tests, TypeScript, touched-file lint, production build, and diff checks pass. Chromium and WebKit checks at 1440/393/320px cover seven filled tiles, no horizontal overflow, inline details/exclusivity/Escape, sorting/stacking constraints, identity/music expansions, scrolled desktop controls, reduced motion, and no-JS disclosure behavior. WebKit plays the real H.264 videos; this Chromium build uses the poster fallback. Optimized-production WebKit checks at 1440/393px also verify real video continuity through expansion, local asset loading, and glyph swarm entry/return.

**Denser Shop sculpture with pink hues (2026-11-04)**
- The Shop state now fills to about 840 glyphs, roughly three times the original density. Extra copies borrow existing page characters/font metrics and stream in from both viewport sides over the shared release window, without masking any additional page text. Their metrics are captured once; no extra per-frame layout reads. Extra copies fly back out through their original side on exit and share the existing cancellation cleanup.
- Added bubblegum, raspberry, and orchid from the existing playful palette alongside the three purple shades. The sculpture and exit ring share one palette. New --glyph-shop-glyph-count and three pink color tokens make density/color tunable; shape size, hover timing, desktop/touch behavior, and dependencies stay the same.
- Validation: 77 tests, TypeScript, touched-file lint, production build, and diff checks pass. Production Chromium and WebKit checks pass for offscreen entry from both sides, 800+ settled glyphs, a substantial pink share, centered spin, background suspension, Escape/ring cleanup, early exit, desktop/mobile cancellation, ordinary click/touch swarm, and reduced motion.

**Desktop long-hover Shop glyph sculpture (2026-11-04)**
- A continuous ten-second mouse hover on the desktop globe now gathers page glyphs into an extruded version of the existing Shop swirl SVG. Both faces and the rim use the actual mark; depth shading, perspective, a slow 32-second rotation, and a gentle bob keep it floating in the viewport center independently of the pointer. Glyphs transition into three shades derived from the existing Shop purple. New --glyph-shop-* tokens cover intent, assembly, ambient motion, size, and purple shades; no dependencies added.
- Reuses the swarm’s character-position masks, current text tracking, ring, and return springs. Leaving early, scrolling, page visibility/focus loss, or a desktop capability change cancels pending intent. Escape/ring returns all letters; reduced motion, unmount, or switching to mobile/touch clears the sculpture. Ordinary click/touch swarm behavior is retained. Background animation pauses, and steady sculpture frames use cached viewport dimensions rather than layout reads.
- Validation: 77 tests, TypeScript, touched-file lint, production build, and diff checks pass. Chromium and WebKit browser checks verify the actual ten-second threshold and reset, all-purple assembly, centered ambient spin, hidden-page pause, Escape/ring cleanup, desktop-to-mobile cancellation, ordinary mouse/touch swarm, and reduced motion. The full lifecycle also passes against the optimized production build in Chromium. Native Safari appearance/performance remains a device check.

**Twelve portfolio slots restored**
- Restored the planned twelve tiles: seven populated projects and five blank placeholders. The previous removals had reduced the count instead of retaining blank slots. Existing placeholder IDs shop-10/11/12 stay stable; new shop-13/14 slots append to shared and reconciled local orders. Placeholder debug labels now run 8–12. Keep twelve slots as assets are added/removed unless Liam changes that target.
- Validation: 74 tests, TypeScript, touched-file lint, production build, and diff checks pass. Desktop/mobile checks confirm twelve unique tiles (six videos, one image, five blanks), five named debug placeholders, and older local orders retaining their entries while appending the new slots.

**Feed cash removed**
- Removed Feed cash (shop-09), its responsive video/poster bundle and asset registry entry, and its shared Featured ID at Liam's request. Ten tiles remain, including three blank placeholders. Surviving IDs/order remain unchanged, and local Featured orders automatically filter the removed ID. Updated active tag and media documentation; Top search and Collections sheet remain top-tagged.
- Validation: 74 tests, TypeScript, touched-file lint, production build, and diff checks pass. Desktop/mobile checks confirm ten unique tiles, no Feed cash in the grid/debug editor, and saved orders retaining all surviving IDs while dropping shop-09.

**Stable ordering while opening projects**
- Fixed a regression from the covered-tile stacking exemption: opening Collections sheet could change Collections → Canvas → Bottom search into Collections → Bottom search → Canvas, then restore it on close. The arrangement was being recalculated from the raw order with different constraints on each open/close.
- Resolve and memoize stacking corrections only for the base sort/order and column count. Opening/closing reuses that base order. Mobile two-column expansion uses a separate helper to exchange a right-column selection with its existing row neighbor; it never reruns stacking constraints. Blurred expanded layouts stay exempt from extra stacking-driven rearrangements, and collapsing restores the same base.
- Validation: 74 tests, TypeScript, touched-file lint, production build, and diff checks pass. Added regression/exhaustive tests for base-order retention and row-local expansion. Chromium mobile list/grid and desktop grid checks open/close five tagged/untagged projects in overlay and full-screen focus modes, confirming unchanged ordering except the intended two-column row promotion.

**Feed cash project**
- Filled shop-09 with Feed cash, Shop / Q4 26, Ashten Alexander (existing ashten.studio link), and Swift/UIKit. Added stackTag: top so it cannot sit directly above Bottom search. All surviving IDs and shared/local Featured ordering stay stable; three blank placeholders remain, eleven tiles total.
- Added the validated five-second, 2160px-square, 60fps clip as responsive H.264 files/posters under public/videos/shop-feed-cash-preview. The 800/1200/1600px videos are 168,924 / 264,360 / 353,647 bytes; source frame rate and SDR tags are preserved, with full decode checks passing.
- Validation: 73 tests, TypeScript, touched-file lint, production build, and diff checks pass. Desktop/mobile overlay and focus checks verify new-source playback/duration, Q4 26, Ashten's sole contributor link, Swift/UIKit, captionSans sizing, and eleven unique tiles. Forced Featured arrangements confirm the new top tag prevents Feed cash directly above Bottom search at desktop/mobile widths.

**Asset tags for vertical stacking**
- Replaced ID-specific restrictions with optional stackTag: top/bottom metadata. Top search and Collections sheet are top; Bottom search is bottom because its video shows a lower cropped frame during part of playback. All other assets stay untagged unless Liam specifies a tag.
- Top-tagged tiles cannot sit directly above bottom-tagged tiles in overlapping columns, including Random and mobile grid/list layouts. Featured/Recent retain the existing protection; local order editing remains raw. A mobile tile covered by the expanded card's blur overlay is exempt while covered, while other visible pairs remain protected. Full-row expansion normalization remains intact.
- The arrangement prefers a small valid swap, with a stable constraint search for future layouts containing multiple tagged pairs. No source IDs or names are embedded in the arrangement logic.
- Validation: 73 tests, TypeScript, touched-file lint, production build, and diff checks pass. Exhaustive multi-tag order/density/expansion tests cover both tags and covered-tile exceptions. Chromium at 390/1440/2200px verifies both current restrictions across sort/grid controls, all eleven IDs, and mobile overlay exemption/collapse restoration.

**Canvas sizing refresh**
- Replaced Canvas's video with Liam's updated-sizing export using a fresh validated responsive bundle/posters. The clip remains 12 seconds at 60fps; 800/1200/1600px videos are 1,417,592 / 2,266,562 / 3,109,466 bytes. Removed the superseded Canvas bundle. Project ID, Shop / Q3 26, Annabel Lake and Julian Kelly links, Swift/Vision, and Featured ordering remain unchanged.
- Validation: 71 tests, TypeScript, touched-file lint, production build, full decode checks, and diff checks pass. Desktop/mobile overlay and focus checks confirm the new hashed video actually plays, duration stays 12 seconds, eleven tiles remain, and both contributor links / Swift-Vision credits retain captionSans sizing.

**Shared weather-description budget**
- Added one 10-character condition budget for desktop and mobile, independent of viewport measurement. Descriptions within the limit retain their wording. Longer descriptions reduce to their main condition (e.g. Thunderstorm with light rain → Storms, Very heavy rain → Heavy rain, Overcast clouds → Overcast); unknown descriptions use a bounded word-boundary ellipsis fallback. Full API text remains available as the weather span's title. API data, polling, fonts, and footer spacing remain unchanged.
- Validation: 71 tests, TypeScript, touched-file lint, production build, and diff checks pass. Mocked long-weather cases with 11:59 PM and -12°F fit a single line without row overflow at 320/360/390/767/768/1024/1440px, with identical compact descriptions and retained full titles.

**Merged Bottom search recording**
- Replaced the surviving shop-07 / Bottom suggestions video with Liam's merged 11.3-second, 2160px-square, 60fps clip and renamed it Bottom search. Kept Shop / Q4 26, Jon Rundle's X link, and Swift/UIKit/Metal.
- Removed the old standalone Bottom search (shop-06), its media registry entry, responsive files, and shared Featured ID. Eleven tiles remain; all surviving IDs stay stable. Existing local orders automatically drop the removed ID. The Top search / Collections sheet placement restrictions still target shop-07, now called Bottom search.
- New validated 800/1200/1600px H.264 files are 1,661,260 / 2,301,559 / 2,860,743 bytes, with fresh immutable URLs/posters. Removed the superseded shop-07 bundle too; source frame rate and SDR tags are preserved, and full decode checks pass.
- Validation: 68 tests, TypeScript, touched-file lint, production build, and diff checks pass. Desktop/mobile overlay and focus checks confirm eleven tiles, no shop-06, the renamed merged video playing for 11.3 seconds, and retained credits/company/date. A saved order containing shop-06 reconciles to eleven entries while preserving surviving order and the new debug label.

**Eighth project: Canvas**
- Replaced placeholder shop-08 with Canvas, Shop / Q3 26. Contributors are Annabel Lake (existing LinkedIn link) and Julian Kelly (existing X link), in that order; Stack is Swift/Vision. IDs/order and the remaining four placeholders stay stable, so existing local Featured orders continue to work.
- Added Liam's 12-second, 2160px-square, 60fps clip using validated responsive H.264 encodes and posters under public/videos/shop-canvas-preview. The 800/1200/1600px versions are 1,093,565 / 1,714,943 / 2,414,637 bytes. Source frame rate and SDR tags are preserved; full decode checks pass.
- Validation: 68 tests, TypeScript, touched-file lint, production build, and diff checks pass. Desktop/mobile overlay and focused-view checks verify eighth position, actual 12-second video playback, Q3 26, both contributor links in the requested order, and Swift/Vision with captionSans sizing.

**Secondary fill matches video backgrounds**
- Changed the shared --bg-secondary-fill from #F6F8F9 to #F6F8FA. Browser-decoded corner samples from all five bundled clips agree on RGB 246/248/250. Token consumers inherit the change, including music surfaces/fades, footer highlights, blank preview/media backgrounds, focus controls/edges, and skeleton bases. Updated the OG reel's matching fallback and current token documentation; no per-component color overrides were added.
- Validation: 68 tests, TypeScript, touched-file lint, production build, and diff checks pass. Color sampling and DOM verification use Chromium; native Safari color management remains device-dependent.

**Collections sheet placement restriction**
- Added Collections sheet (shop-05) to the directional restriction: neither it nor Top search (shop-01) may sit directly above Bottom suggestions (shop-07) in an overlapping column. Reverse placements remain allowed. Both rules are evaluated together when selecting a valid swap, including mobile expansion; local editing still shows the raw draft.
- Expanded the exhaustive permutation/density/mobile-expansion checks to assert both restrictions together. All 68 tests, TypeScript, touched-file lint, production build, and diff checks pass.

**Named projects, local Featured editor, and Bottom suggestions refresh**
- Named projects 1–7 exactly as supplied: Top search, Shop card, Shop Incentives, Baskets, Collections sheet, Bottom search, Bottom suggestions. Remaining blank tiles have unique placeholder names. Company/date labels retain their existing presentation.
- Added Reorder Featured to the avatar/debug panel. Named tile handles swap on mouse/touch drop or arrow keys. Save order locally persists in this browser; Cancel discards the draft, and Copy order exports IDs for the agent to publish later. The shared baseline is src/lib/featured-order.json; no credentials, shared write endpoint, or automatic repo writes are involved. Recent uses Featured ordering for equal year/quarter dates.
- Corrected the directional placement rule to project one above project seven (Top search above Bottom suggestions), replacing the prior project-four rule. Editing shows the raw draft; normal views apply the layout constraint.
- The newly supplied clip belongs to Bottom suggestions, not Baskets, per Liam's correction. Baskets' original bundle is unchanged. Replaced the seventh bundle with the validated 7.083333s, 60fps responsive H.264 encodes/posters; Q4 26, Jon Rundle's supplied X link, and Swift/UIKit/Metal remain. Video sizes are 1,184,537 / 1,612,314 / 2,065,747 bytes at 800/1200/1600px.
- Validation: 68 tests, TypeScript, touched-file lint, production build, and diff checks pass. Chromium desktop/touch-mobile checks cover swapping, exact names, save/reload, copy, keyboard/cancel, Recent ties, and a fresh browser's unchanged baseline. Desktop/mobile playback checks confirm Baskets' original source, the seventh new source, duration, and retained credits.

**Directional project placement**
- Project one (shop-01) cannot sit directly above project four (shop-04) in an overlapping column. The reverse direction is allowed. Apply the rule after Featured/Recent/Random ordering using the current desktop/mobile column count, including mobile full-row expansion. When needed, swap four with the nearest valid later tile, falling back to an earlier tile; otherwise preserve the selected order.
- Added exhaustive ordering tests across column counts and mobile expansion, checking the directional rule, preservation of every project, and right-column expansion placement. All 65 tests, TypeScript, touched-file lint, production build, and diff checks pass.
- Chromium layout checks at 390/1440/2200px confirm actual tile geometry across sorting and density controls and retain all 12 unique project IDs.

**Uncapped viewport video playback**
- Removed the desktop four-video limit and redundant playback breakpoint listener. Every visible video can play together on desktop and mobile; offscreen videos pause, and background/reduced-motion/data-saving policies still apply. Two startup load slots and one nearby warm-up tile remain.
- Updated browser QA to require more than four desktop videos to play together and retained the mobile concurrency check.
- Validation: 63 tests, TypeScript, touched-file lint, production build, and diff checks pass. Chromium at 1440/390px played all six visible videos together and verified offscreen pause, background release/resume, and reduced motion. External Blob video requests used a local H.264 fixture for this lifecycle check; actual device performance still needs observation.

**Fifth project image: updated framing**
- Replaced the fifth project's image with Liam's latest 1280px-square JPEG under shop-collections-v5.jpg, preserving its original bytes and direct delivery without additional recompression. Superseded file removed; Q3 25, Staci Kelly's link, and no Stack remain unchanged.
- Validation: 63 tests, TypeScript, touched-file lint, production build, and diff checks pass. Desktop/mobile overlay and focused-view checks confirm the image loads directly, native image context menus remain available, and credits stay unchanged.

**Shop Cash card Stack**
- Updated the second project's Rewards/Shop Cash card Stack to Javascript, WebGL, and CSS 3D transforms. Media, date, contributors, and all other project stacks are unchanged.
- Validation: 63 tests, TypeScript, touched-file lint, production build, and diff checks pass. Overlay/focus checks at 320/390/768/1440px verify exact Stack labels, retained contributors, captionSans sizing, and no credits overflow.

**Seventh Shop project**
- Added shop-07 with Liam's supplied 2160px-square, 60fps, 7.083333s video, dated Q4 26. Jon Rundle is the sole contributor, using the supplied X URL, and Stack is Swift/UIKit/Metal. The remaining five placeholders retain their IDs/order.
- Uses validated responsive H.264 videos/posters and existing bundled video delivery.
- Responsive 800/1200/1600px videos are 1,218,148 / 1,674,168 / 2,103,133 bytes at 60fps. Validation: 63 tests, TypeScript, touched-file lint, production build, full output decode/rate checks, and diff checks pass. Desktop/mobile overlay/focus checks verify seventh position, new-source playback/duration, Q4 26, Jon as the sole contributor with the supplied X link, captionSans, and the three Stack entries.

**Incoming video refresh: sixth project**
- Replaced shop-06's clip with Liam's new 2160px-square, 60fps, 7.466667s export. Removed its contributors while retaining Shop / Q4 26 and Swift/UIKit/Metal. Stack naturally occupies the left column when contributors are omitted.
- Validation: 63 tests, TypeScript, touched-file lint, production build, full output decode/rate checks, and diff checks pass. Desktop/mobile overlay/focus checks verify new-source playback/duration, Q4 26, no contributor section, and the unchanged left-aligned Stack. Responsive 800/1200/1600px files are 598,125 / 912,311 / 1,186,550 bytes; superseded bundled files are removed.

**Incoming video refresh: first project**
- Replaced shop-01's video with Liam's newly supplied 6,143,672-byte, 2160px-square source. Its duration/rate stay 12.35s / 60fps; Q4 26, Luke Dupont/Julian Kelly, and existing Stack entries remain unchanged. Responsive videos/posters use a fresh content version, removing the superseded bundled files.
- Validation: 63 tests, TypeScript, touched-file lint, production build, full output decode/rate checks, and diff checks pass. Desktop/mobile overlay/focus checks verify the new baafafc4fe79623f source and retained metadata. The 800/1200/1600px videos are 1,005,126 / 1,489,229 / 1,982,624 bytes.

**Sixth Shop project**
- Added shop-06 with Liam's supplied 2160px-square, 60fps, 14.716667s video, dated Q4 26. Luke Dupont is the sole contributor, using his existing LinkedIn link; Stack is Swift, UIKit, Metal. The remaining six placeholders retain their IDs/order.
- Uses the established responsive H.264/poster pipeline and bundled video delivery while Blob upload credentials are unavailable.
- Responsive 800/1200/1600px videos are 2,122,575 / 2,878,270 / 3,643,377 bytes, all preserving 60fps. Validation: 63 tests, TypeScript, touched-file lint, production build, full output decode/rate checks, and diff checks pass. Desktop/mobile overlay/focus checks verify sixth position, new-source playback/duration, Q4 26, Luke as the sole contributor with his exact link, captionSans, and the three requested Stack entries.

**First video notch correction**
- Replaced the first project's clip with Liam's notch-corrected export, visually confirming the phone cutout in the supplied source. The 2160px-square source remains 12.35s at 60fps; responsive videos/posters use fresh versioned URLs. Q4 26, Luke Dupont/Julian Kelly links, and Stack remain unchanged.
- Validation: 63 tests, TypeScript, touched-file lint, production build, full output decode/rate checks, and diff checks pass. Verified the dark notch region in an encoded frame and new-source playback/metadata in desktop/mobile overlays and focused views. Responsive 800/1200/1600px videos are 918,311 / 1,359,394 / 1,808,376 bytes; superseded bundled files are removed.

**First Shop project video replacement**
- Replaced the first project's clip with Liam's supplied 2160px-square, 60fps, 12.35s source. Set its date to Q4 26 and contributors to Luke Dupont and Julian Kelly, reusing their existing supplied links in that order. Existing Stack entries are retained.
- Uses the established validated responsive H.264/poster pipeline and bundled video delivery. The old imported product-page asset remains available to the independent video lab.
- The 800/1200/1600px videos are 904,078 / 1,334,837 / 1,780,839 bytes, preserving 60fps. Validation: 63 tests, TypeScript, touched-file lint, production build, full output decode/rate checks, and diff checks pass. Production desktop/mobile overlay/focus checks verify the new 12.35s clip, first position, Q4 26, exact contributor names/order/links, captionSans styling, and unchanged Stack entries.

**PNG export received as JPEG; preserve supplied image bytes**
- Liam supplied a PNG export, but the actual attached file delivered to the workspace is a 1280px JPEG/JFIF (89,009 bytes). The upload path appears to have converted it; the original lossless PNG is not available. Requested a ZIP to preserve those bytes.
- Applied this revision as shop-collections-v4.jpg, with opt-in unoptimized delivery for this small, color-sensitive asset. It avoids an additional Next image resize/recompression pass; future image assets retain the normal optimization default. Source corner RGB is (247,248,250), close to the sampled Chromium video readback (246,248,250), without claiming an exact Safari display match. Project metadata/native image actions remain unchanged.
- Validation: 63 tests, TypeScript, touched-file lint, production build, and diff checks pass. Production desktop/mobile overlay/focus checks verify the direct original URL, no generated srcset, loaded image, metadata, and uncancelled context-menu handling. An HTTP download matches the received attachment byte for byte.

**Fifth image color comparison and next revision**
- Swapped in Liam's latest JPEG under shop-collections-v3.jpg with fresh cache identity. Project metadata and image behavior remain unchanged.
- Sampled a flat 50px-square corner: both v2 and the new source decode to RGB(244,248,249), while sampled decoded third/fourth video frames are RGB(246,247,250). The tested Next image WebP rendition at 828px/q75 retained the source background RGB, so that sample does not implicate image optimization. Browser/native-video color management may differ; this is not an actual iPhone display match.
- Recommended an sRGB PNG exported from the original design for predictable still-image colors, rather than repeated JPEG adjustments. Converting an already compressed JPEG cannot recover its pre-compression colors. References: https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/Image_types and https://nextjs.org/docs/app/api-reference/components/image.
- Chromium canvas readback samples the third/fourth videos at RGB(246,248,250), while the displayed optimized fifth image remains RGB(244,248,249). This differs slightly from the FFmpeg readback above, illustrating why decoded values should not be presented as a guaranteed Safari display match. The original editor's pre-JPEG pixels are unavailable, so JPEG's exact contribution is not proven.
- Validation: 63 tests, TypeScript, touched-file lint, production build, and diff checks pass. Desktop/mobile overlays and focused views load the v3 image with unchanged project metadata and native image context handling. The v3 image's tested 828px/q75 WebP output retains its source corner RGB.

**Fifth image background revision**
- Swapped in Liam's updated 1280px-square JPEG unchanged, using shop-collections-v2.jpg to avoid stale image caches. Removed the superseded file. Project position, Q3 25, Staci Kelly's link, and omitted Stack are unchanged.
- Validation: 63 tests, TypeScript, touched-file lint, production build, and diff checks pass. Desktop/mobile production checks load the v2 image in overlays and focused views and retain the prior metadata and native image context-menu path.

**Fifth project: Shop collections image**
- Added the supplied 1280px-square image to shop-05, dated Q3 25, with Staci Kelly linked to her supplied LinkedIn profile and no Stack section. The original JPEG is kept unchanged under public/images/projects; native image context-menu behavior is retained.
- The focused-view label describes the saved collections interface, without the unrelated shared placeholder summary. The remaining seven placeholders keep their IDs/order.
- Validation: 63 tests, TypeScript, touched-file lint, production build, and diff checks pass. Production desktop/mobile checks verify fifth position, image decoding, no video element, uncancelled native image context-menu handling, Q3 25, Staci's exact link, captionSans/left-aligned contributor placement, and absence of Stack in overlays and focused views.

**Mobile company/date caption typography**
- Removed the card overlay's mobile-only bodySans override. Company and quarter/year labels now consistently use captionSans in mobile cards, matching inline mobile labels and existing desktop labels. Colors, scrambles, and spacing are unchanged.
- Validation: 63 tests, TypeScript, touched-file lint, production build, and diff checks pass. Production checks verify 13/18px captionSans labels on mobile and unchanged 14/19px desktop labels in overlay/inline modes, retaining primary company and secondary date colors.

**Caption typography for project credits**
- Applied the shared captionSans style to the credits container so all contributor names and Stack entries use it in card overlays and focused views, on desktop and mobile. Headings retain their existing captionSans styling and colors.
- Validation: 63 tests, TypeScript, touched-file lint, production build, and diff checks pass. Production browser checks verify Oracle regular captionSans at 14/19px desktop and 13/18px mobile for contributor names and Stack entries in both views, with the existing muted headings and secondary entry colors.

**Third Shop video: latest tweak**
- Replaced shop-03's video with Liam's newest 4,767,928-byte source. Source duration and rate remain 18.45s / 60fps. Fresh responsive-video/poster URLs replace the previous revision; Q3 26, contributor, and Stack entries are unchanged.
- Validation: 63 tests, TypeScript, touched-file lint, production build, full output decode/rate checks, and diff checks pass. Desktop/mobile production playback verifies the d77935b0eb47b148 revision and unchanged overlay metadata. The 800/1200/1600px videos are 889,565 / 1,305,842 / 1,670,993 bytes; superseded bundled files are removed.

**Fourth Shop video and Stack credits**
- Added Liam's supplied fourth video as shop-04, dated Q2 26, with no contributors and Stack entries Swift, Nano Banana, and Kling. The remaining eight placeholders keep their existing IDs/order.
- Renamed the shared credits heading from Tech to Stack, covering card overlays and focused views. Without contributors, Stack is the first grid child and occupies the left column with the existing left alignment; two-column credits remain unchanged when both sections exist.
- Imported the square 2160px/60fps source (13.433333s) into bundled 800/1200/1600px H.264 videos and responsive posters; video sizes are 1,620,414 / 2,407,508 / 3,165,273 bytes. Masters/reports remain untracked.
- Validation: 63 tests, TypeScript, touched-file lint, production build, full output decode/rate checks, and diff checks pass. Production desktop/mobile checks verify new-source playback, exact Q2 26/Stack entries, no contributor section, and Stack left alignment in card overlays and focused views. The four-video mobile grid advances without tile interaction and retains offscreen/reduced-motion pausing and scroll-back recovery. Blob clips used a local fixture for that combined playback check; both bundled clips use their actual sources.

**Third Shop clip refinement**
- Replaced the third video's previous revision with Liam's newest 4,825,236-byte master, preserving its 2160px square source, 18.45s duration, and 60fps. Rebuilt the responsive H.264 videos and WebP posters under a fresh content version; superseded bundled files are removed.
- Q3 26, Ashten Alexander/ashten.studio, Swift/UIKit, and playback behavior are unchanged.
- Validation: 63 tests, TypeScript, touched-file lint, production build, full output decode/rate checks, and diff checks pass. Production desktop/mobile playback loads the new b3ef5d9e2c451a2e files, advances video, and retains the existing overlay metadata. Responsive video sizes are 909,750 / 1,327,347 / 1,696,171 bytes at 800/1200/1600px.

**Mobile Spotify timer spacing**
- Increased the gap between the title/artist viewport and timer from 12px to 20px on mobile (reduced from the initial 24px after feedback), derived from the existing mobile content-padding and page-frame tokens. The marquee viewport and its existing fade end earlier, giving the timer more space. Desktop retains its 16px gap.
- Validation: 63 tests, TypeScript, production build, and diff checks pass. Production browser checks with a long-track fixture verify a 20px measured mobile gap, active marquee/24px fade at 320/390px, the same mobile gap at 767px, unchanged desktop styling at 768/1440px, and no horizontal overflow.

**Updated third Shop video**
- Replaced the third tile's clip with Liam's updated 4,861,213-byte source (2160px square, 60fps, 18.45s), using fresh versioned responsive-video/poster paths. Shop / Q3 26, Ashten Alexander, and Swift/UIKit metadata are retained.
- Continues the existing bundled `/videos/` delivery while Blob credentials are unavailable. Superseded bundled renditions/posters are removed; the master and processing reports stay outside Git.
- The 800/1200/1600px videos are 912,627 / 1,326,736 / 1,700,238 bytes, each preserving 60fps. Validation: 63 tests, TypeScript, touched-file lint, production build, full encode/decode checks, and diff checks pass. Production playback at 1440px and 390px resolves the new versioned URLs, reports the new 18.45s duration, advances decoded video, and retains Q3 26 / Ashten Alexander / Swift/UIKit overlay details.

**Globe and swarm overhead with growing video content (2026-11-03)**
- Removed the idle globe's per-frame size read and the color ripples' glyph-bound measurements. Size follows a ResizeObserver; ripples reuse the animation's known positions. Spin and colors now share one animation loop, stop together offscreen/background, and resume without a time jump. Depth order only writes when it changes; hover acceleration follows elapsed time.
- Swarm entry measures each arriving batch before adding glyphs/masks. The exit control's clear pocket updates on scroll, resize, text/layout changes instead of measuring every frame. Hidden pages stop the physics loop; resuming resets its accumulator. Catch-up is capped at two fixed 60Hz steps instead of four to avoid amplifying a hitch. Letter count, collision settings, video quality, source frame rates, and desktop/mobile playback policy are preserved.
- Added the real globe/footer to the development-only twelve-video lab and `scripts/check-glyph-performance.mjs` for idle geometry reads, offscreen/background suspension, simultaneous decoded playback, resize, full return, and reduced-motion cancellation at desktop/mobile widths. The lab repeats one asset; it cannot validate the eventual mix of twelve different videos.
- In equivalent five-second local Chromium production samples, idle-globe style recalculations fell from 602 to 300; recurring size/bounds reads fell from 301/31 to zero. The globe callback work fell from about 170ms to 100ms. These measure reduced animation overhead, not a Safari FPS guarantee. WebKit checks use real H.264 playback; native Mac Safari smoothness still needs checking on Liam's display.
- Validation: 63 tests, TypeScript, touched-file lint, production build, and diff checks pass. WebKit 18 and 26.5 pass desktop/mobile lifecycle checks; 26.5 uses the real sources with three 1200px desktop clips and roughly 300 letters, plus the twelve-copy lab with four desktop clips and ten visible mobile clips. Painted hover-label gaps, stable donations, and cleanup pass in WebKit. These are functional checks, not a benchmark of twelve distinct finished clips or native Safari's compositor.

**Uncapped visible mobile video playback**
- Removed the mobile playback cap at Liam's request. Every visible mobile video is eligible to play together; desktop retains its four-video cap. Two initial load slots still bound simultaneous startup work, and offscreen/background/reduced-motion/data-saving behavior remains unchanged.
- More simultaneously visible videos can increase decode/GPU work, battery use, heat, and dropped frames on real phones. Today's three-video grid has the same playback load as the preceding fix; future denser content needs device checks.
- Corrected the new third Shop video's visible date and sorting year to Q3 2026, per Liam's follow-up. Its previously published file URLs remain stable.
- Validation: 63 tests, TypeScript, touched-file lint, production build, and diff checks pass. A mobile twelve-video development fixture verified six visible clips advancing simultaneously beyond the old caps, with offscreen/reduced-motion pausing intact. Production checks verified all three current videos advancing untouched, scroll-back recovery, and the corrected Q3 26 overlay/contributor/tech metadata at desktop/mobile widths. These are functional checks, not real-phone performance benchmarks.

**Mobile grid playback with three videos (superseded)**
- Reproduced a fully visible mobile grid where the two-video decoder cap left one of the three clips paused on its last frame. This follows playback prioritization rather than Blob/local hosting; no tap or media failure is required.
- Raised the mobile playback cap to three so today's three visible clips can run together. Desktop stays at four, initial loads at two, and offscreen/reduced-motion/data-saving behavior is unchanged. Updated the optional grid QA budget and current media-workflow documentation.
- Validation: 63 tests, TypeScript, touched-file lint, production build, and diff checks pass. Production Chromium mobile-grid regression reproduced one paused visible clip before the fix; afterward all three clocks/decoded-frame counters advance without tile interaction. Offscreen pausing, scroll-back resume, and reduced-motion release pass. Blob-hosted clips used a supported local media fixture; the third clip used its real bundled source. Native phone performance remains a device check.

**Third Shop tile video**
- Prepared shop-03 for Liam's supplied square, 2160px, 60fps, 18.766667s clip. Metadata is Shop / Q3 24, contributor Ashten Alexander (https://ashten.studio), and Swift/UIKit.
- Encoded and validated 800/1200/1600px H.264 at the original 60fps (856,393 / 1,237,980 / 1,591,409 bytes) and responsive WebP posters. Local report: `public/media/shop-q3-2024/57a9f0be6088bc12-report.json`. The Blob token remains unavailable. Following Liam’s instruction to push the preview, the six optimized files are bundled under versioned public/videos/shop-q3-2024 paths as a temporary delivery fallback. Bundled /videos paths stay on the current origin even when other media uses a Blob base URL. The master, processing reports, and all other generated media remain untracked. The media asset uses these local paths; the imported CDN registry is unchanged.
- All 62 tests, TypeScript, touched-file lint, and a production build pass. A temporary local registry entry verified real decoded playback in the third tile at 1440px and 390px, Q3 24, the sole Ashten contributor/link, Swift/UIKit without Metal, and opening/closing the overlay. Restored the original registry after these checks; the bundled fallback uses the identical tested files.
- Final bundled-delivery validation: 63 tests (including origin delivery with a CDN configured), TypeScript, touched-file lint, production build, and diff checks pass. Real production-mode playback and exact contributor/tech/period metadata pass again at 1440px and 390px using `/videos/` URLs.

**Correct the process section heading (2026-10-29)**
- Restored “Two languages” for the editorial/terminal section, matching Liam's corrected [Figma node 544:4657](https://www.figma.com/design/nIi2Tpt2b8yYxYsuCq38OJ/New-Portfolio?node-id=544-4657). The page title remains “In the margins”; section styling and paragraphs are unchanged.

**Process Cosmos hover and hand pointers (2026-10-29)**
- On desktop hover or keyboard-visible focus, `/portfolio` streams after Cosmos using the shared `useColorScramble`/`FILTER_SCRAMBLE` treatment; it scrambles back to blanks on exit. The suffix is positioned after the link so the centered caption does not shift. It remains hidden on mobile/touch layouts, and reduced motion uses immediate plain text. The accessible link name identifies Cosmos/portfolio throughout.
- Explicitly applied the homepage's hand pointer to process links and enabled buttons, including media cards and Close. The supplied Cosmos icon, destination, caption typography, and mobile media behavior remain unchanged.
- Validation: 62 tests, TypeScript, touched-file lint, production build, and diff checks pass. Browser checks confirm colored intermediate glyphs on actual pointer hover and keyboard focus, settled `/portfolio`, clean exit, unchanged caption/link geometry, pointer styles on all six interactive elements, and a hidden mobile suffix with no horizontal overflow at 390px.

**Simplify process mobile edges and bottom spacing (2026-10-29)**
- Removed the process page's custom fixed top sampler/blur and bottom fade so mobile uses the browser's native edge treatment. The hero no longer adds a 12px sampler inset; the document's safe-area padding remains in place. Shared project-focus styles are unchanged.
- Reduced mobile page bottom padding from 116px to 92px plus the safe-area inset, matching the focused view's existing clearance formula. The last section keeps its 32px internal spacing; desktop remains at 160px bottom padding and a 24px hero top inset.
- Validation: 62 tests, TypeScript, touched-file lint, production build, and diff checks pass. At 390px, browser checks confirm no edge overlays or horizontal overflow and the final paragraph clears Close by 66px at the end of the page. Desktop retains 620px media. Native Safari's own chrome rendering remains a device check.

**Process page follows Liam's Figma edits (2026-10-29)**
- Matched [the edited process frame, 544:4551](https://www.figma.com/design/nIi2Tpt2b8yYxYsuCq38OJ/New-Portfolio?node-id=544-4551): shortened subtitle, sans title/headings, muted sans captions, 36px desktop section spacing, and a wide two-column media block. The opening image remains 620px square with a 24px top inset; its caption is removed. Paragraphs retain the shared bodySerif/text-secondary roles and fill the 620px column.
- Each multi-asset card now has a top-right `[1]` counter that advances on tap and wraps independently. Captions stay centered and stable beneath the set. Inspiration links to Cosmos with the exact supplied 14px SVG, saved as `public/images/process/cosmos-mark.svg`; the supplied hero matches the existing PNG byte for byte. Placeholder frames stay empty gray squares.
- On mobile, all media remains full bleed; the two-column block becomes a native horizontal snap carousel with viewport-wide cards. Swiping changes cards, while tapping cycles the selected card's asset set. Prose retains 12px insets, 14/18px type, and 32px section spacing. Live announcements, Enter/Space activation, the focus text entrance, white status-bar blur, and Close navigation are preserved.
- Used existing counter-inset tokens (16px desktop, 12px mobile) instead of Figma's 20px, and the existing 20px desktop serif line-height instead of 20.25px. No new tokens or dependencies. Validation: 62 tests, TypeScript, touched-file lint, production build, and diff checks pass. Browser checks cover 1440px desktop geometry, 320/390px full-bleed media without page overflow, native carousel snapping, independent counters and wraparound, keyboard activation, loaded hero/Cosmos assets, and no console errors. Native iPhone Safari safe-area painting remains a device check.

**Intro wording adjustment (2026-10-29)**
- Removed “where” after OpenPurpose; the intro now reads “Previously at OpenPurpose, he designed interfaces for…”. Links and unlinked ending periods are unchanged. Validation: 62 tests, TypeScript, touched-file lint, and diff checks pass.

**Fix process hero delivery with the preview CDN configuration (2026-10-29)**
- The committed hero image was valid, but `mediaUrl()` prepended `NEXT_PUBLIC_MEDIA_BASE_URL` on Vercel and requested it from Blob instead of the site's `/public/images` directory. Static `/images/` paths now stay on the current origin; relative encoded media still uses the configured CDN and absolute URLs remain unchanged. Liam's reattached `placeholder.png` is byte-identical to the existing hero, so no duplicate image was added.
- Added regression coverage with a nonempty CDN base for static images, relative encoded media, and absolute URLs. Validation: 62 tests, TypeScript, touched-file lint, and diff checks pass. A production build with a CDN base verifies the prerendered hero URL stays local. The branch preview is protected by Vercel SSO, which prevents an unauthenticated HTTP check of the deployed image.

**Intro paragraph punctuation (2026-10-29)**
- Added ending periods to both homepage intro paragraphs, as plain text after the closing “get in touch” and “process” links.

**Process mobile media, hero, and text entrance (2026-10-29)**
- Every media square on `/process` now spans the mobile viewport; paragraph and centered-caption insets stay at 12px. Desktop retains the 620px media/reading width and 24px top inset.
- Added Liam's supplied `Clipped Mobile.png` as the opening image, with one static frame and a matching caption. The compact 379KB PNG is served intact and prioritized; the local optimized-image preview did not display it, while the direct image loads correctly. Other image slots retain responsive optimization.
- Replaced the process page's gray mobile top edge with white and a masked 10px blur/tint fading below it, using the existing focus fill, blur, safe-area, and control-size tokens. The white image background blends into this status-bar treatment.
- Process text now enters with the focused view's 120ms delay, 600ms opacity fade, 40ms stagger, and shared easing. The title and reading time enter together; media and Close are immediately visible. CSS keeps the essay server rendered and removes the animation for reduced-motion preferences. Cycling a caption does not replay its entrance.
- Homepage intro now reads “Previously at OpenPurpose, where he designed interfaces for…”, preserving its existing links and type.
- Validation: 59 tests, TypeScript, touched-file lint, production build, and diff checks pass. Browser checks cover full-width squares/no overflow at 320/390px, unchanged 620px desktop geometry at y=24, mid-entrance opacity/timing, settled/cycled captions, the loaded hero, the white masked blur, and homepage/process/Close navigation. Native iPhone Safari rendering remains a device check.

**Process header responsive correction (2026-10-29)**
- Constrained the opening square to the same 620px column as the essay on desktop, with the existing 24px `--project-focus-top` inset. Mobile retains full-width media and now reuses the focused view's fixed gray top-edge sampler for the status-bar safe area. Its minimum top spacing accounts for the body's existing safe-area padding rather than doubling it. Updated future image sizing to the constrained desktop measure; no new tokens.
- Validation: 59 tests, TypeScript, touched-file lint, production build, and diff checks pass. Browser measurements at 1280px confirm a centered 620px square starting at y=24; at 390px, media spans the viewport beneath the fixed 12px gray edge. No horizontal overflow. Native iPhone Safari's status-bar extension remains a device check.

**Simplify the process essay (2026-10-29)**
- Reduced the editorial page to bodySerif text-secondary, with centered captionSerif text-secondary footnotes. Removed section numbers, the duplicated opening heading, the type specimen, inspector demo, component sketches, and colophon. Paragraphs now fill the complete 620px reading column instead of stopping at the intro's 500px measure. The existing Close control remains.
- Rewrote the essay to 636 words with equal attention to editorial/print composition and terminal behavior, a section on the glyph globe and letter release/return interaction, and a shorter account of prototypes and tools. Linked the inspiration caption to Liam's [Cosmos board](https://www.cosmos.so/notliam/portfolio).
- All five media slots are empty gray squares using the homepage placeholder fill, including the full-bleed opening square. Tapping cycles each sequence independently and loops back to the beginning; only its centered caption/count changes while assets are absent. Native buttons support Enter/Space and announce caption changes. Frames in `src/lib/process-essay.ts` accept shared image/video assets later; videos reuse the existing lifecycle. No autoplay reel or new motion was added.
- Removed the now-unused process media-ratio tokens. Validation: 59 tests, TypeScript, touched-file lint, production build, and diff checks; browser checks cover desktop/mobile square geometry, blank placeholders, full-column paragraphs, consistent type/color, caption alignment, the Cosmos destination, and pointer/keyboard sequence wraparound.

**Process essay, first pass (2026-10-29)**
- Added `/process`, “In the margins”: a 623-word, five-section illustrated essay on the site's design language, making prototypes, and the working environment. Tooling examples come from the existing inspector, palette lab, and media-import workflow. Copy lives in `src/lib/process-essay.ts` for later editing.
- The ordinary homepage process link now stays on the current origin and opens the route in the same tab. The page has a solid white background, a full-width opening media block (the existing Office image, explicitly labeled as a placeholder), the focused view's centered reading measure, and its fixed Close treatment returning to `/`. No entry/exit transition or modal behavior.
- Prose uses bodySerif and text-secondary throughout. Type specimens use the four existing roles, component-view schematics document the available iterations, an accessible toggle demonstrates type/color inspection, and a labeled media slot leaves room for future process recordings. The page remains readable with server-rendered content and native links.
- New `--process-section-gap` (72px desktop / 48px mobile) and media-ratio roles provide editorial rhythm and replaceable media slots; other spacing, colors, typography, hover behavior, and safe-area offsets reuse existing tokens. No dependencies added.
- Validation: all 59 tests, TypeScript, touched-file lint, production build, and diff checks pass. Local browser checks at 1280, 390, and 320px confirm no horizontal overflow, full-width media, 15/20 and 14/18 Otto prose in #555, the inspector demo, and same-tab homepage/Close navigation.

**Intro maximum width**
- Set the intro width token to 500px and cap its container at that width across breakpoints, while allowing it to shrink to available space on smaller screens.
- Validation: 59 tests, TypeScript, production build, and diff checks pass. Production browser measurements at 1440/768/600px are 500px; at 390px the intro fits the available 366px, with no horizontal overflow.

**Blur entry and short intro locked in**
- Project card overlays now always use the existing 180ms blur-surface fade and staggered credits. Removed the WebGL wipe implementation, its dedicated tests/tokens/styles/host, and the Card entry debug toggle/state. Other project interaction modes remain available.
- The intro is permanently the short “If something here resonates, get in touch” version with the short process paragraph. Removed the other copy variants and Intro debug toggle/state. Paragraphs have no ending periods; only “process” is linked in the last sentence, and Shop's period stays outside its link.
- Validation: 59 remaining tests (the five shader tests were removed with the implementation), TypeScript, touched-file lint, production build, and diff checks pass. Production Chromium checks cover desktop/mobile blur timing, credit-row ordering, pinning, second-click/selection/Escape dismissal, links/keyboard focus, reduced motion, original-video continuity with a supported-codec fixture, final intro copy, and absence of both removed controls/canvas.

**Intro copy comparison in debug menu (removed)**
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
