import { setVideoFocus } from "./video-playback";

type Role = "current" | "outgoing" | "preview";
type Placement = {
  media: HTMLElement;
  slot: HTMLElement;
  style: string | null;
  width: number;
  height: number;
  moving: boolean;
  held?: boolean;
  animation?: Animation;
};

/** Positions original grid media without changing its DOM parent or copying its pixels. */
export class ProjectFocusMedia {
  private placements = new Map<HTMLElement, Placement>();
  private observer?: ResizeObserver;
  private frame = 0;

  start(scroller: HTMLElement) {
    const sync = () => this.schedule();
    const resize = () => {
      this.placements.forEach(placement => placement.animation?.finish());
      this.schedule();
    };
    this.observer = new ResizeObserver(sync);
    this.observer.observe(scroller);
    scroller.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", resize);
    return () => {
      scroller.removeEventListener("scroll", sync);
      window.removeEventListener("resize", resize);
      this.observer?.disconnect();
      cancelAnimationFrame(this.frame);
      this.frame = 0;
      [...this.placements.keys()].forEach(media => this.restore(media));
    };
  }

  attach(trigger: HTMLButtonElement, slot: HTMLElement, role: Role = "current") {
    const media = trigger.querySelector<HTMLElement>(".homepage-project-media")!;
    let placement = this.placements.get(media);
    if (!placement) {
      const bounds = media.getBoundingClientRect();
      placement = { media, slot, style: media.getAttribute("style"), width: bounds.width, height: bounds.height, moving: true };
      this.placements.set(media, placement);
      Object.assign(media.style, { width: `${bounds.width}px`, height: `${bounds.height}px` });
      this.observer?.observe(slot);
    } else if (placement.slot !== slot) {
      this.observer?.unobserve(placement.slot);
      this.observer?.observe(slot);
      placement.slot = slot;
    }
    media.dataset.focusMedia = role;
    placement.held = false;
    this.videoFocus(placement, true);
    this.position(placement, slot.getBoundingClientRect());
    return media;
  }

  private transform(placement: Placement, bounds: DOMRect) {
    return `translate(${bounds.left}px, ${bounds.top}px) scale(${bounds.width / placement.width}, ${bounds.height / placement.height})`;
  }

  private position(placement: Placement, bounds: DOMRect) {
    placement.media.style.transform = this.transform(placement, bounds);
  }

  private videoFocus(placement: Placement, moving: boolean) {
    placement.moving = moving;
    const video = placement.media.querySelector("video");
    if (video) setVideoFocus(video, placement.slot.clientWidth, moving);
  }

  animate(media: HTMLElement, from: DOMRect, to: DOMRect, timing: KeyframeAnimationOptions) {
    const placement = this.placements.get(media)!;
    placement.animation?.cancel();
    this.position(placement, to);
    this.videoFocus(placement, true);
    const animation = media.animate([{ transform: this.transform(placement, from) }, { transform: this.transform(placement, to) }], timing);
    placement.animation = animation;
    void animation.finished.then(() => {
      if (placement.animation !== animation) return;
      placement.animation = undefined;
      animation.cancel();
      this.position(placement, placement.held ? placement.media.parentElement!.getBoundingClientRect() : placement.slot.getBoundingClientRect());
    }).catch(() => {});
    return animation;
  }

  animateSlot(slot: HTMLElement, from: DOMRect, to: DOMRect, timing: KeyframeAnimationOptions) {
    const placement = [...this.placements.values()].find(placement => placement.slot === slot);
    return placement ? this.animate(placement.media, from, to, timing) : undefined;
  }

  hold(media: HTMLElement) {
    const placement = this.placements.get(media)!;
    const bounds = media.getBoundingClientRect();
    placement.animation?.cancel();
    placement.animation = undefined;
    placement.held = true;
    this.position(placement, bounds);
    this.videoFocus(placement, true);
  }

  settle(media: HTMLElement) {
    const placement = this.placements.get(media);
    if (!placement) return;
    placement.held = false;
    this.position(placement, placement.slot.getBoundingClientRect());
    this.videoFocus(placement, false);
  }

  sync() {
    this.placements.forEach(placement => {
      if (!placement.animation && !placement.held) {
        this.position(placement, placement.slot.getBoundingClientRect());
        this.videoFocus(placement, placement.moving);
      }
    });
  }

  private schedule() {
    if (!this.frame) this.frame = requestAnimationFrame(() => { this.frame = 0; this.sync(); });
  }

  restore(media: HTMLElement, slot?: HTMLElement) {
    const placement = this.placements.get(media);
    if (!placement || (slot && placement.slot !== slot)) return;
    placement.animation?.cancel();
    this.observer?.unobserve(placement.slot);
    delete media.dataset.focusMedia;
    if (placement.style === null) media.removeAttribute("style");
    else media.setAttribute("style", placement.style);
    const video = media.querySelector("video");
    if (video) setVideoFocus(video);
    this.placements.delete(media);
  }
}
