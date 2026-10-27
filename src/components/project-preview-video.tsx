"use client";

import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import type { PortfolioVideoAsset } from "@/lib/media-assets";
import { mediaUrl } from "@/lib/media-delivery";
import { registerVideo } from "@/lib/video-playback";
import { useImageLoading } from "@/hooks/use-image-loading";
import { Skeleton } from "@/components/skeleton";

export function ProjectPreviewVideo({ asset, priority = false }: { asset: PortfolioVideoAsset; priority?: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const registration = useRef<ReturnType<typeof registerVideo> | null>(null);
  const { attachImage: posterAttachImage, pending: posterPending, failed: posterFailed, onLoad: posterOnLoad, onError: posterOnError } = useImageLoading(asset.poster);

  useEffect(() => {
    if (!videoRef.current) return;
    const current = registerVideo(videoRef.current, asset);
    registration.current = current;
    return () => { current.dispose(); registration.current = null; };
  }, [asset]);
  useEffect(() => { registration.current?.priority(priority); }, [asset, priority]);

  return <span className="project-preview-media" aria-busy={posterPending} style={{ "--media-backdrop": asset.backdrop } as CSSProperties}>
    <Skeleton active={posterPending} />
    <video ref={videoRef} className="project-preview-video" aria-label={asset.alt}
      onLoadedData={posterOnLoad}
      width={asset.width} height={asset.height} muted loop playsInline disablePictureInPicture preload="none" />
    {/* The poster covers the video until a decoded frame is presented, including failed autoplay. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img ref={posterAttachImage} onLoad={posterOnLoad} onError={posterOnError}
      className={`project-preview-poster${posterFailed ? " loading-image-error" : ""}`} src={mediaUrl(asset.poster)}
      srcSet={asset.posters?.map(poster => `${mediaUrl(poster.src)} ${poster.width}w`).join(", ")}
      sizes="auto, (max-width: 767px) 100vw, 33vw" width={asset.width} height={asset.height}
      alt="" aria-hidden="true" loading="lazy" decoding="async" />
  </span>;
}
