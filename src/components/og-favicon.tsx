"use client";

import { useRef } from "react";
import { GlyphGlobe } from "@/components/glyph-globe";
import { currentGlyphPalette } from "@/lib/palette-toy";

/**
 * The favicon source: the footer's globe at rest, alone on the card, its size set by --og-favicon-globe so the capture
 * script can fit its glyphs to the square. Its own colour glitches run as they do on the site.
 */
export function OgFavicon() {
  const globeRef = useRef<HTMLButtonElement>(null);
  return (
    <main className="og-card og-favicon">
      <GlyphGlobe mode="idle" disabled={false} reducedMotion={false} palette={currentGlyphPalette().join(" ")} globeRef={globeRef} onToggle={() => {}} />
    </main>
  );
}
