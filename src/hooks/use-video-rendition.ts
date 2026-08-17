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
 * same markup; the poster covers the gap until the effect runs. `minimumWidth`
 * lets a caller reserve a larger rung than the inline box needs — the case study
 * media uses it so the focused view reuses the file already in cache.
 */
export function useVideoRendition(
  asset: PortfolioVideoAsset,
  elementRef: RefObject<HTMLElement | null>,
  minimumWidth = 0,
  { immediate = false }: { immediate?: boolean } = {},
): PortfolioVideoRendition | null {
  // `immediate` is only safe for elements that never render on the server. It
  // resolves during the first render so the <source> tags exist in the very
  // first DOM the element has, which avoids a destructive load() afterwards.
  const [rendition, setRendition] = useState<PortfolioVideoRendition | null>(() =>
    immediate ? pickRendition(asset, minimumWidth) : null,
  );

  useEffect(() => {
    if (rendition) {
      return;
    }

    const measured = elementRef.current?.getBoundingClientRect().width ?? 0;
    setRendition(pickRendition(asset, Math.max(measured, minimumWidth)));
  }, [asset, elementRef, minimumWidth, rendition]);

  return rendition;
}
