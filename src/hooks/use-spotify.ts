"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import type { NowPlayingResponse } from "@/lib/spotify";

const CACHE_KEY = "spotify-last-track";
const POLL_INTERVAL = 30000; // 30s = ~2 req/min, well under 180/min limit

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

function setCache(track: NowPlayingResponse) {
  try {
    const entry: CachedData = { track, cachedAt: new Date().toISOString() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    // ignore
  }
}

export function useSpotify() {
  const [data, setData] = useState<NowPlayingResponse | null>(null);
  const [cachedAt, setCachedAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load cached track on mount for instant display
  useEffect(() => {
    const cached = getCached();
    if (cached) {
      setData({ ...cached.track, isPlaying: false });
      setCachedAt(cached.cachedAt);
    }
  }, []);

  const fetchNowPlaying = useCallback(async () => {
    try {
      const response = await fetch("/api/spotify/now-playing");
      if (!response.ok) return;

      const result = await response.json();
      if (result.error) return;

      setData(result);
      setCache(result);
      setCachedAt(new Date().toISOString());
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
