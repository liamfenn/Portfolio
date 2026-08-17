"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import { getAdjacentCaseStudies, getCaseStudy } from "@/lib/case-studies";
import {
  announceCaseStudyNavigation,
  type CaseStudyNavigationDirection,
} from "@/lib/case-study-navigation";
import { usePortfolioRouteTransition } from "@/components/portfolio-route-transition";

function getCurrentSlug(pathname: string) {
  if (!pathname.startsWith("/work/")) {
    return null;
  }

  return pathname.slice("/work/".length).split("/")[0] || null;
}

export function CaseStudyControls() {
  const pathname = usePathname();
  const navigate = usePortfolioRouteTransition();
  const [isVisible, setIsVisible] = useState(true);
  const previousScrollY = useRef(0);
  const animationFrame = useRef<number | null>(null);

  const slug = getCurrentSlug(pathname);
  const study = slug ? getCaseStudy(slug) : null;
  const adjacentStudies = slug ? getAdjacentCaseStudies(slug) : null;

  useEffect(() => {
    previousScrollY.current = Math.max(0, window.scrollY);
    setIsVisible(true);
  }, [pathname]);

  useEffect(() => {
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
        animationFrame.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const current = slug ? getCaseStudy(slug) : null;
    const adjacent = slug ? getAdjacentCaseStudies(slug) : null;
    if (!current || !adjacent) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.repeat ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target;
      if (
        target instanceof Element &&
        target.closest("input, textarea, select, [contenteditable='true']")
      ) {
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
      const destination = isPrevious ? adjacent.previous : adjacent.next;
      announceCaseStudyNavigation(
        direction,
        { slug: current.slug, period: current.period, title: current.title },
        { slug: destination.slug, period: destination.period, title: destination.title },
      );
      navigate(`/work/${destination.slug}`);
    };

    document.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => document.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [navigate, slug]);

  if (!study || !adjacentStudies) {
    return null;
  }

  const handleNavigationClick = (
    event: ReactMouseEvent<HTMLAnchorElement>,
    direction: CaseStudyNavigationDirection,
  ) => {
    if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) {
      return;
    }

    const destination = direction === -1 ? adjacentStudies.previous : adjacentStudies.next;
    announceCaseStudyNavigation(
      direction,
      { slug: study.slug, period: study.period, title: study.title },
      { slug: destination.slug, period: destination.period, title: destination.title },
    );
  };

  return (
    <nav className={`case-study-controls${isVisible ? "" : " is-hidden"}`} aria-label="Case study navigation">
      <Link className="case-study-control case-study-control-home" href="/">
        Close
      </Link>
      <Link
        className="case-study-control case-study-control-step"
        href={`/work/${adjacentStudies.previous.slug}`}
        aria-label={`Previous project: ${adjacentStudies.previous.title}`}
        onClick={(event) => handleNavigationClick(event, -1)}
      >
        P
      </Link>
      <Link
        className="case-study-control case-study-control-step"
        href={`/work/${adjacentStudies.next.slug}`}
        aria-label={`Next project: ${adjacentStudies.next.title}`}
        onClick={(event) => handleNavigationClick(event, 1)}
      >
        N
      </Link>
    </nav>
  );
}
