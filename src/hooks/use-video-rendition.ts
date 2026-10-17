"use client";

import { useEffect, useState } from "react";
import type { RefObject } from "react";
import type { PortfolioVideoAsset, PortfolioVideoRendition } from "@/lib/media-assets";
import { pickRendition } from "@/lib/media-delivery";

/**
 * Resolves which rung of the encode ladder to fetch, measured from the element
 * that actually paints the video.
 *
 * Returns null on the server and on the first client render so both produce the
 * same markup; the poster covers the gap until the effect runs.
 */
export function useVideoRendition(
  asset: PortfolioVideoAsset,
  elementRef: RefObject<HTMLElement | null>,
): PortfolioVideoRendition | null {
  const [rendition, setRendition] = useState<PortfolioVideoRendition | null>(null);

  useEffect(() => {
    if (rendition) {
      return;
    }

    const measured = elementRef.current?.getBoundingClientRect().width ?? 0;
    setRendition(pickRendition(asset, measured));
  }, [asset, elementRef, rendition]);

  return rendition;
}
