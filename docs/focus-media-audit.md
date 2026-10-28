# Focus media audit — 2026-10-28

## Finding

The media source is already shared: focus reuses the original video. The remaining complexity is around
moving its DOM/compositing hierarchy, not a missing player API. Keeping that hierarchy stable is the
preferred direction for continuous playback. This is a proposed replacement for the handoff machinery,
not another guard to layer on top. It has not replaced the shipped focus controller yet.

## Current boundaries

| Boundary | Current owner and work |
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

Run `node scripts/probe-stable-focus-media.mjs [origin]` with the existing optional WebKit tooling.
The probe temporarily lifts the original grid media with fixed positioning and a transform, leaving its
DOM parent, dimensions, source, and video element unchanged. It uses the actual Rewards video and actual
page ancestry. No product behavior or dependency is installed by the probe.

At 393px and 1440px, four cycles each passed with zero pause events, source loads, media removals, or
handoff canvases. Every opening continued presenting video frames, the clock advanced approximately
0.19–0.20 seconds over each 180ms transition, and the media rendered above the backdrop. This establishes
feasibility of the basic geometry and continuous clock in test WebKit. It does not test complete focus
scrolling/paging, accessibility, device compositor flashes, rendition changes, or a browser refresh.

## Recommended replacement

Keep the native video in its original subtree and let a single focus-media controller own its visual
position through entry, scroll, paging, return, and interruption. The focus slot remains a layout target;
text and controls remain in the overlay. Scroll/paging should update the media transform, not transfer
the video to another subtree. Preserve the existing visibility/load/decoder coordinator for grid playback.
Defer rendition changes until the media settles so transition and source replacement cannot race.

Replace the focus-specific canvas/clock/landing code as a unit once the controller passes the existing
entry/exit/page/rapid-reentry matrix. Remove the superseded protections instead of running two paths.
Keep startup coverage separate: verify the revised cold/warm reload and background/foreground on the
affected iPhone. Do not change teardown timing on the assumption that a focus fix also fixes refresh.

The isolated probe is the concrete starting point. Integration must cover focus scrolling, both paging
directions, interrupted paging/entry/exit, geometry after body unlock, responsive changes, reduced motion,
source errors/upgrades, background/foreground, and decoder limits. Native iPhone Safari must confirm the
visual result; headless WebKit frame counters cannot certify that a black flash is gone.
