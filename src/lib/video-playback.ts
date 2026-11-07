import type { PortfolioVideoAsset } from "./media-assets";
import { mediaUrl } from "./media-delivery";
import { rankVideos, VIDEO_POLICY, videoRendition } from "./video-policy";
import { preserveReorderedVideoFrames } from "./video-reorder";
import { alphaVideoFormat, videoSource } from "./video-alpha";
import type { AlphaVideoFormat } from "./video-alpha";

export type VideoDisplayState = "loading" | "ready" | "poster";
type Entry = {
  video: HTMLVideoElement;
  asset: PortfolioVideoAsset;
  visible: number;
  near: boolean;
  distance: number;
  priority: boolean;
  focused: boolean;
  warm: boolean;
  intentPriority: boolean;
  focusWidth?: number;
  focusMoving?: boolean;
  warmWidth?: number;
  failed: boolean;
  wanted: boolean;
  loading: boolean;
  ready: boolean;
  width: number;
  source?: string;
  alphaFormat?: AlphaVideoFormat | "h264";
  retries: number;
  generation: number;
  resumeTime?: number;
  frame?: number;
  paint?: number;
  timer?: ReturnType<typeof setTimeout>;
  /** When this entry was last prepared; the least recently used offscreen sources release first. */
  used: number;
  cover?: HTMLCanvasElement;
  display?: (state: VideoDisplayState) => void;
};
type Connection = EventTarget & { saveData?: boolean };

/** One coordinator owns observers, startup load slots, and viewport playback for the whole grid. */
class VideoPlayback {
  private entries = new Map<Element, Entry>();
  private motion = matchMedia("(prefers-reduced-motion: reduce)");
  private mobile = matchMedia("(max-width: 767px)");
  private connection = (navigator as Navigator & { connection?: Connection }).connection;
  private frame = 0;
  private active = true;
  private resizeTimer?: ReturnType<typeof setTimeout>;
  private alphaFormat?: AlphaVideoFormat | null;
  private probingAlpha = false;
  private focusSession = focusSessionActive;
  private observer = new IntersectionObserver(changes => {
    for (const change of changes) {
      const entry = this.entries.get(change.target);
      if (!entry) continue;
      entry.near = change.isIntersecting;
      this.measure(entry);
    }
    this.schedule();
  }, { rootMargin: `${VIDEO_POLICY.prepareMargin}px 0px` });
  private resize = new ResizeObserver(() => {
    clearTimeout(this.resizeTimer);
    this.resizeTimer = setTimeout(() => {
      this.entries.forEach(entry => this.measure(entry));
      this.schedule();
    }, VIDEO_POLICY.resizeDelay);
  });

  constructor() {
    window.addEventListener("scroll", this.onScroll, { passive: true, capture: true });
    window.addEventListener("resize", this.onScroll, { passive: true });
    document.addEventListener("visibilitychange", this.onPolicy);
    window.addEventListener("pagehide", this.onPageHide);
    window.addEventListener("pageshow", this.onPolicy);
    this.motion.addEventListener("change", this.onPolicy);
    this.mobile.addEventListener("change", this.onPolicy);
    this.connection?.addEventListener("change", this.onPolicy);
  }

  register(video: HTMLVideoElement, asset: PortfolioVideoAsset, display?: Entry["display"]) {
    const entry: Entry = {
      video, asset, visible: 0, near: false, distance: Infinity, priority: false, focused: false, warm: false, intentPriority: false,
      failed: false, wanted: false, loading: false, ready: false, width: 0, retries: 0, generation: 0, used: 0, display,
    };
    this.entries.set(video, entry);
    this.observer.observe(video);
    this.resize.observe(video.parentElement!);
    const ready = () => {
      if (!entry.loading) return;
      entry.loading = false;
      entry.ready = true;
      entry.video.dataset.playback = "ready";
      if (entry.resumeTime) entry.video.currentTime = entry.resumeTime % entry.video.duration;
      entry.resumeTime = undefined;
      clearTimeout(entry.timer);
      entry.timer = undefined;
      if (entry.wanted) this.play(entry);
      this.schedule();
    };
    const error = () => this.fail(entry);
    const intent = () => {
      entry.failed = false; entry.retries = 0;
      if (entry.asset.alpha && this.alphaFormat === null) this.alphaFormat = undefined;
      this.schedule();
    };
    video.addEventListener("loadeddata", ready);
    video.addEventListener("error", error);
    const intentTarget = video.closest("a, button, summary") ?? video.parentElement!;
    intentTarget.addEventListener("pointerdown", intent);
    return {
      priority: (value: boolean) => {
        entry.intentPriority = value;
        if (value && entry.failed) { entry.failed = false; entry.retries = 0; }
        this.schedule();
      },
      dispose: () => {
        this.observer.unobserve(video);
        this.resize.unobserve(video.parentElement!);
        video.removeEventListener("loadeddata", ready);
        video.removeEventListener("error", error);
        intentTarget.removeEventListener("pointerdown", intent);
        this.release(entry);
        this.entries.delete(video);
        if (!this.entries.size) this.destroy();
        else this.schedule();
      },
    };
  }

