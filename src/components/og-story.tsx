"use client";

import Image from "next/image";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { InspectableText } from "@/components/design-inspector";
import { PLACE_STAGGER_MS, glitchInPlace } from "@/components/og-card";
import { PROJECTS } from "@/components/project-feed";
import { useColorScramble } from "@/hooks/use-color-scramble";
import { mediaUrl } from "@/lib/media-delivery";
import { paintWarped } from "@/lib/og-reel";
import { ALBUM_CELL_ORDER, ALBUM_GRID, GRID_AT, albumAt, barAt, gridAt, gridTiles, motionAt, storyCopy, storySchedule, STORY_METRICS } from "@/lib/og-story";
import type { BarFrame, StoryCopy, StoryMetrics, StoryShape } from "@/lib/og-story";
import type { ProjectPreview } from "@/lib/project-previews";
import { currentGlyphPalette } from "@/lib/palette-toy";
import { FILTER_SCRAMBLE } from "@/lib/text-scramble";

const WORDS = [{ text: "Office of ", face: "og-card-sans" }, { text: "Liam Fennell", face: "og-card-serif" }];
/** The three songs' artwork (see SONGS in og-story), from Spotify. */
const ALBUMS = [1, 2, 3].map(song => `/images/meta/og-story-album-${song}.webp`);
/** The ending: the name is revealed as the last tile slides off it, holds, glitches to the site's address, which holds
 * and glitches out, and the card holds blank before the loop starts again. */
const URL = "fennell.cv";
const NAME_HOLD_MS = 1500, URL_HOLD_MS = 2000, BLANK_MS = 400;
/** The projects paged through after the spin lands, in order; the first is where it lands. */
const CYCLE_IDS = ["shop-02", "shopping-agent", "shop-03", "shop-08"];
const PERIOD = (project: ProjectPreview) => `${project.quarter ? `Q${project.quarter} ` : ""}${String(project.year).slice(-2)}`;
const COPY = PROJECTS.map(project => ({ company: project.company, label: project.label, period: PERIOD(project) }));
const CYCLE = CYCLE_IDS.map(id => PROJECTS.findIndex(project => project.id === id)).filter(index => index >= 0);
const SHAPE: StoryShape = { count: PROJECTS.length, rewards: CYCLE[0] ?? 0, cycle: CYCLE.length ? CYCLE : [0] };
/** Album cells: each one's place in the 8 × 8 grid, as a background position. */
const CELLS = Array.from({ length: ALBUM_GRID ** 2 }, (_, index) => ({
  x: index % ALBUM_GRID / (ALBUM_GRID - 1) * 100, y: Math.floor(index / ALBUM_GRID) / (ALBUM_GRID - 1) * 100,
}));

const nextFrame = () => new Promise<number>(resolve => requestAnimationFrame(resolve));
async function wait(ms: number, signal: AbortSignal) {
  const end = performance.now() + ms;
  while ((await nextFrame()) < end) signal.throwIfAborted();
}

/**
 * Each beat's text change plays the site's filter scramble, as the header's own labels do. React renders only the
 * first text; after that the scramble writes every change, so the new words never show for a frame before it starts
 * from the old ones. A quiet change (a clock tick) is written straight in, since the scramble draws nothing at speed 0.
 */
function Scrambled({ text, className, quiet = false }: { text: string; className?: string; quiet?: boolean }) {
  const { ref } = useColorScramble({ ...FILTER_SCRAMBLE, text, ignore: [], playOnMount: false, speed: quiet ? 0 : FILTER_SCRAMBLE.speed });
  const [first] = useState(text);
  useLayoutEffect(() => { if (quiet && ref.current) ref.current.textContent = text; }, [quiet, text, ref]);
  return <InspectableText text={text}><span ref={ref} className={className}>{first}</span></InspectableText>;
}

