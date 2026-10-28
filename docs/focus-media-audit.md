# Focus media audit — 2026-10-28

## Finding

The media source is already shared: focus reuses the original video. The remaining complexity is around
moving its DOM/compositing hierarchy, not a missing player API. Keeping that hierarchy stable is the
preferred direction for continuous playback. This replacement is now integrated in `ProjectFocusMedia`;
the focus-specific pause/canvas/landing machinery has been removed. The shared startup and rendition-loading paths remain separate.

## Previous boundaries (before integration)

| Boundary | Previous owner and work |
| --- | --- |
| Initial load / refresh | `ProjectPreviewVideo` renders the skeleton/poster; `video-playback.ts` selects a rendition. Before this audit it revealed on the first video-frame callback while changing the native video from hidden to visible. Hidden-page/pagehide cleanup also removes sources. |
| Enter | `project-focus.tsx` moves the media from the grid button into the focus slot and animates it. Its larger rendered width may trigger a rendition upgrade. |
| Page | `use-project-focus-paging.ts` moves outgoing media into a temporary page, then restores it to the grid; incoming media moves into focus. It shares the video coordinator's covers. |
| Exit | Focus waits for the reversed text fades and removal to paint. The coordinator pauses the video behind a canvas, adds a stationary landing canvas, and reveals after reparenting, a fresh frame, paint opportunities, and the minimum landing interval. |

Text exit and video readiness should remain separate concerns, with one completion chain controlling when
the card may return. The refresh flash is not explained by the focus text sequence: it has its own
first-frame and teardown paths. Liam confirmed the refresh flash is confined to video/cards. The startup
change now keeps the native surface visible under an opaque skeleton and retains coverage through two
paint opportunities after a submitted frame. A held-frame regression fails on the old early-reveal behavior.
This removes a specific surface/reveal race; a complete native Safari flash fix is not established yet.

## Existing implementations checked

- [PhotoSwipe's video plugin](https://github.com/dimsemenov/photoswipe-video-plugin/blob/main/src/video-content-setup.js)
  creates its own video, pauses on close, and replaces zoom-close with a fade because video zoom is choppy.
  It does not provide uninterrupted grid-to-focus playback of our existing video.
- [Video.js issue 8429](https://github.com/videojs/video.js/issues/8429) reports the same class of iOS
  poster-to-black-to-video startup. The maintainer recommends retaining an independent cover until
  playback is established. Adding a player library alone would not establish a fix.
- [WebKit's moveBefore tracking issue](https://bugs.webkit.org/show_bug.cgi?id=281223) still tracks the
  implementation. It is not a dependable Safari foundation for this project. Also, normal DOM moves
  already retain video playback state; compositor continuity is a distinct problem.
- [requestVideoFrameCallback documentation](https://developer.mozilla.org/en-US/docs/Web/API/HTMLVideoElement/requestVideoFrameCallback)
  distinguishes submitting a frame to the compositor from exact screen synchronization. A readiness event
  alone is not proof that the iPhone displayed a clean frame.

## Isolated stable-DOM experiment

The original probe (now superseded by `scripts/check-focus-video-continuity.mjs`) temporarily lifted the
original grid media with fixed positioning and a transform, leaving its DOM parent, dimensions, source, and video element unchanged. It uses the actual Rewards video and actual
page ancestry. No product behavior or dependency is installed by the probe.

At 393px and 1440px, four cycles each passed with zero pause events, source loads, media removals, or
handoff canvases. Every opening continued presenting video frames, the clock advanced approximately
0.19–0.20 seconds over each 180ms transition, and the media rendered above the backdrop. This establishes
feasibility of the basic geometry and continuous clock in test WebKit. It does not test complete focus
scrolling/paging, accessibility, device compositor flashes, rendition changes, or a browser refresh.

## Integrated replacement

Native media now stays in its original subtree. `ProjectFocusMedia` owns visual placement through entry,
scroll, paging, return, and interruption. The focus slot is a layout target and accessible image label;
text and controls remain in the overlay above the live media. Swipe previews also use original media
rather than a separate poster. Geometry updates run on scroll/resize events, with no idle drawing loop.

The shared visibility/load/decoder coordinator remains responsible for video playback. Focus motion
blocks rendition upgrades until it settles; actual source changes retain a single upgrade frame until
new presentation. This source-loading fallback does not freeze the clock merely because focus closes.
The focus-specific cover callbacks, held-clock flags, landing canvas, and landing delay are removed.

The integrated real-video check verifies continuous frames during rapid/scrolled exits and paging,
unchanged parents, no close-time pauses/loads/duplicates/copies, responsive geometry, and policy cleanup.
The earlier probe and pause/handoff tests have been replaced. Existing gesture, focus/navigation,
text-before-card, loading, startup, and Safari-edge tests remain in the verification matrix. The twelve-video
lab still bounds concurrent playback to four desktop/two mobile and two initial load slots.

Native iPhone Safari must still confirm the visual result. Browser frame counters establish playback and
lifecycle behavior, not a guarantee that a device compositor never flashes.
