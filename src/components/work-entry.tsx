"use client";

import Image from "next/image";
import { useRef, useEffect, useState } from "react";
import type { WorkEntry as WorkEntryType, Thumbnail } from "@/lib/data";



function VideoCard({ thumb }: { thumb: Thumbnail }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const [canHover, setCanHover] = useState<boolean | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(hover: hover)");
    setCanHover(mq.matches);
  }, []);

  useEffect(() => {
    if (canHover === null) return;
    const video = videoRef.current;
    if (!video) return;

    if (canHover) {
      video.pause();
      video.currentTime = 0;
      return;
    }

    // Mobile: seek to last frame and draw static glow, only for mobileGlow cards
    if (thumb.mobileGlow) {
      const drawOnce = () => {
        const canvas = canvasRef.current;
        if (!video || !canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);
        ctx.globalCompositeOperation = "multiply";
        ctx.fillStyle = "#c0c0c0";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.globalCompositeOperation = "source-over";
      };
      const seekAndDraw = () => {
        video.currentTime = video.duration;
      };
      video.addEventListener("seeked", drawOnce, { once: true });
      if (video.readyState >= 1) {
        seekAndDraw();
      } else {
        video.addEventListener("loadedmetadata", seekAndDraw, { once: true });
      }
      return () => {
        video.removeEventListener("seeked", drawOnce);
        video.removeEventListener("loadedmetadata", seekAndDraw);
      };
    }
  }, [canHover]);

  const drawGlow = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.paused) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    // Darken white areas so glow is always visible on white backgrounds
    ctx.globalCompositeOperation = "multiply";
    ctx.fillStyle = "#c0c0c0";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = "source-over";
    rafRef.current = requestAnimationFrame(drawGlow);
  };

  const handleEnter = () => {
    videoRef.current?.play();
    drawGlow();
  };

  const handleLeave = () => {
    videoRef.current?.pause();
    if (videoRef.current) videoRef.current.currentTime = 0;
    cancelAnimationFrame(rafRef.current);
  };

  // On mobile, only show glow for cards with mobileGlow enabled
  const showMobileGlow = canHover === false && thumb.mobileGlow;
  const showGlow = canHover === true || canHover === null || showMobileGlow;

  return (
    <div className="video-card-container flex-shrink-0 w-[148px] relative">
      <a
        href={thumb.href}
        target="_blank"
        rel="noopener noreferrer"
        className="video-card block rounded-[12px] overflow-visible relative z-10"
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
      >
        {/* Blurred glow behind — canvas mirrors main video, or solid color */}
        {showGlow && (thumb.glowColor ? (
          <div
            className={`video-glow video-glow-solid absolute inset-0 rounded-[12px] video-glow-hidden z-0 pointer-events-none${showMobileGlow ? " video-glow-mobile-active" : ""}`}
            style={{
              backgroundColor: thumb.glowColor,
              transform: "scale(1.05)",
              filter: "blur(24px)",
            }}
            aria-hidden="true"
          />
        ) : (
          <canvas
            ref={canvasRef}
            className={`video-glow absolute inset-0 w-full h-full rounded-[12px] video-glow-hidden z-0 pointer-events-none${showMobileGlow ? " video-glow-mobile-active" : ""}`}
            style={{
              transform: "scale(1.05)",
              filter: "blur(30px) saturate(3)",
            }}
            aria-hidden="true"
          />
        ))}
        <div
          className="relative rounded-[12px] overflow-hidden"
          style={{ WebkitMaskImage: "-webkit-radial-gradient(white, black)" }}
        >
          <video
            ref={videoRef}
            src={thumb.videoUrl}
            muted
            loop
            playsInline
            autoPlay
            preload="auto"
            className="block w-full"
          />
          <div className="absolute inset-0 rounded-[12px] shadow-[inset_0_0_0_0.88px_rgba(0,0,0,0.04)] pointer-events-none" />
        </div>
      </a>
    </div>
  );
}

function isVideo(src: string) {
  return /\.(mp4|webm|mov|ogg)$/i.test(src);
}

