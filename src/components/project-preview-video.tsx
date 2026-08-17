"use client";

import { useEffect, useRef, useState } from "react";
import type { PortfolioVideoAsset } from "@/lib/media-assets";

export function ProjectPreviewVideo({ asset }: { asset: PortfolioVideoAsset }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isFrameReady, setIsFrameReady] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    let frameCallback: number | null = null;
    const markFrameReady = () => {
      if ("requestVideoFrameCallback" in video) {
        frameCallback = video.requestVideoFrameCallback(() => setIsFrameReady(true));
      } else {
        setIsFrameReady(true);
      }
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          void video.play().then(markFrameReady).catch(() => undefined);
        } else {
          video.pause();
        }
      },
      { rootMargin: "240px 0px", threshold: 0.01 },
    );

    observer.observe(video);
    return () => {
      observer.disconnect();
      if (frameCallback !== null && "cancelVideoFrameCallback" in video) {
        video.cancelVideoFrameCallback(frameCallback);
      }
    };
  }, []);

  return (
    <video
      ref={videoRef}
      className={`project-preview-video${isFrameReady ? " is-frame-ready" : ""}`}
      src={asset.src}
      poster={asset.poster}
      aria-label={asset.alt}
      muted
      loop
      playsInline
      preload="metadata"
    />
  );
}
