"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import type { NowPlayingResponse } from "@/lib/spotify";

const CACHE_KEY = "spotify-last-track";
const POLL_INTERVAL = 30000; // 30s = ~2 req/min, well under 180/min limit

// Hardcoded fallback so the widget always has something to show
const FALLBACK_TRACK: NowPlayingResponse = {
  isPlaying: false,
  title: "Before You I Just Forget",
  artist: "Fontaines D.C.",
  album: "Romance (Deluxe Edition)",
  albumImageUrl: "https://i.scdn.co/image/ab67616d0000b27302e1a7156bfc074cc8d1b94c",
  songUrl: "https://open.spotify.com/track/1oVAmJ2oaHv5NWFH99jCWE",
};

interface CachedData {
  track: NowPlayingResponse;
  cachedAt: string;
}

function getCached(): CachedData | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function setCache(track: NowPlayingResponse, cachedAt: string) {
  try {
    const entry: CachedData = { track, cachedAt };
    localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    // ignore
  }
}

export function useSpotify() {
  const [data, setData] = useState<NowPlayingResponse | null>(null);
  const [cachedAt, setCachedAt] = useState<string | null>(null);
  const cachedAtRef = useRef<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load cached track on mount for instant display, fall back to hardcoded track
  useEffect(() => {
    const cached = getCached();
    if (cached) {
      setData({ ...cached.track, isPlaying: false });
      setCachedAt(cached.cachedAt);
      cachedAtRef.current = cached.cachedAt;
    } else {
      const fallbackTime = new Date(Date.now() - 30 * 60000).toISOString();
      setData(FALLBACK_TRACK);
      setCachedAt(fallbackTime);
      cachedAtRef.current = fallbackTime;
    }
  }, []);

  const fetchNowPlaying = useCallback(async () => {
    try {
      const response = await fetch("/api/spotify/now-playing");
      if (!response.ok) return;

      const result = await response.json();
      if (result.error) return;

      setData(result);

      // Only advance cachedAt when playing — otherwise the "Xm ago"
      // timer would reset to "1m ago" on every poll while paused
      const now = new Date().toISOString();
      const newCachedAt = result.isPlaying ? now : (cachedAtRef.current ?? now);
      setCachedAt(newCachedAt);
      cachedAtRef.current = newCachedAt;
      setCache(result, newCachedAt);
    } catch {
      // keep previous data on error
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNowPlaying();
    intervalRef.current = setInterval(fetchNowPlaying, POLL_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchNowPlaying]);

  return { data, cachedAt, isLoading };
}