function ImageCard({ thumb }: { thumb: Thumbnail }) {
  const [canHover, setCanHover] = useState<boolean | null>(null);
  useEffect(() => {
    setCanHover(window.matchMedia("(hover: hover)").matches);
  }, []);

  // Desktop only — no glow on mobile for images
  const showGlow = canHover === true || canHover === null;

  return (
    <div className="video-card-container flex-shrink-0 w-[148px] relative">
      <a
        href={thumb.href}
        target="_blank"
        rel="noopener noreferrer"
        className="video-card block rounded-[12px] overflow-visible relative z-10"
      >
        {/* Blurred glow behind — desktop only */}
        {showGlow && (thumb.glowColor ? (
          <div
            className="video-glow video-glow-solid video-glow-hidden z-0 pointer-events-none absolute inset-0 rounded-[12px]"
            style={{
              backgroundColor: thumb.glowColor,
              transform: "scale(1.05)",
              filter: "blur(24px)",
            }}
            aria-hidden="true"
          />
        ) : (
          <img
            src={thumb.videoUrl}
            className="video-glow video-glow-hidden z-0 pointer-events-none absolute inset-0 w-full h-full rounded-[12px] object-cover"
            style={{
              transform: "scale(1.05)",
              filter: "blur(30px) saturate(3)",
            }}
            aria-hidden="true"
            alt=""
          />
        ))}
        <div className="relative rounded-[12px] overflow-hidden">
          <img
            src={thumb.videoUrl}
            alt=""
            className="block w-full"
          />
          <div className="absolute inset-0 rounded-[12px] shadow-[inset_0_0_0_0.88px_rgba(0,0,0,0.04)] pointer-events-none" />
        </div>
      </a>
    </div>
  );
}

export function WorkEntry({ entry }: { entry: WorkEntryType }) {
  const avatars = (
    <div className="relative h-[24px] w-[40px] md:h-[32px] md:w-[48px]">
      <div
        className="absolute left-0 top-1/2 -translate-y-1/2 w-[20px] h-[20px] md:w-[28px] md:h-[28px] rounded-full overflow-hidden"
        style={entry.personalLogoOpacity ? { opacity: entry.personalLogoOpacity } : undefined}
      >
        <Image
          src={entry.personalLogo}
          alt="Personal"
          width={28}
          height={28}
          className="w-full h-full object-cover"
        />
      </div>
      <div
        className="absolute left-[12px] top-1/2 -translate-y-1/2 w-[24px] h-[24px] md:left-[16px] md:w-[32px] md:h-[32px] rounded-full overflow-hidden outline outline-1 outline-white"
        style={{ backgroundColor: entry.companyLogoBg || "#f5f5f5" }}
      >
        <Image
          src={entry.companyLogo}
          alt={entry.company}
          width={32}
          height={32}
          className="w-full h-full object-cover"
        />
      </div>
    </div>
  );

  const companyName = (
    <div className="flex items-center gap-1.5">
      <span style={{ color: entry.companyColor }}>
        {entry.company}
      </span>
      {entry.isActive && (
        <span className="type-mono text-spotify-green">
          • Now
        </span>
      )}
    </div>
  );

  return (
    <div className="work-entry flex flex-col gap-2 overflow-visible">
      {/* Avatars */}
      {entry.href ? (
        <a
          href={entry.href}
          target="_blank"
          rel="noopener noreferrer"
          className="w-fit entry-link"
        >
          {avatars}
        </a>
      ) : (
        avatars
      )}

      {/* Company name + role + description */}
      <div className="flex flex-col">
        {entry.href ? (
          <a
            href={entry.href}
            target="_blank"
            rel="noopener noreferrer"
            className="w-fit pr-6 entry-link"
          >
            {companyName}
          </a>
        ) : (
          companyName
        )}
        <span className="text-foreground">
          {entry.role}
          {entry.collaborator && (
            <span className="text-muted-foreground">
              , with{" "}
              {entry.collaboratorHref ? (
                <a
                  href={entry.collaboratorHref}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {entry.collaborator}
                </a>
              ) : (
                entry.collaborator
              )}
            </span>
          )}
        </span>
        <p className="text-muted">{entry.description}</p>
      </div>

      {/* Thumbnails — each linked to its own URL */}
      {entry.thumbnails && entry.thumbnails.length > 0 && (
        <div className="flex gap-2 pt-1 md:pt-3 overflow-visible">
          {[...entry.thumbnails].reverse().map((thumb) =>
            isVideo(thumb.videoUrl) ? (
              <VideoCard key={thumb.videoUrl} thumb={thumb} />
            ) : (
              <ImageCard key={thumb.videoUrl} thumb={thumb} />
            )
          )}
        </div>
      )}
    </div>
  );
}
