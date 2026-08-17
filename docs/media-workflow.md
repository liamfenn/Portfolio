# Portfolio media workflow

Case-study and index media share one typed registry in `src/lib/media-assets.ts`. A media asset should be registered once and referenced from any case-study block or home preview that uses it.

## Video preparation

Process silent looping videos with:

```bash
npm run media:video -- /path/to/source.mov public/media/<project>/<name> 1600 30
```

The script creates:

- an H.264 MP4 with `yuv420p`, no audio, and fast-start metadata;
- a 1200px WebP poster selected near the beginning of the loop.

Defaults are a 1600px maximum long edge, 30fps, and CRF 21. Keep 50/60fps only when motion quality materially benefits from it. Use immutable, descriptive filenames rather than overwriting a deployed asset in place.

## Registry requirements

Every registered asset includes:

- a stable `id`;
- intrinsic `width` and `height`;
- useful alternative text;
- a poster for video;
- an optional smaller `previewSrc` when the home grid should not load the full case-study rendition.

## Runtime behavior

- Home videos use `preload="metadata"`, play only near the viewport, and pause offscreen.
- Case-study videos use the same poster behavior and a wider preloading margin.
- Reduced-motion and data-saving preferences leave videos on their poster frames.
- Focused media can request the full rendition without changing the source asset record.

## Storage

Small posters, logos, and initial media can remain in `public/media/<project>/`. Move the video renditions to public object storage/CDN before the library becomes large; the registry paths can change without touching page composition.
