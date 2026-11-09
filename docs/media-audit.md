# Video audit — November 7, 2026

The initial normalization audited all eight project videos, the retained OG-reel clip, and the social-preview MP4. Project clips now share immutable CDN delivery, source frame rate (currently 60fps), tagged SDR sRGB/Rec.709, silent preview files, responsive WebP posters, and a 640/800/1200/1600px ladder. Opaque clips use H.264; transparent clips use verified HEVC/VP9 alpha. Smaller masters are never upscaled.

The new 640px rung covers the 552px desktop column at DPR 1 and 320px mobile at the existing 2× DPR cap. Other screens select larger renditions as required. Compared with 800², 640² has 36% fewer decoded pixels per frame. This is a workload reduction, not a measured battery/FPS guarantee.

The table records the initial normalization before the subsequent transparent-master replacements for Baskets and Bottom search and the addition of Blink’s timer preview. Those new originals generate every rung directly; their delivery sizes are recorded below.

| Clip | Previous 800px MB | New 640px MB | Reduction | VMAF before → after |
| --- | ---: | ---: | ---: | ---: |
| Top search | 1.005 | 0.841 | 16.3% | 97.24 → 97.20 |
| Shop card | 1.074 | 0.791 | 26.4% | 96.31 → 96.05 |
| Shop Incentives | 0.890 | 0.686 | 22.9% | 96.16 → 96.01 |
| Baskets | 1.620 | 1.403 | 13.4% | 96.98 → 97.02 |
| Bottom search | 1.661 | 1.362 | 18.0% | 97.56 → 97.42 |
| Canvas | 1.418 | 1.300 | 8.3% | 97.66 → 97.71 |
| Shopping agent | 0.564 | 0.452 | 19.9% | 96.28 → 96.42 |
| Blink (VP9 alpha) | 0.997 | 0.680 | 31.8% | Native alpha validation |
| OG reel | 1.172 | 0.867 | 26.1% | 96.89 → 96.84 |
| Total of these variants | 10.402 | 8.382 | 19.4% | |

These totals compare the complete set of smaller variants, not initial page load: sources are still deferred. Blink's 640px HEVC alternative is about 0.746 MB, versus 1.024 MB at 800px.

Existing 800/1200/1600px files and poster frames were retained without re-encoding. The five bundled clip sets moved to Blob byte for byte, verified with SHA-256, before removing their 30 obsolete bundled copies (29,443,652 bytes). Some original opaque masters are no longer available locally, so the new 640px variants were derived from current 1600px delivery files. Blink's 640px versions use its original transparent master. Future imports generate every rung directly from the supplied original.

For opaque clips, VMAF compares both the previous 800px presentation and the candidate against the current 1600px file, resized to 640px with matched timing; every other frame is measured. Gates require mean ≥95, no more than 0.5 mean regression, and no more than 1 point regression at the fifth percentile. Every clip passed; the largest mean change was −0.26. These are relative checks against current delivery, not proof of fidelity to unavailable originals or a replacement for reviewing fine UI text and motion.

The initial full audit validated all 40 project/reel renditions and their posters: dimensions, frame rate, duration, audio removal, color metadata, full decode integrity, and front-loaded MP4/MOV metadata. The 1.16 MB social-preview MP4 already has fast-start metadata and retains its authored video/audio.

## Transparent master refresh

Baskets and Bottom search now replace their opaque deliveries with transparent originals. The separate Blink timer tile uses `3D-Timer.webm` (supplied 2026-11-09, replacing the earlier `Timer-shake.webm`; 23.7 seconds rather than 19.6); the existing first Blink tile is unchanged. All are 2160px square, tagged SDR sRGB/Rec.709 at 60fps. The table gives decimal MB per individual file as VP9 / HEVC; a browser loads one compatible format at one selected size.

| Clip | Original MB | 640px MB | 800px MB | 1200px MB | 1600px MB |
| --- | ---: | ---: | ---: | ---: | ---: |
| Baskets | 66.934 | 1.503 / 1.749 | 2.033 / 2.399 | 3.390 / 4.282 | 4.930 / 6.395 |
| Bottom search | 56.913 | 1.794 / 2.256 | 2.445 / 2.982 | 4.068 / 4.870 | 6.112 / 7.121 |
| Blink timer | 103.737 | 3.493 / 3.932 | 5.299 / 5.779 | 10.631 / 11.025 | 16.392 / 16.814 |

Versions are `0123b286d11feae4`, `e41f63dd93a7ad5a`, and `d7ca6619858943b3`, respectively. Native AVFoundation validation decodes every HEVC frame at every rung: 805 / 677 / 1421 frames, with alpha minimum 0 and maximum 255. VP9 uses libvpx for full decode; posters retain transparency. The originals remain untouched.

An additional color-plane quality check compares each 640px VP9 rendition with its original master resized to 640px through the same SDR conversion, sampling every other frame with libvmaf. Mean scores are 97.05 / 97.85, and 97.31 for the earlier timer clip; the replacement has not been scored. These measure color compression, not alpha fidelity or HEVC quality; native alpha checks and visual playback review supplement them. Detailed logs remain in `out/media-audit/alpha-master-quality.json` and the per-clip logs.

The current delivery audit covers 56 project/reel renditions and 30 posters, plus the social-preview MP4. The initial normalization table above remains a historical comparison; the new transparent files have different content/background encoding costs.

While a focused view is open, hidden grid clips pause. Current/outgoing/swipe-preview media remain eligible; neighbors may preload but do not play until focused. Closing restores ordinary visibility-based playback, without capping visible grid clips. Background-tab, reduced-motion, data-saving, source-release, and native-video continuity policies remain.

Run `npm run media:audit` to repeat the delivery audit. Detailed results live in ignored `out/media-audit/`. The existing-asset migration is repeatable with `npm run media:optimize`; already-normalized assets are retained. New content uses `npm run media:import` with the original master, adding `--alpha` for transparency. Physical iPhone/macOS Safari performance and power use still require device checks.

## Mobile compatibility delivery

Liam confirmed that all transparent clips play in Safari on both older and current macOS, but remain static in iOS 27.2 Safari; older H.264 clips still play. The preload/probe change did not fix the physical-phone failure. Its exact alpha-specific cause remains unconfirmed.

Mobile now uses a separate H.264 ladder composited directly from each original over the light `bg-secondary-fill` token. Desktop VP9/HEVC files and transparent posters remain unchanged. This avoids the alpha probe and decoder on mobile, where the extra top bar means alpha is unnecessary for header overlap. Source 60fps, the shared encoding quality policy, and fast-start delivery are retained.

| Clip | 640px MB | 800px MB | 1200px MB | 1600px MB |
| --- | ---: | ---: | ---: | ---: |
| Blink first | 0.521 | 0.712 | 1.137 | 1.491 |
| Baskets | 1.475 | 2.047 | 3.114 | 3.828 |
| Bottom search | 1.366 | 1.811 | 2.449 | 2.999 |
| Blink timer | 3.046 | 4.373 | 7.654 | 10.354 |

The current full audit covers 72 project/reel renditions and 30 posters, plus the social preview. Browser review verifies all four mobile MP4s playing, and a mobile → desktop → mobile resize selecting H.264 → HEVC alpha → H.264 at the same 800px rung, preserving the playhead and clearing retained frames. Desktop media returns above the header only when the transparent frame is ready. Physical iPhone confirmation is still required. Future alpha imports automatically include mobile H.264; a local 640px alpha import smoke check verifies all three codec outputs and native alpha validation.
