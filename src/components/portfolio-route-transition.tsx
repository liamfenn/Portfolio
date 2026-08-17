"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

const ROUTE_EXIT_DURATION = 170;
const ROUTE_SAFETY_DURATION = 2500;

function isIndexProjectHandoff(currentPath: string, destinationPath: string) {
  const isCurrentIndex = currentPath === "/";
  const isDestinationIndex = destinationPath === "/";
  const isCurrentProject = currentPath.startsWith("/work/");
  const isDestinationProject = destinationPath.startsWith("/work/");

  return (isCurrentIndex && isDestinationProject) || (isCurrentProject && isDestinationIndex);
}

export function PortfolioRouteTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [exitingPath, setExitingPath] = useState<string | null>(null);
  const isExitingRef = useRef(false);
  const navigationTimerRef = useRef<number | null>(null);
  const safetyTimerRef = useRef<number | null>(null);

  useEffect(() => {
    isExitingRef.current = false;

    if (navigationTimerRef.current !== null) {
      window.clearTimeout(navigationTimerRef.current);
      navigationTimerRef.current = null;
    }

    if (safetyTimerRef.current !== null) {
      window.clearTimeout(safetyTimerRef.current);
      safetyTimerRef.current = null;
    }
  }, [pathname]);

  useEffect(() => {
    const handleNavigation = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        event.shiftKey ||
        isExitingRef.current
      ) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const anchor = target.closest<HTMLAnchorElement>("a[href]");
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) {
        return;
      }

      const destination = new URL(anchor.href, window.location.href);
      if (
        destination.origin !== window.location.origin ||
        !isIndexProjectHandoff(pathname, destination.pathname) ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        return;
      }

      event.preventDefault();
      isExitingRef.current = true;
      setExitingPath(pathname);

      const href = `${destination.pathname}${destination.search}${destination.hash}`;
      navigationTimerRef.current = window.setTimeout(() => {
        router.push(href);
        navigationTimerRef.current = null;
      }, ROUTE_EXIT_DURATION);

      safetyTimerRef.current = window.setTimeout(() => {
        isExitingRef.current = false;
        setExitingPath(null);
        safetyTimerRef.current = null;
      }, ROUTE_SAFETY_DURATION);
    };

    document.addEventListener("click", handleNavigation, { capture: true });
    return () => {
      document.removeEventListener("click", handleNavigation, { capture: true });
      if (navigationTimerRef.current !== null) {
        window.clearTimeout(navigationTimerRef.current);
      }
      if (safetyTimerRef.current !== null) {
        window.clearTimeout(safetyTimerRef.current);
      }
    };
  }, [pathname, router]);

  const isExiting = exitingPath === pathname;

  return (
    <div className={`portfolio-route-shell${isExiting ? " is-exiting" : ""}`}>
      <div key={pathname} className="portfolio-route-page">
        {children}
      </div>
    </div>
  );
}
