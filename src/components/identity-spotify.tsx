"use client";

import Image from "next/image";
import { useState } from "react";
import { useSpotify } from "@/hooks/use-spotify";

export function IdentitySpotify() {
  const { data } = useSpotify();
  const [isTapped, setIsTapped] = useState(false);

  const toggleMobileState = () => {
    if (window.matchMedia("(hover: none)").matches) {
      setIsTapped((current) => !current);
    }
  };

  const status = data?.isPlaying ? "Listening now..." : "Last listened...";

  return (
    <div className={`identity-spotify${isTapped ? " is-tapped" : ""}`}>
      <button
        type="button"
        className="identity-artwork"
        aria-label={isTapped ? "Hide Spotify track" : "Show Spotify track"}
        aria-expanded={isTapped}
        onClick={toggleMobileState}
      >
        <span className="identity-avatar" aria-hidden="true">
          <Image
            src="/images/profile-v2.png"
            alt=""
            width={1536}
            height={1920}
            priority
          />
        </span>
        <span className="identity-album" aria-hidden="true">
          {data?.albumImageUrl ? (
            <Image src={data.albumImageUrl} alt="" fill sizes="44px" />
          ) : null}
        </span>
      </button>

      {data ? (
        <a
          className="identity-track"
          href={data.songUrl}
          target="_blank"
          rel="noreferrer"
        >
          <span className={data.isPlaying ? "identity-status is-live" : "identity-status"}>{status}</span>
          <span className="identity-song-line">
            <span>{data.title}</span> <span className="identity-artist">{data.artist}</span>
          </span>
        </a>
      ) : null}
    </div>
  );
}
