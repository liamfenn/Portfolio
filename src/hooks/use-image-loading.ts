"use client";

import { useCallback, useState } from "react";

/** Handle cached images as well as load/error events, and reset when their source changes. */
export function useImageLoading(src?: string) {
  const [settled, setSettled] = useState<{ src: string; failed: boolean } | null>(null);
  const settle = useCallback((failed: boolean) => {
    if (src) setSettled({ src, failed });
  }, [src]);
  const attachImage = useCallback((image: HTMLImageElement | null) => {
    if (image?.complete) settle(image.naturalWidth === 0);
  }, [settle]);
  return {
    attachImage,
    pending: Boolean(src && settled?.src !== src),
    failed: Boolean(settled?.src === src && settled?.failed),
    onLoad: useCallback(() => settle(false), [settle]),
    onError: useCallback(() => settle(true), [settle]),
  };
}