/** Spotify's square: grey, with a green layer over it while a song plays. */
function Brand({ part }: { part: string }) {
  return <span className="og-story-brand player-brand" data-part={part}>
    <span className="player-logo" />
    <span className="og-story-playing" data-part={`${part}-playing`}><span className="player-logo" /></span>
  </span>;
}

/**
 * One project's media, drawn into its tile. Playing live it just runs; under the capture's virtual clock it is seeked
 * to each frame's time instead, as the reel's tile video is, so every recorded frame shows the right picture.
 */
function tileMedia(project: ProjectPreview, capturing: boolean) {
  const media = project.media;
  if (media?.kind === "image") {
    const image = new window.Image();
    image.src = mediaUrl(media.src);
    const ready = image.decode().catch(() => {});
    return {
      ready,
      image: () => image.naturalWidth ? { image, width: image.naturalWidth, height: image.naturalHeight } : null,
      seek: () => Promise.resolve(),
      stop() {},
    };
  }
  if (media?.kind !== "video") return null;
  // The largest H.264 rendition, for a focused tile on the supersampled capture. Mobile alpha clips have it composited
  // on the tile colour, which is what a tile shows.
  const rendition = media.renditions.filter(candidate => candidate.h264).at(-1);
  if (!rendition?.h264) return null;
  const video = document.createElement("video");
  Object.assign(video, { src: mediaUrl(rendition.h264), muted: true, playsInline: true, loop: true, preload: "auto", crossOrigin: "anonymous" });
  // Loading every clip before the clock starts keeps the first seeks from timing out into blank tiles.
  const ready = new Promise<void>(resolve => {
    if (video.readyState >= 2) resolve();
    video.addEventListener("loadeddata", () => resolve(), { once: true });
    video.addEventListener("error", () => resolve(), { once: true });
    window.setTimeout(resolve, 20000);
  });
  if (!capturing) void video.play().catch(() => {});
  return {
    ready,
    image: () => video.readyState >= 2 ? { image: video, width: video.videoWidth, height: video.videoHeight } : null,
    seek(ms: number) {
      if (!capturing || !video.duration) return Promise.resolve();
      return new Promise<void>(resolve => {
        const timeout = window.setTimeout(resolve, 3000);
        video.addEventListener("seeked", () => { window.clearTimeout(timeout); resolve(); }, { once: true });
        video.currentTime = (ms / 1000) % video.duration;
      });
    },
    stop() { video.pause(); video.removeAttribute("src"); video.load(); },
  };
}

/** Reads the story's lengths from tokens.css, falling back to their current values. */
function readMetrics(root: HTMLElement): StoryMetrics & { popScale: number; popBlur: number } {
  const styles = getComputedStyle(root);
  const read = (name: string, fallback: number) => {
    const value = styles.getPropertyValue(name).trim(), number = parseFloat(value);
    if (!Number.isFinite(number)) return fallback;
    return value.endsWith("ms") ? number : value.endsWith("s") ? number * 1000 : number;
  };
  return {
    column: read("--portfolio-column-width", STORY_METRICS.column), control: read("--portfolio-control-size", STORY_METRICS.control),
    narrow: read("--header-narrow-inset", STORY_METRICS.narrow), inset: read("--content-padding-mobile", STORY_METRICS.inset),
    panel: read("--portfolio-panel-padding", STORY_METRICS.panel), slot: read("--header-filter-slot", STORY_METRICS.slot),
    gap: read("--portfolio-feed-gap", STORY_METRICS.gap), pop: read("--header-pop-duration", STORY_METRICS.pop),
    scroll: read("--header-scroll-duration", STORY_METRICS.scroll),
    popScale: read("--header-pop-scale", 0.5), popBlur: read("--header-pop-blur", 3),
  };
}

declare global { interface Window { __ogLoops?: number; __ogReady?: boolean; __ogSettle?: () => Promise<void> } }

/**
 * The story card (see og-story): the site's header bar, player, filter and work, played to the storyboard on one loop.
 * It plays in real time here; scripts/capture-og.mjs --story drives it on a virtual clock to record it.
 */
