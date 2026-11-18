"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { InspectableText } from "@/components/design-inspector";
import { useProjectDisplayState } from "@/components/project-display-state";
import { usePortfolioExperiments } from "@/components/portfolio-experiments";
import { ProjectFilterControl } from "@/components/project-filter-control";
import { useColorScramble } from "@/hooks/use-color-scramble";
import { FILTER_SCRAMBLE } from "@/lib/text-scramble";
import { scrollToTop } from "@/lib/scroll-to-top";

const EMAIL_HREF = "mailto:info@fennell.cv";

function ProjectDetail({ text, feedLabel = false }: { text: string | null; feedLabel?: boolean }) {
  const reducedMotion = useReducedMotion();
  // Blanks of the outgoing length let it scramble out instead of clearing in one frame.
  const [shown, setShown] = useState("");
  if (text && text !== shown) setShown(text);
  const { ref } = useColorScramble({
    ...FILTER_SCRAMBLE, text: text ?? " ".repeat(shown.length), ignore: [], playOnMount: false, speed: reducedMotion ? 0 : FILTER_SCRAMBLE.speed,
  });
  return <InspectableText text={text ?? ""}><span ref={ref} className={feedLabel ? "header-feed-label" : "header-project-detail"} aria-hidden={!feedLabel}>{text ?? ""}</span></InspectableText>;
}

export function PortfolioHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [pastToolbar, setPastToolbar] = useState(false);
  const [feedProject, setFeedProject] = useState<string | null>(null);
  const header = useRef<HTMLDivElement>(null);
  const cancelTopScroll = useRef<() => void>(() => {});
  const reducedMotion = useReducedMotion();
  const { focusedProject } = useProjectDisplayState();
  const { feedLayout } = usePortfolioExperiments();
  const showFilters = feedLayout === "current";
  const overImages = showFilters ? pastToolbar : feedProject !== null;
  const showFeedLabel = !showFilters && !focusedProject;
  const period = focusedProject && `${focusedProject.quarter ? `Q${focusedProject.quarter} ` : ""}${String(focusedProject.year).slice(-2)}`;
  const actionLabel = period ?? (overImages ? "Top" : "Contact");
  const { ref: actionText } = useColorScramble({
    ...FILTER_SCRAMBLE, text: actionLabel, ignore: [], playOnMount: false, speed: reducedMotion ? 0 : FILTER_SCRAMBLE.speed,
  });

  useEffect(() => {
    return () => cancelTopScroll.current();
  }, []);

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 0);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  useEffect(() => {
    if (!showFilters) return;
    const bar = header.current;
    const toolbar = document.querySelector<HTMLElement>(".feed-toolbar");
    if (!bar || !toolbar) return;
    const mobile = matchMedia("(max-width: 767px)");
    let observer: IntersectionObserver | undefined;
    const observe = () => {
      observer?.disconnect();
      // The swap happens while the page's filter is fully behind the opaque bar, so it never shows through the translucent one.
      const line = Math.round(bar.getBoundingClientRect().bottom);
      observer = new IntersectionObserver(([entry]) => {
        setPastToolbar(!entry.isIntersecting && entry.boundingClientRect.top < line);
      }, { rootMargin: `-${line}px 0px 0px 0px` });
      observer.observe(toolbar);
    };
    observe();
    mobile.addEventListener("change", observe);
    return () => {
      observer?.disconnect();
      mobile.removeEventListener("change", observe);
    };
  }, [showFilters]);

  useEffect(() => {
    if (showFilters) return;
    const bar = header.current;
    const feed = document.querySelector<HTMLElement>(".feed-projects");
    if (!bar || !feed) return;
    const cards = Array.from(feed.querySelectorAll<HTMLElement>("[data-project-label]"));
    let frame: number | null = null;
    const update = () => {
      frame = null;
      const line = bar.getBoundingClientRect().bottom;
      let label = null;
      if (feed.getBoundingClientRect().bottom > line) {
        // Hold the preceding title through its inline copy and the gap before the next media tile.
        for (const card of cards) {
          if (card.getBoundingClientRect().top > line) break;
          label = card.dataset.projectLabel ?? null;
        }
      }
      setFeedProject(label);
    };
    const schedule = () => {
      if (frame === null) frame = requestAnimationFrame(update);
    };
    const observer = new ResizeObserver(schedule);
    observer.observe(feed);
    observer.observe(bar);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    schedule();
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [showFilters]);

  return <div ref={header} className={`portfolio-header${scrolled ? " is-scrolled" : ""}${overImages ? " is-over-images" : ""}${focusedProject ? " is-project-focus" : ""}${showFeedLabel ? " has-feed-label" : ""}`}>
    <span className="header-fill" aria-hidden="true" />
    <button className="header-avatar hover-surface" type="button" data-inspector-toggle aria-label="Open design controls" inert={overImages}>
      <Image src="/images/redesign/avatar.webp" width={384} height={384} alt="Liam Fennell" priority unoptimized />
    </button>
    <div id="project-focus-header" className={`header-label ${overImages || focusedProject ? "text-bodySans" : "text-bodySerif"}`} inert={showFilters && !overImages && !focusedProject}>
      {showFeedLabel ? <ProjectDetail text={feedProject ?? "Liam Fennell"} feedLabel /> : <>
        <ProjectFilterControl idleLabel={focusedProject?.company ?? (overImages ? undefined : "Liam Fennell")} companyHref={focusedProject?.companyHref} />
        <ProjectDetail text={focusedProject?.label ?? null} />
      </>}
    </div>
    {(!showFeedLabel || !overImages) && <a className="header-action text-bodySans" href={overImages ? "#top" : EMAIL_HREF} aria-label={overImages ? "Back to top" : "Email Liam"} inert={Boolean(focusedProject)} onClick={event => {
      if (!overImages) return;
      event.preventDefault();
      cancelTopScroll.current();
      cancelTopScroll.current = scrollToTop();
    }}>
      <InspectableText text={actionLabel}><span ref={actionText} data-hover-glitch-text aria-hidden="true">{actionLabel}</span></InspectableText>
    </a>}
  </div>;
}