  focus(video: HTMLVideoElement, width?: number, moving = false) {
    const entry = this.entries.get(video);
    if (!entry) return;
    entry.focusWidth = width;
    entry.focusMoving = moving;
    if (width !== undefined && !entry.cover && entry.video.dataset.frameReady !== "true") entry.display?.("poster");
    this.schedule();
  }

  focusSessionChanged(active: boolean) {
    this.focusSession = active;
    this.schedule();
  }

  /** Loads an offscreen video ahead of use, sized for where it's headed. Its poster stays up until it plays. */
  warm(video: HTMLVideoElement, width?: number) {
    const entry = this.entries.get(video);
    if (!entry) return;
    entry.warmWidth = width;
    if (width !== undefined && entry.loading && !entry.cover) entry.display?.("poster");
    this.schedule();
  }

  reorder() {
    const clear = !this.active || document.hidden || this.motion.matches || this.connection?.saveData
      ? () => {}
      : preserveReorderedVideoFrames([...this.entries.values()].map(entry => entry.video));
    // CSS order can change visibility without crossing an IntersectionObserver threshold.
    this.schedule();
    return clear;
  }

  private captureUpgrade(entry: Entry) {
    const video = entry.video;
    if (entry.cover || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || !video.videoWidth) return;
    const cover = document.createElement("canvas");
    cover.width = video.videoWidth;
    cover.height = video.videoHeight;
    const context = cover.getContext("2d");
    if (!context) return;
    try { context.drawImage(video, 0, 0); } catch { return; }
    cover.className = "project-preview-upgrade";
    cover.setAttribute("aria-hidden", "true");
    video.parentElement!.appendChild(cover);
    entry.cover = cover;
  }

  private clearCover(entry: Entry) {
    entry.cover?.remove();
    entry.cover = undefined;
  }

  private measure(entry: Entry) {
    entry.focused = entry.focusWidth !== undefined;
    entry.warm = entry.warmWidth !== undefined;
    entry.priority = entry.intentPriority || entry.focusWidth !== undefined || entry.warmWidth !== undefined;
    const box = entry.video.getBoundingClientRect();
    const visibleHeight = Math.max(0, Math.min(box.bottom, innerHeight) - Math.max(box.top, 0));
    const visibleWidth = Math.max(0, Math.min(box.right, innerWidth) - Math.max(box.left, 0));
    entry.visible = box.width && box.height ? visibleHeight * visibleWidth / (box.width * box.height) : 0;
    entry.near = entry.warmWidth !== undefined || box.bottom > -VIDEO_POLICY.prepareMargin && box.top < innerHeight + VIDEO_POLICY.prepareMargin && box.right > 0 && box.left < innerWidth;
    entry.distance = Math.abs((box.top + box.bottom) / 2 - innerHeight / 2);
  }

  private onScroll = () => this.schedule();
  private onPolicy = (event?: Event) => {
    if (event?.type === "pageshow") this.active = true;
    if (this.motion.matches || this.connection?.saveData) this.entries.forEach(entry => this.release(entry));
    // A background tab only pauses: the browser already idles paused media, and returning shouldn't reload every clip.
    else if (document.hidden) this.entries.forEach(entry => this.pause(entry));
    this.schedule();
  };
  private onPageHide = () => { this.active = false; this.entries.forEach(entry => this.release(entry)); };

  private schedule() {
    if (!this.frame) this.frame = requestAnimationFrame(() => { this.frame = 0; this.update(); });
  }

