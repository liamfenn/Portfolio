"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { InspectableText } from "@/components/design-inspector";
import { useProjectDisplayState } from "@/components/project-display-state";
import { ProjectFilterControl } from "@/components/project-filter-control";
import { useColorScramble } from "@/hooks/use-color-scramble";
import { FILTER_SCRAMBLE } from "@/lib/text-scramble";
import { scrollToTop } from "@/lib/scroll-to-top";

const EMAIL_HREF = "mailto:info@fennell.cv";

function ProjectDetail({ text }: { text: string | null }) {
  const reducedMotion = useReducedMotion();
  // Blanks of the outgoing length let it scramble out instead of clearing in one frame.
  const [shown, setShown] = useState("");
  if (text && text !== shown) setShown(text);
  const { ref } = useColorScramble({
    ...FILTER_SCRAMBLE, text: text ?? " ".repeat(shown.length), ignore: [], playOnMount: false, speed: reducedMotion ? 0 : FILTER_SCRAMBLE.speed,
  });
  return <InspectableText text={text ?? ""}><span ref={ref} className="header-project-detail" aria-hidden="true">{text ?? ""}</span></InspectableText>;
}

export function PortfolioHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [overImages, setOverImages] = useState(false);
  const header = useRef<HTMLDivElement>(null);
  const cancelTopScroll = useRef<() => void>(() => {});
  const reducedMotion = useReducedMotion();
  const { focusedProject } = useProjectDisplayState();
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
        setOverImages(!entry.isIntersecting && entry.boundingClientRect.top < line);
      }, { rootMargin: `-${line}px 0px 0px 0px` });
      observer.observe(toolbar);
    };
    observe();
    mobile.addEventListener("change", observe);
    return () => {
      observer?.disconnect();
      mobile.removeEventListener("change", observe);
    };
  }, []);

  return <div ref={header} className={`portfolio-header${scrolled ? " is-scrolled" : ""}${overImages ? " is-over-images" : ""}${focusedProject ? " is-project-focus" : ""}`}>
    <span className="header-fill" aria-hidden="true" />
    <button className="header-avatar hover-surface" type="button" data-inspector-toggle aria-label="Open design controls" inert={overImages}>
      <Image src="/images/redesign/avatar.webp" width={384} height={384} alt="Liam Fennell" priority unoptimized />
    </button>
    <div id="project-focus-header" className={`header-label ${overImages || focusedProject ? "text-bodySans" : "text-bodySerif"}`} inert={!overImages && !focusedProject}>
      <ProjectFilterControl idleLabel={focusedProject?.company ?? (overImages ? undefined : "Liam Fennell")} companyHref={focusedProject?.companyHref} />
      <ProjectDetail text={focusedProject?.label ?? null} />
    </div>
    <a className="header-action text-bodySans" href={overImages ? "#top" : EMAIL_HREF} aria-label={overImages ? "Back to top" : "Email Liam"} inert={Boolean(focusedProject)} onClick={event => {
      if (!overImages) return;
      event.preventDefault();
      cancelTopScroll.current();
      cancelTopScroll.current = scrollToTop();
    }}>
      <InspectableText text={actionLabel}><span ref={actionText} data-hover-glitch-text aria-hidden="true">{actionLabel}</span></InspectableText>
    </a>
  </div>;
}
