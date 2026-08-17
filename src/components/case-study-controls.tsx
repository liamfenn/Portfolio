"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import {
  announceCaseStudyNavigation,
  type CaseStudyNavigationDirection,
} from "@/lib/case-study-navigation";

interface CaseStudyControlsProps {
  currentSlug: string;
  currentPeriod: string;
  currentTitle: string;
  previousSlug: string;
  previousPeriod: string;
  previousTitle: string;
  nextSlug: string;
  nextPeriod: string;
  nextTitle: string;
}

export function CaseStudyControls({
  currentSlug,
  currentPeriod,
  currentTitle,
  previousSlug,
  previousPeriod,
  previousTitle,
  nextSlug,
  nextPeriod,
  nextTitle,
}: CaseStudyControlsProps) {
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(true);
  const previousScrollY = useRef(0);
  const animationFrame = useRef<number | null>(null);

  useEffect(() => {
    previousScrollY.current = window.scrollY;

    const handleScroll = () => {
      if (animationFrame.current !== null) {
        return;
      }

      animationFrame.current = window.requestAnimationFrame(() => {
        const currentScrollY = Math.max(0, window.scrollY);
        const difference = currentScrollY - previousScrollY.current;
        const content = document.querySelector<HTMLElement>(".case-study-content");
        const contentBottom = content
          ? content.getBoundingClientRect().bottom + currentScrollY
          : document.documentElement.scrollHeight;
        const viewportBottom = currentScrollY + window.innerHeight;
        const isPastContent = viewportBottom >= contentBottom + 24;
        const isAtPageBottom = viewportBottom >= document.documentElement.scrollHeight - 8;

        if (currentScrollY <= 8 || isPastContent || isAtPageBottom) {
          setIsVisible(true);
        } else if (difference > 4) {
          setIsVisible(false);
        } else if (difference < -4) {
          setIsVisible(true);
        }

        previousScrollY.current = currentScrollY;
        animationFrame.current = null;
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (animationFrame.current !== null) {
        window.cancelAnimationFrame(animationFrame.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.repeat ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) {
        return;
      }

      const isPrevious = event.code === "KeyP" || event.key.toLowerCase() === "p";
      const isNext = event.code === "KeyN" || event.key.toLowerCase() === "n";
      if (!isPrevious && !isNext) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      const direction: CaseStudyNavigationDirection = isPrevious ? -1 : 1;
      const destination = isPrevious ? previousSlug : nextSlug;
      announceCaseStudyNavigation(
        direction,
        { slug: currentSlug, period: currentPeriod, title: currentTitle },
        {
          slug: destination,
          period: isPrevious ? previousPeriod : nextPeriod,
          title: isPrevious ? previousTitle : nextTitle,
        },
      );
      router.push(`/work/${destination}`);
    };

    document.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => document.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [
    currentPeriod,
    currentSlug,
    currentTitle,
    nextPeriod,
    nextSlug,
    nextTitle,
    previousPeriod,
    previousSlug,
    previousTitle,
    router,
  ]);

  const handleNavigationClick = (
    event: ReactMouseEvent<HTMLAnchorElement>,
    direction: CaseStudyNavigationDirection,
  ) => {
    if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) {
      return;
    }

    announceCaseStudyNavigation(
      direction,
      { slug: currentSlug, period: currentPeriod, title: currentTitle },
      direction === -1
        ? { slug: previousSlug, period: previousPeriod, title: previousTitle }
        : { slug: nextSlug, period: nextPeriod, title: nextTitle },
    );
  };

  return (
    <nav className={`case-study-controls${isVisible ? "" : " is-hidden"}`} aria-label="Case study navigation">
      <Link className="case-study-control case-study-control-home" href="/">
        Close
      </Link>
      <Link
        className="case-study-control case-study-control-step"
        href={`/work/${previousSlug}`}
        aria-label={`Previous project: ${previousTitle}`}
        onClick={(event) => handleNavigationClick(event, -1)}
      >
        P
      </Link>
      <Link
        className="case-study-control case-study-control-step"
        href={`/work/${nextSlug}`}
        aria-label={`Next project: ${nextTitle}`}
        onClick={(event) => handleNavigationClick(event, 1)}
      >
        N
      </Link>
    </nav>
  );
}