  private update() {
    const all = [...this.entries.values()];
    all.forEach(entry => this.measure(entry));
    if (!this.active || this.motion.matches || this.connection?.saveData) {
      all.forEach(entry => { if (entry.video.dataset.playback !== "poster") this.release(entry); });
      return;
    }
    if (document.hidden) { all.forEach(entry => this.pause(entry)); return; }
    // Probe early on desktop, so a focused clip can switch to real alpha without waiting.
    if (!this.mobile.matches && all.some(entry => entry.asset.alpha)) this.probeAlpha();
    const focused = this.focusSession || all.some(entry => entry.focused);
    const ranked = rankVideos(all, focused);
    // Behind an opaque focus session, the grid is not visible. Warm neighbors load but do not decode continuously.
    const playing = new Set(ranked.filter(entry => entry.visible > 0 && (!focused || entry.focused)));
    // Warm the next few tiles, plus any requested ones, without filling the load queue with far-off cards.
    const upcoming = ranked.filter(entry => !entry.visible).slice(0, VIDEO_POLICY.upcoming);
    const prepared = new Set([...playing, ...upcoming, ...ranked.filter(entry => entry.warmWidth !== undefined)]);
    const now = performance.now();
    for (const entry of all) {
      entry.wanted = playing.has(entry);
      if (!entry.wanted) this.pause(entry);
      if (prepared.has(entry)) entry.used = now;
      else {
        if (!entry.width) entry.display?.("poster");
        if (entry.loading) this.release(entry);
      }
    }
    // Loaded clips stay attached (paused, on their last frame) up to a cap, so scrolling back resumes instantly.
    all.filter(entry => entry.width && !prepared.has(entry)).sort((a, b) => b.used - a.used)
      .slice(VIDEO_POLICY.retain).forEach(entry => this.release(entry));
    let loading = all.filter(entry => entry.loading).length;
    for (const entry of ranked.filter(entry => prepared.has(entry))) {
      const rung = videoRendition(entry.asset, entry.focusWidth ?? entry.warmWidth ?? entry.video.clientWidth, devicePixelRatio, entry.width);
      if (!rung) continue;
      const transparent = this.transparent(entry);
      if (transparent && this.alphaFormat === undefined) {
        // Keep whatever is already playing rather than loading the matte and then the alpha file.
        this.probeAlpha();
        if (!entry.source) entry.display?.("poster");
        else if (entry.ready && entry.wanted) this.play(entry);
        continue;
      }
      const format = transparent ? this.alphaFormat ?? null : null;
      const source = videoSource(rung, format);
      if (!source) {
        entry.failed = true;
        entry.display?.("poster");
        continue;
      }
      // Nothing new starts mid-flight: building a video surface then can stall Safari long enough to lose the tween.
      if (loading < VIDEO_POLICY.loadLimit && !entry.loading && !entry.focusMoving && (!entry.width || rung.width > entry.width || entry.source !== source)) {
        this.load(entry, source, rung.width, format && source === rung[format] ? format : "h264");
        loading++;
      } else if (entry.ready && entry.wanted) this.play(entry);
    }
  }

  /**
   * Real alpha only where the clip leaves its tile: the desktop focused view raises it above the header. Once
   * loaded it stays until released, so closing a project doesn't swap sources mid-return.
   */
  private transparent(entry: Entry) {
    if (!entry.asset.alpha || this.mobile.matches) return false;
    return entry.focusWidth !== undefined || entry.warmWidth !== undefined || Boolean(entry.source && entry.alphaFormat !== "h264");
  }

  private probeAlpha() {
    if (this.alphaFormat !== undefined || this.probingAlpha) return;
    this.probingAlpha = true;
    void alphaVideoFormat().then(format => { this.probingAlpha = false; this.alphaFormat = format; this.schedule(); });
  }

  private load(entry: Entry, source: string, width: number, format: AlphaVideoFormat | "h264") {
    const resumeTime = entry.video.currentTime;
    // Resolution upgrades retain the current picture instead of briefly revealing an unrelated poster.
    if (entry.video.dataset.frameReady === "true") this.captureUpgrade(entry);
    this.release(entry, Boolean(entry.cover));
    entry.resumeTime = resumeTime;
    entry.width = width;
    entry.source = source;
    entry.alphaFormat = format;
    if (!entry.cover) entry.video.dataset.alphaFormat = format;
    entry.loading = true;
    entry.video.dataset.playback = "loading";
    // Focused media keeps its poster up while loading, so paging never reveals the loading surface.
    entry.display?.(entry.cover ? "ready" : entry.focusWidth !== undefined || entry.warmWidth !== undefined ? "poster" : "loading");
    entry.video.preload = "auto";
    entry.video.src = mediaUrl(source);
    entry.video.load();
    entry.timer = setTimeout(() => this.fail(entry), VIDEO_POLICY.loadTimeout);
  }

