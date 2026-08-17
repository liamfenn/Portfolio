"use client";

import { useReducedMotion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useScramble } from "use-scramble";
import {
  CASE_STUDY_IDENTITY_SWAP_DELAY,
  CASE_STUDY_NAVIGATION_EVENT,
  getRecentCaseStudyNavigation,
  type CaseStudyNavigationDetail,
} from "@/lib/case-study-navigation";

const SUMMARY_GLYPHS = Array.from(
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789–—&",
).map((glyph) => glyph.charCodeAt(0)) as [number, number, ...number[]];

interface CaseStudySummaryProps {
  slug: string;
  period: string;
  title: string;
  description: string;
}

export function CaseStudySummary({ slug, period, title, description }: CaseStudySummaryProps) {
  const prefersReducedMotion = useReducedMotion();
  const initialNavigation = getRecentCaseStudyNavigation(slug);
  const [displayedPeriod, setDisplayedPeriod] = useState(
    initialNavigation?.source.period ?? period,
  );
  const [displayedTitle, setDisplayedTitle] = useState(
    initialNavigation?.source.title ?? title,
  );
  const swapTimer = useRef<number | null>(null);

  const { ref: periodRef } = useScramble({
    text: displayedPeriod,
    playOnMount: false,
    speed: 0.68,
    tick: 1,
    step: 1,
    scramble: 2,
    seed: 1,
    chance: 1,
    range: SUMMARY_GLYPHS,
    overdrive: false,
    overflow: true,
    ignore: [" "],
  });
  const { ref: titleRef } = useScramble({
    text: displayedTitle,
    playOnMount: false,
    speed: 0.68,
    tick: 1,
    step: 1,
    scramble: 2,
    seed: 1,
    chance: 1,
    range: SUMMARY_GLYPHS,
    overdrive: false,
    overflow: true,
    ignore: [" "],
  });

  const scheduleSwap = useCallback(
    (navigation: CaseStudyNavigationDetail) => {
      if (swapTimer.current !== null) {
        window.clearTimeout(swapTimer.current);
      }

      const swap = () => {
        setDisplayedPeriod(navigation.target.period);
        setDisplayedTitle(navigation.target.title);
        swapTimer.current = null;
      };

      if (prefersReducedMotion) {
        swap();
        return;
      }

      const remainingDelay = Math.max(
        0,
        CASE_STUDY_IDENTITY_SWAP_DELAY - (Date.now() - navigation.startedAt),
      );
      swapTimer.current = window.setTimeout(swap, remainingDelay);
    },
    [prefersReducedMotion],
  );

  useEffect(() => {
    const recentNavigation = getRecentCaseStudyNavigation(slug);
    if (recentNavigation) {
      scheduleSwap(recentNavigation);
    }

    const handleNavigation = (event: Event) => {
      scheduleSwap((event as CustomEvent<CaseStudyNavigationDetail>).detail);
    };

    window.addEventListener(CASE_STUDY_NAVIGATION_EVENT, handleNavigation);
    return () => {
      window.removeEventListener(CASE_STUDY_NAVIGATION_EVENT, handleNavigation);
      if (swapTimer.current !== null) {
        window.clearTimeout(swapTimer.current);
      }
    };
  }, [scheduleSwap, slug]);

  return (
    <div className="case-study-summary">
      <p ref={periodRef} className="case-study-period">
        {displayedPeriod}
      </p>
      <h1 ref={titleRef}>{displayedTitle}</h1>
      <p>{description}</p>
    </div>
  );
}
