"use client";

import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

const ROUTE_EXIT_DURATION = 170;
const ROUTE_SAFETY_DURATION = 2500;

const RouteTransitionContext = createContext<(href: string) => void>(() => undefined);

/** Navigates with the shell exit animation, falling back to a direct push when unavailable. */
export function usePortfolioRouteTransition() {
  return useContext(RouteTransitionContext);
}

function isAnimatedHandoff(currentPath: string, destinationPath: string) {
  if (currentPath === destinationPath) {
    return false;
  }

  const isCurrentIndex = currentPath === "/";
  const isDestinationIndex = destinationPath === "/";
  const isCurrentProject = currentPath.startsWith("/work/");
  const isDestinationProject = destinationPath.startsWith("/work/");

  return (
    (isCurrentIndex && isDestinationProject) ||
    (isCurrentProject && isDestinationIndex) ||
    (isCurrentProject && isDestinationProject)
  );
}

export function PortfolioRouteTransition({
  children,
  overlay,
}: {
  children: ReactNode;
  /** Persistent chrome rendered outside the animated page so it never re-enters. */
  overlay?: ReactNode;
}) {
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

  const startTransition = useCallback(
    (href: string) => {
      if (isExitingRef.current) {
        return;
      }

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        router.push(href);
        return;
      }

      isExitingRef.current = true;
      setExitingPath(pathname);

      navigationTimerRef.current = window.setTimeout(() => {
        router.push(href);
        navigationTimerRef.current = null;
      }, ROUTE_EXIT_DURATION);

      safetyTimerRef.current = window.setTimeout(() => {
        isExitingRef.current = false;
        setExitingPath(null);
        safetyTimerRef.current = null;
      }, ROUTE_SAFETY_DURATION);
    },
    [pathname, router],
  );

  const navigate = useCallback(
    (href: string) => {
      const destination = new URL(href, window.location.href);

      if (!isAnimatedHandoff(pathname, destination.pathname)) {
        router.push(href);
        return;
      }

      startTransition(href);
    },
    [pathname, router, startTransition],
  );

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
        !isAnimatedHandoff(pathname, destination.pathname) ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        return;
      }

      event.preventDefault();
      startTransition(`${destination.pathname}${destination.search}${destination.hash}`);
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
  }, [pathname, startTransition]);

  const isExiting = exitingPath === pathname;

  return (
    <RouteTransitionContext.Provider value={navigate}>
      <div className={`portfolio-route-shell${isExiting ? " is-exiting" : ""}`}>
        <div key={pathname} className="portfolio-route-page">
          {children}
        </div>
      </div>
      {overlay}
    </RouteTransitionContext.Provider>
  );
}
