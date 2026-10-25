"use client";

import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import type { PortfolioVideoAsset } from "@/lib/media-assets";
import { mediaUrl } from "@/lib/media-delivery";
import { registerVideo } from "@/lib/video-playback";

export function ProjectPreviewVideo({ asset, priority = false }: { asset: PortfolioVideoAsset; priority?: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const registration = useRef<ReturnType<typeof registerVideo> | null>(null);

  useEffect(() => {
    if (!videoRef.current) return;
    const current = registerVideo(videoRef.current, asset);
    registration.current = current;
    return () => { current.dispose(); registration.current = null; };
  }, [asset]);
  useEffect(() => { registration.current?.priority(priority); }, [asset, priority]);

  return <span className="project-preview-media" style={{ "--media-backdrop": asset.backdrop } as CSSProperties}>
    <video ref={videoRef} className="project-preview-video" aria-label={asset.alt}
      width={asset.width} height={asset.height} muted loop playsInline preload="none" />
    {/* The poster covers the video until a decoded frame is presented, including failed autoplay. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img className="project-preview-poster" src={mediaUrl(asset.poster)}
      srcSet={asset.posters?.map(poster => `${mediaUrl(poster.src)} ${poster.width}w`).join(", ")}
      sizes="auto, (max-width: 767px) 100vw, 33vw" width={asset.width} height={asset.height}
      alt="" aria-hidden="true" loading="lazy" decoding="async" />
  </span>;
}
