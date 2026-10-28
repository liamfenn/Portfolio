import type { PortfolioVideoAsset } from "./media-assets";
import { mediaUrl } from "./media-delivery";
import { rankVideos, VIDEO_POLICY, videoRendition } from "./video-policy";

export type VideoDisplayState = "loading" | "ready" | "poster";
type Entry = {
  video: HTMLVideoElement;
  asset: PortfolioVideoAsset;
  visible: number;
  near: boolean;
  distance: number;
  priority: boolean;
  failed: boolean;
  wanted: boolean;
  loading: boolean;
  ready: boolean;
  width: number;
  retries: number;
  generation: number;
  resumeTime?: number;
  frame?: number;
  timer?: ReturnType<typeof setTimeout>;
  release?: ReturnType<typeof setTimeout>;
  cover?: HTMLCanvasElement;
  coverFrame?: number;
  coverPaint?: number;
  coverTimer?: ReturnType<typeof setTimeout>;
  coverHeld?: boolean;
  coverPresent?: () => void;
  display?: (state: VideoDisplayState) => void;
};
type Connection = EventTarget & { saveData?: boolean };

/** One coordinator owns observers, load slots, and decoder slots for the whole grid. */
class VideoPlayback {
  private entries = new Map<Element, Entry>();
  private motion = matchMedia("(prefers-reduced-motion: reduce)");
  private mobile = matchMedia("(max-width: 767px)");
  private connection = (navigator as Navigator & { connection?: Connection }).connection;
  private frame = 0;
  private active = true;
  private resizeTimer?: ReturnType<typeof setTimeout>;
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
      video, asset, visible: 0, near: false, distance: Infinity, priority: false,
      failed: false, wanted: false, loading: false, ready: false, width: 0, retries: 0, generation: 0, display,
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
    const intent = () => { entry.failed = false; entry.retries = 0; this.schedule(); };
    video.addEventListener("loadeddata", ready);
    video.addEventListener("error", error);
    const intentTarget = video.closest("a, button") ?? video.parentElement!;
    intentTarget.addEventListener("pointerdown", intent);
    return {
      priority: (value: boolean) => {
        entry.priority = value;
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

  preserveFrame(video: HTMLVideoElement, hold = false) {
    const entry = this.entries.get(video);
    if (!entry) return;
    // Closing during a resolution upgrade must hold its existing cover too.
    if (entry.cover && hold) {
      if (entry.coverFrame !== undefined) video.cancelVideoFrameCallback(entry.coverFrame);
      if (entry.coverPaint !== undefined) cancelAnimationFrame(entry.coverPaint);
      entry.coverFrame = entry.coverPaint = undefined;
      entry.coverHeld = true;
      return entry.coverPresent;
    }
    if (video.dataset.frameReady !== "true" || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || !video.videoWidth) return;
    this.clearCover(entry);
    const cover = document.createElement("canvas");
    cover.width = video.videoWidth;
    cover.height = video.videoHeight;
    const context = cover.getContext("2d");
    if (!context) return;
    try { context.drawImage(video, 0, 0); } catch { return; }
    cover.className = "project-preview-handoff";
    cover.setAttribute("aria-hidden", "true");
    video.parentElement!.appendChild(cover);
    entry.cover = cover;
    entry.coverHeld = hold;
    // Keep the last real frame over Safari's video surface while it changes compositing parents.
    const present = () => {
      if (entry.cover !== cover) return;
      entry.coverHeld = false;
      const presented = () => {
        entry.coverFrame = undefined;
        // Give the reparented video two paint opportunities before uncovering its native surface.
        entry.coverPaint = requestAnimationFrame(() => {
          entry.coverPaint = requestAnimationFrame(() => this.clearCover(entry));
        });
      };
      if ("requestVideoFrameCallback" in video) entry.coverFrame = video.requestVideoFrameCallback(presented);
      else entry.coverPaint = requestAnimationFrame(presented);
    };
    entry.coverPresent = present;
    if (!hold) present();
    entry.coverTimer = setTimeout(() => this.clearCover(entry), VIDEO_POLICY.loadTimeout);
    return present;
  }

  private clearCover(entry: Entry) {
    const hadCover = Boolean(entry.cover);
    if (entry.coverFrame !== undefined) entry.video.cancelVideoFrameCallback(entry.coverFrame);
    if (entry.coverPaint !== undefined) cancelAnimationFrame(entry.coverPaint);
    clearTimeout(entry.coverTimer);
    entry.cover?.remove();
    entry.cover = entry.coverFrame = entry.coverPaint = entry.coverTimer = undefined;
    entry.coverHeld = false;
    entry.coverPresent = undefined;
    if (hadCover) this.schedule();
  }

  private measure(entry: Entry) {
    const box = entry.video.getBoundingClientRect();
    const visibleHeight = Math.max(0, Math.min(box.bottom, innerHeight) - Math.max(box.top, 0));
    const visibleWidth = Math.max(0, Math.min(box.right, innerWidth) - Math.max(box.left, 0));
    entry.visible = box.width && box.height ? visibleHeight * visibleWidth / (box.width * box.height) : 0;
    entry.near = box.bottom > -VIDEO_POLICY.prepareMargin && box.top < innerHeight + VIDEO_POLICY.prepareMargin && box.right > 0 && box.left < innerWidth;
    entry.distance = Math.abs((box.top + box.bottom) / 2 - innerHeight / 2);
  }

  private onScroll = () => this.schedule();
  private onPolicy = (event?: Event) => {
    if (event?.type === "pageshow") this.active = true;
    if (document.hidden || this.motion.matches || this.connection?.saveData) {
      this.entries.forEach(entry => this.release(entry));
    }
    this.schedule();
  };
  private onPageHide = () => { this.active = false; this.entries.forEach(entry => this.release(entry)); };

  private schedule() {
    if (!this.frame) this.frame = requestAnimationFrame(() => { this.frame = 0; this.update(); });
  }

  private update() {
    const all = [...this.entries.values()];
    all.forEach(entry => this.measure(entry));
    if (!this.active || document.hidden || this.motion.matches || this.connection?.saveData) {
      all.forEach(entry => { if (entry.video.dataset.playback !== "poster") this.release(entry); });
      return;
    }
    const ranked = rankVideos(all);
    const limit = this.mobile.matches ? VIDEO_POLICY.mobileLimit : VIDEO_POLICY.desktopLimit;
    const playing = new Set(ranked.filter(entry => entry.visible > 0).slice(0, limit));
    // Warm just one upcoming tile, without filling the load queue with offscreen cards.
    const upcoming = ranked.find(entry => !entry.visible);
    const prepared = new Set([...playing, ...(upcoming ? [upcoming] : [])]);
    for (const entry of all) {
      entry.wanted = playing.has(entry);
      if (!entry.wanted) this.pause(entry);
      if (!prepared.has(entry)) {
        if (!entry.width) entry.display?.("poster");
        if (entry.loading) this.release(entry);
        if (entry.width && !entry.release) entry.release = setTimeout(() => {
          this.release(entry); this.schedule();
        }, VIDEO_POLICY.releaseDelay);
      } else { clearTimeout(entry.release); entry.release = undefined; }
    }
    let loading = all.filter(entry => entry.loading).length;
    for (const entry of ranked.filter(entry => prepared.has(entry))) {
      const rung = videoRendition(entry.asset, entry.video.clientWidth, devicePixelRatio, entry.width);
      if (!rung) continue;
      if (loading < VIDEO_POLICY.loadLimit && !entry.loading && !entry.coverHeld && (!entry.width || rung.width > entry.width)) {
        this.load(entry, rung.h264, rung.width);
        loading++;
      } else if (entry.ready && entry.wanted) this.play(entry);
    }
  }

  private load(entry: Entry, source: string, width: number) {
    const resumeTime = entry.video.currentTime;
    // Resolution upgrades retain the current picture instead of briefly revealing an unrelated poster.
    if (entry.video.dataset.frameReady === "true") this.preserveFrame(entry.video, true);
    entry.coverHeld = false;
    this.release(entry, Boolean(entry.cover));
    entry.resumeTime = resumeTime;
    entry.width = width;
    entry.loading = true;
    entry.video.dataset.playback = "loading";
    entry.display?.(entry.cover ? "ready" : "loading");
    entry.video.preload = "auto";
    entry.video.src = mediaUrl(source);
    entry.video.load();
    entry.timer = setTimeout(() => this.fail(entry), VIDEO_POLICY.loadTimeout);
  }

  private play(entry: Entry) {
    if (!entry.video.paused || entry.failed || !entry.wanted) return;
    const generation = entry.generation;
    const reveal = () => {
      entry.frame = undefined;
      if (generation === entry.generation && entry.wanted && !entry.video.paused) {
        entry.video.dataset.frameReady = "true";
        entry.video.dataset.playback = "playing";
        entry.display?.("ready");
        if (entry.cover && !entry.coverHeld && entry.coverFrame === undefined) {
          entry.coverPaint = requestAnimationFrame(() => {
            entry.coverPaint = requestAnimationFrame(() => this.clearCover(entry));
          });
        }
      }
    };
    void entry.video.play().then(() => {
      if (generation !== entry.generation || !entry.wanted) return;
      if ("requestVideoFrameCallback" in entry.video) entry.frame = entry.video.requestVideoFrameCallback(reveal);
      else reveal();
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
    entry.frame = undefined;
    // Pausing retains a decoded frame; only a source release should expose the poster again.
    if (entry.ready && !entry.failed) entry.video.dataset.playback = "paused";
  }

  private release(entry: Entry, keepCover = false) {
    if (!keepCover) this.clearCover(entry);
    entry.generation++;
    this.pause(entry);
    delete entry.video.dataset.frameReady;
    clearTimeout(entry.timer);
    clearTimeout(entry.release);
    entry.timer = entry.release = undefined;
    entry.loading = entry.ready = false;
    entry.width = 0;
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
export function registerVideo(video: HTMLVideoElement, asset: PortfolioVideoAsset, display?: Entry["display"]) {
  coordinator ??= new VideoPlayback();
  return coordinator.register(video, asset, display);
}

export function preserveVideoFrame(video: HTMLVideoElement, hold = false) {
  return coordinator?.preserveFrame(video, hold);
}
