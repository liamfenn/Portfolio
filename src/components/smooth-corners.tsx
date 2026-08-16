"use client";

import { SmoothCorners as LisseSmoothCorners } from "@lisse/react";
import { useSyncExternalStore } from "react";
import type { ReactElement } from "react";

const DESKTOP_QUERY = "(min-width: 768px)";
const FIGMA_CORNER_SMOOTHING = 0.6;

function subscribeToDesktopQuery(onChange: () => void) {
  const query = window.matchMedia(DESKTOP_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function getDesktopSnapshot() {
  return window.matchMedia(DESKTOP_QUERY).matches;
}

function getServerSnapshot() {
  return false;
}

type SmoothCornersProps = {
  radius: number;
  desktopRadius?: number;
  children: ReactElement;
};

export function SmoothCorners({
  radius,
  desktopRadius = radius,
  children,
}: SmoothCornersProps) {
  const isDesktop = useSyncExternalStore(
    subscribeToDesktopQuery,
    getDesktopSnapshot,
    getServerSnapshot,
  );

  return (
    <LisseSmoothCorners
      asChild
      autoEffects={false}
      corners={{
        radius: isDesktop ? desktopRadius : radius,
        smoothing: FIGMA_CORNER_SMOOTHING,
      }}
    >
      {children}
    </LisseSmoothCorners>
  );
}
