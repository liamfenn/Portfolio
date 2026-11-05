"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { InspectableText } from "@/components/design-inspector";
import { ProjectSortControl } from "@/components/project-sort-control";
import { useColorScramble } from "@/hooks/use-color-scramble";
import { FILTER_SCRAMBLE } from "@/lib/text-scramble";

const EMAIL_HREF = "mailto:info@fennell.cv";

export function PortfolioHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [overImages, setOverImages] = useState(false);
  const header = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const actionLabel = overImages ? "Top" : "Contact";
  const { ref: actionText } = useColorScramble({
    ...FILTER_SCRAMBLE, text: actionLabel, ignore: [], playOnMount: false, speed: reducedMotion ? 0 : FILTER_SCRAMBLE.speed,
  });

  // Temporary: lets Liam compare Safari top-edge treatments on a device with ?edge=low or ?edge=both.
  useEffect(() => {
    const edge = new URLSearchParams(window.location.search).get("edge");
    if (edge) document.documentElement.dataset.safariEdge = edge;
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

  return <div ref={header} className={`portfolio-header${scrolled ? " is-scrolled" : ""}${overImages ? " is-over-images" : ""}`}>
    <span className="header-fill" aria-hidden="true" />
    <button className="header-avatar hover-surface" type="button" data-inspector-toggle aria-label="Open design controls" inert={overImages}>
      <Image src="/images/redesign/avatar.webp" width={384} height={384} alt="Liam Fennell" priority unoptimized />
    </button>
    <div className="header-label text-bodySans" inert={!overImages}>
      <ProjectSortControl idleLabel={overImages ? undefined : "Liam Fennell"} />
    </div>
    <a className="header-action text-captionSans" href={overImages ? "#top" : EMAIL_HREF} aria-label={overImages ? "Back to top" : "Email Liam"} onClick={event => {
      if (!overImages) return;
      event.preventDefault();
      window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
    }}>
      <InspectableText text={actionLabel}><span ref={actionText} data-hover-glitch-text aria-hidden="true">{actionLabel}</span></InspectableText>
    </a>
  </div>;
}
