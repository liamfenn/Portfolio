"use client";

import { useEffect, useRef } from "react";
import { useScramble } from "use-scramble";
import type { UseScrambleProps } from "use-scramble";
import { currentGlyphPalette } from "@/lib/palette-toy";

const escapeHtml = (char: string) => char === "&" ? "&amp;" : char === "<" ? "&lt;" : char === ">" ? "&gt;" : char;

/**
 * use-scramble with the site's colour glitch: while a character is still scrambling it flashes a random palette
 * colour, and it settles back to the text's own colour as it resolves. use-scramble writes each frame as HTML and
 * then reports it, so this rewrites that frame with the scrambling characters wrapped; the final frame is left as
 * plain text.
 */
export function useColorScramble(props: UseScrambleProps) {
  const { onAnimationFrame, text = "" } = props;
  const handle = useRef<ReturnType<typeof useScramble> | null>(null);
  const scramble = useScramble({
    ...props,
    onAnimationFrame: frame => {
      const element = handle.current?.ref.current as HTMLElement | null | undefined;
      if (element && frame !== text) {
        const colors = currentGlyphPalette();
        let html = "";
        for (let index = 0; index < frame.length; index++) {
          const char = frame[index];
          html += char === text[index] || !char.trim() ? escapeHtml(char)
            : `<span style="color:${colors[Math.floor(Math.random() * colors.length)]}">${escapeHtml(char)}</span>`;
        }
        element.innerHTML = html;
      }
      onAnimationFrame?.(frame);
    },
  });
  useEffect(() => { handle.current = scramble; });
  return scramble;
}
