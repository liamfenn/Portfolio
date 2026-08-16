"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

interface CaseStudyControlsProps {
  previousSlug: string;
  previousTitle: string;
  nextSlug: string;
  nextTitle: string;
}

export function CaseStudyControls({
  previousSlug,
  previousTitle,
  nextSlug,
  nextTitle,
}: CaseStudyControlsProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [hasBottomBrowserChrome, setHasBottomBrowserChrome] = useState(false);
  const previousScrollY = useRef(0);
  const animationFrame = useRef<number | null>(null);
  const browserChromeFrame = useRef<number | null>(null);

  useEffect(() => {
    const viewport = window.visualViewport;

    if (!viewport) {
      return;
    }

    const updateBrowserChromePosition = () => {
      if (browserChromeFrame.current !== null) {
        return;
      }

      browserChromeFrame.current = window.requestAnimationFrame(() => {
        const layoutViewportHeight = document.documentElement.clientHeight;
        const visibleViewportBottom = viewport.offsetTop + viewport.height;
        const bottomOcclusion = Math.max(0, layoutViewportHeight - visibleViewportBottom);

        setHasBottomBrowserChrome(bottomOcclusion > 8);
        browserChromeFrame.current = null;
      });
    };

    updateBrowserChromePosition();
    viewport.addEventListener("resize", updateBrowserChromePosition);
    viewport.addEventListener("scroll", updateBrowserChromePosition);
    window.addEventListener("resize", updateBrowserChromePosition);

    return () => {
      viewport.removeEventListener("resize", updateBrowserChromePosition);
      viewport.removeEventListener("scroll", updateBrowserChromePosition);
      window.removeEventListener("resize", updateBrowserChromePosition);

      if (browserChromeFrame.current !== null) {
        window.cancelAnimationFrame(browserChromeFrame.current);
      }
    };
  }, []);

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

  return (
    <nav
      className={`case-study-controls${isVisible ? "" : " is-hidden"}${hasBottomBrowserChrome ? " has-bottom-browser-chrome" : ""}`}
      aria-label="Case study navigation"
    >
      <Link className="case-study-control case-study-control-home" href="/">
        Home
      </Link>
      <Link
        className="case-study-control case-study-control-step"
        href={`/work/${previousSlug}`}
        aria-label={`Previous project: ${previousTitle}`}
      >
        P
      </Link>
      <Link
        className="case-study-control case-study-control-step"
        href={`/work/${nextSlug}`}
        aria-label={`Next project: ${nextTitle}`}
      >
        N
      </Link>
    </nav>
  );
}