  private play(entry: Entry) {
    if (!entry.video.paused || entry.failed || !entry.wanted) return;
    if (entry.focusMoving && entry.video.dataset.frameReady !== "true") return;
    const generation = entry.generation;
    const reveal = () => {
      entry.frame = undefined;
      entry.paint = undefined;
      if (generation === entry.generation && entry.wanted && !entry.video.paused) {
        entry.video.dataset.alphaFormat = entry.alphaFormat;
        entry.video.dataset.frameReady = "true";
        entry.video.dataset.playback = "playing";
        entry.display?.("ready");
        this.clearCover(entry);
      }
    };
    void entry.video.play().then(() => {
      if (generation !== entry.generation || !entry.wanted || entry.video.paused) return;
      const presented = () => {
        entry.frame = undefined;
        if (generation !== entry.generation || !entry.wanted || entry.video.paused) return;
        // Keep startup covered while Safari paints its native surface; don't reveal and promote it together.
        if (entry.video.dataset.frameReady !== "true") {
          entry.paint = requestAnimationFrame(() => { entry.paint = requestAnimationFrame(reveal); });
        } else reveal();
      };
      if ("requestVideoFrameCallback" in entry.video) entry.frame = entry.video.requestVideoFrameCallback(presented);
      else presented();
    }).catch(error => {
      if (generation !== entry.generation || (error as DOMException).name === "AbortError") return;
      // Autoplay denial is a poster state, rather than an endless play/reject loop.
      entry.failed = true;
      this.pause(entry);
      this.clearCover(entry);
      delete entry.video.dataset.frameReady;
      entry.video.dataset.playback = "blocked";
      entry.display?.("poster");
      this.schedule();
    });
  }

  private pause(entry: Entry) {
    entry.video.pause();
    if (entry.frame !== undefined) entry.video.cancelVideoFrameCallback(entry.frame);
    if (entry.paint !== undefined) cancelAnimationFrame(entry.paint);
    entry.frame = undefined;
    entry.paint = undefined;
    // Pausing retains a decoded frame; only a source release should expose the poster again.
    if (entry.ready && !entry.failed) entry.video.dataset.playback = "paused";
  }

  private release(entry: Entry, keepCover = false) {
    if (!keepCover) this.clearCover(entry);
    entry.generation++;
    this.pause(entry);
    delete entry.video.dataset.frameReady;
    clearTimeout(entry.timer);
    entry.timer = undefined;
    entry.loading = entry.ready = false;
    entry.width = 0;
    entry.source = undefined;
    if (!keepCover) delete entry.video.dataset.alphaFormat;
    if (entry.video.hasAttribute("src")) {
      entry.video.removeAttribute("src");
      entry.video.load();
    }
    entry.video.preload = "none";
    entry.video.dataset.playback = "poster";
    entry.display?.(entry.cover ? "ready" : "poster");
  }

  private fail(entry: Entry) {
    if (!entry.width) return;
    this.release(entry);
    if (entry.retries++ >= 1) entry.failed = true;
    entry.video.dataset.playback = entry.failed ? "error" : "poster";
    this.schedule();
  }

  private destroy() {
    this.observer.disconnect();
    this.resize.disconnect();
    cancelAnimationFrame(this.frame);
    clearTimeout(this.resizeTimer);
    window.removeEventListener("scroll", this.onScroll, { capture: true });
    window.removeEventListener("resize", this.onScroll);
    document.removeEventListener("visibilitychange", this.onPolicy);
    window.removeEventListener("pagehide", this.onPageHide);
    window.removeEventListener("pageshow", this.onPolicy);
    this.motion.removeEventListener("change", this.onPolicy);
    this.mobile.removeEventListener("change", this.onPolicy);
    this.connection?.removeEventListener("change", this.onPolicy);
    coordinator = undefined;
  }
}

let coordinator: VideoPlayback | undefined;
let focusSessionActive = false;
export function registerVideo(video: HTMLVideoElement, asset: PortfolioVideoAsset, display?: Entry["display"]) {
  coordinator ??= new VideoPlayback();
  return coordinator.register(video, asset, display);
}

export function setVideoWarm(video: HTMLVideoElement, width?: number) {
  coordinator?.warm(video, width);
}

export function setVideoFocus(video: HTMLVideoElement, width?: number, moving = false) {
  coordinator?.focus(video, width, moving);
}

export function setVideoFocusSession(active: boolean) {
  focusSessionActive = active;
  coordinator?.focusSessionChanged(active);
}

export function refreshVideoOrder() {
  return coordinator?.reorder();
}
