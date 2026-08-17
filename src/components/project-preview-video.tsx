"use client";

import { useEffect, useRef, useState } from "react";
import type { PortfolioVideoAsset } from "@/lib/media-assets";
import { AV1_MIME, H264_MIME, mediaUrl } from "@/lib/media-delivery";
import { useVideoRendition } from "@/hooks/use-video-rendition";

export function ProjectPreviewVideo({ asset }: { asset: PortfolioVideoAsset }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isFrameReady, setIsFrameReady] = useState(Boolean(asset.poster));
  const rendition = useVideoRendition(asset, videoRef);

  useEffect(() => {
    if (rendition) {
      videoRef.current?.load();
    }
  }, [rendition]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (reduceMotion.matches || connection?.saveData) {
      video.pause();
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
  }, [rendition]);

  return (
    <video
      ref={videoRef}
      className={`project-preview-video${isFrameReady ? " is-frame-ready" : ""}`}
      poster={mediaUrl(asset.poster)}
      aria-label={asset.alt}
      muted
      loop
      playsInline
      preload="metadata"
    >
      {rendition ? (
        <>
          <source src={mediaUrl(rendition.av1)} type={AV1_MIME} />
          <source src={mediaUrl(rendition.h264)} type={H264_MIME} />
        </>
      ) : null}
    </video>
  );
}