export function OgStory() {
  const root = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const title = useRef<HTMLParagraphElement>(null);
  const url = useRef<HTMLParagraphElement>(null);
  const [copy, setCopy] = useState<StoryCopy>(() => storyCopy(0, COPY, SHAPE));

  useEffect(() => {
    const card = root.current, reelStage = stage.current, row = bar.current, name = title.current, address = url.current;
    if (!card || !reelStage || !row || !name || !address || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const controller = new AbortController(), { signal } = controller;
    const capturing = "__ogEvents" in window, metrics = readMetrics(card), schedule = storySchedule(SHAPE.cycle.length);
    const placed = (text: HTMLElement) => Array.from(text.querySelectorAll<HTMLElement>("[data-letter]")).filter(element => element.textContent?.trim());
    const letters = placed(name), urlLetters = placed(address);
    const part = (key: string) => row.querySelector<HTMLElement>(`[data-part="${key}"]`)!;
    const parts = {
      fill: part("fill"), avatar: part("avatar"), album: part("album"), albumUnder: part("album-under"), mark: part("mark"), copy: part("copy"),
      brandLeft: part("brand-left"), brandLeftPlaying: part("brand-left-playing"), brandRight: part("brand-right"), brandRightPlaying: part("brand-right-playing"),
    };
    const cells = Array.from(row.querySelectorAll<HTMLElement>("[data-album-cell]"));
    const media = PROJECTS.map(project => tileMedia(project, capturing));

    // The grid is painted onto one canvas at full pixel density with the reel's warp, under an SVG vertical blur.
    const width = card.clientWidth, height = card.clientHeight, ratio = window.devicePixelRatio || 1, filterId = "og-story-filter";
    const canvas = document.createElement("canvas");
    canvas.className = "og-reel-grid";
    canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
    const ink = canvas.getContext("2d")!;
    ink.setTransform(ratio, 0, 0, ratio, 0, 0); ink.imageSmoothingQuality = "high";
    reelStage.insertAdjacentHTML("beforeend", `<svg class="og-reel-filters" aria-hidden="true">
      <filter id="${filterId}" x="-5%" y="-30%" width="110%" height="160%" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="0 0"/></filter></svg>`);
    reelStage.append(canvas);
    const blur = reelStage.querySelector("feGaussianBlur")!, fill = getComputedStyle(card).getPropertyValue("--bg-secondary-fill").trim() || "#f6f8fa";

    // Pops settle exactly, so nothing at rest keeps a fractional scale or a filter that would soften it.
    const pop = (element: HTMLElement, x: number, shown: number) => {
      const settled = shown > 0.995 ? 1 : shown;
      element.style.transform = `translateX(${x}px)${settled < 1 ? ` scale(${metrics.popScale + (1 - metrics.popScale) * settled})` : ""}`;
      element.style.opacity = String(settled);
      element.style.filter = settled < 1 ? `blur(${(metrics.popBlur * (1 - settled)).toFixed(2)}px)` : "";
    };
    let albumKey = "";
    const drawBar = (frame: BarFrame, ms: number) => {
      row.style.visibility = "visible";
      row.style.transform = `translate(${frame.left}px, ${frame.top}px)`;
      row.style.width = `${frame.width}px`;
      parts.fill.style.left = `${frame.fillLeft}px`;
      parts.fill.style.width = `${Math.max(0, frame.width - frame.fillLeft - frame.fillRight)}px`;
      parts.fill.style.setProperty("--og-story-over", `${(frame.over * 100).toFixed(1)}%`);
      parts.fill.style.setProperty("--og-story-over-amount", frame.over.toFixed(3));
      pop(parts.avatar, 0, frame.avatar);
      // The album, like Spotify after it, only ever slides and fades; it never scales.
      parts.album.style.transform = `translateX(${frame.albumX}px)`;
      parts.album.style.opacity = String(frame.albumIn ? frame.album : 0);
      // Spotify's blocks change width to move sides. The right one pops in at full size in its slot, the fill drawing
      // back off it, and only narrows once it has popped.
      const rightWidth = frame.brand < 0.995 ? metrics.control : frame.brandRight;
      parts.brandRight.style.width = `${rightWidth}px`;
      pop(parts.brandRight, frame.width - rightWidth, frame.brandRight > 0.5 ? frame.brand : 0);
      parts.brandLeft.style.width = `${frame.brandLeft}px`;
      // The left block moves and fades but never scales: at the flip it slides out whole under the bar's left edge.
      parts.brandLeft.style.transform = `translateX(${frame.brandLeftX}px)`;
      parts.brandLeft.style.opacity = String(frame.brandLeft > 0.1 ? frame.brandLeftPop : 0);
      parts.brandRightPlaying.style.opacity = parts.brandLeftPlaying.style.opacity = String(frame.playing);
      pop(parts.mark, metrics.inset, frame.mark);
      parts.copy.style.left = `${frame.textLeft}px`;
      parts.copy.style.right = `${frame.actionRight}px`;
      // The album's art swap: the next cover's cells appear over the last in a fixed cluster order.
      const { under, over, shown } = albumAt(ms), key = `${under}:${over}:${shown}`;
      if (key !== albumKey) {
        albumKey = key;
        parts.albumUnder.style.backgroundImage = `url("${ALBUMS[under]}")`;
        const colors = currentGlyphPalette();
        ALBUM_CELL_ORDER.forEach((cell, rank) => {
          // The newest few cells flash a palette colour before showing the art, as the site's swap does; once every cell
          // is in, none flash, or the last few stay coloured.
          const element = cells[cell], flash = shown < cells.length && rank < shown && rank >= shown - 3 && cell % 5 === 0 && colors.length > 0;
          element.style.backgroundImage = flash ? "none" : `url("${ALBUMS[over]}")`;
          element.style.backgroundColor = flash ? colors[cell % colors.length] : "";
          element.style.opacity = rank < shown ? "1" : "0";
        });
      }
    };

    const run = async () => {
      await Promise.all([document.fonts.ready, ...media.map(item => item?.ready), ...ALBUMS.map(src => { const image = new window.Image(); image.src = src; return image.decode().catch(() => {}); })]);
      // The capture script starts its virtual clock only once this is set.
      window.__ogReady = true;
      for (;;) {
        [...letters, ...urlLetters].forEach(letter => { letter.style.visibility = "hidden"; });
        let named = false, said = "";
        const start = await nextFrame();
        for (let time = start; ; time = await nextFrame()) {
          signal.throwIfAborted();
          const ms = time - start;
          drawBar(barAt(ms, width, height, metrics, SHAPE), ms);
          const words = storyCopy(ms, COPY, SHAPE), key = JSON.stringify(words);
          if (key !== said) { said = key; setCopy(words); }
          // The grid's blur and warp follow how fast it is moving.
          const grid = gridAt(ms, height, metrics, SHAPE), intensity = motionAt(grid, ms);
          blur.setAttribute("stdDeviation", `0 ${grid ? (Math.min(36, grid.speed / 60 * 0.4) * intensity).toFixed(2) : 0}`);
          canvas.style.filter = intensity > 0.01 ? `url(#${filterId})` : "";
          const tiles = grid ? gridTiles(grid, SHAPE, width, height) : [];
          const paint = () => paintWarped(ink, width, height, ratio, tiles.map(({ project, left, top }) => ({ left, top, size: grid!.size, fill, image: media[project]?.image() })), intensity);
          // Under the capture, the tiles are painted once their clips have seeked to this instant; clips start as the grid comes in.
          const settled = Promise.all(tiles.map(({ project }) => media[project]?.seek(Math.max(0, ms - GRID_AT))));
          if (capturing) { const drawn = settled.then(paint); window.__ogSettle = () => drawn; } else paint();
          // The name sits behind the grid, shown only once the last tile covers it (earlier, it would flicker through the
          // gaps between pages), so the tile slides off it.
          if (!named && ms >= schedule.outAt) { named = true; letters.forEach(letter => { letter.style.visibility = ""; }); }
          if (ms >= schedule.endAt) break;
        }
        row.style.visibility = "hidden";
        await wait(NAME_HOLD_MS, signal);
        // The name glitches out, then the address glitches into the same spot; overlapping them, as the reel overlaps
        // its letters and grid, mixed the two texts' letters.
        await glitchInPlace(letters, signal, "out");
        await wait(PLACE_STAGGER_MS * 2, signal);
        await glitchInPlace(urlLetters, signal, "in");
        await wait(URL_HOLD_MS, signal);
        await glitchInPlace(urlLetters, signal, "out");
        await wait(BLANK_MS, signal);
        window.__ogLoops = (window.__ogLoops ?? 0) + 1;
      }
    };
    run().catch(error => { if (!signal.aborted) throw error; });
    return () => {
      controller.abort();
      media.forEach(item => item?.stop());
      canvas.remove(); reelStage.querySelector(".og-reel-filters")?.remove();
      window.__ogSettle = undefined;
    };
  }, []);

  return (
    <main ref={root} className="og-card og-story">
      <div ref={stage} className="og-reel-stage" aria-hidden="true" />
      <div ref={bar} className="og-story-bar" aria-hidden="true">
        {/* Back to front: the fill, the dot and text, then Spotify, the album and the avatar. As in the site's header,
            the squares sit above the text, so at the flip to the filter the label slides under the popping square. */}
        <span className="og-story-fill" data-part="fill" />
        <span className="work-control-dot og-story-mark" data-part="mark" />
        {/* One row, so the label gives way to the right-hand text rather than running under it. */}
        <span className="og-story-copy" data-part="copy">
          <span className="og-story-label text-bodySans">
            <Scrambled text={copy.lead} className="og-story-lead" />
            <Scrambled text={copy.trail} className={`og-story-trail${copy.lead ? ` og-story-trail-${copy.trailGap}` : ""}`} />
          </span>
          <span className={`og-story-action og-story-action-${copy.actionKind} ${copy.actionKind === "name" ? "text-bodySerif" : copy.actionKind === "label" ? "text-bodySans" : "text-captionSans"}`}>
            <Scrambled text={copy.action} quiet={copy.tick} />
          </span>
        </span>
        <Brand part="brand-right" />
        <Brand part="brand-left" />
        <span className="og-story-square og-story-album" data-part="album" style={{ "--og-story-album-grid": ALBUM_GRID } as CSSProperties}>
          <span className="og-story-album-art" data-part="album-under" />
          {CELLS.map(({ x, y }, index) => <span key={index} className="og-story-album-cell" data-album-cell=""
            style={{ backgroundPosition: `${x}% ${y}%` }} />)}
        </span>
        <span className="og-story-square og-story-avatar" data-part="avatar"><Image src="/images/redesign/avatar.webp" width={384} height={384} alt="" unoptimized priority /></span>
      </div>
      {/* The name and the address share one place in the middle of the card, behind the grid. */}
      <div className="og-story-ending">
        <InspectableText>
          <p ref={title} className="og-card-title og-story-name">
            {WORDS.map(({ text, face }, word) => (
              <span key={word} className={face}>
                {Array.from(text).map((char, index) => <span key={index} data-letter="">{char}</span>)}
              </span>
            ))}
          </p>
        </InspectableText>
        <InspectableText>
          <p ref={url} className="og-card-title og-story-name">
            <span className="og-card-serif">{Array.from(URL).map((char, index) => <span key={index} data-letter="" style={{ visibility: "hidden" }}>{char}</span>)}</span>
          </p>
        </InspectableText>
      </div>
    </main>
  );
}
