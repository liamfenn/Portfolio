"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import type { NowPlayingResponse } from "@/lib/spotify";

const CACHE_KEY = "spotify-last-track";

function getCachedTrack(): NowPlayingResponse | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    return JSON.parse(cached);
  } catch {
    return null;
  }
}

function setCachedTrack(track: NowPlayingResponse) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(track));
  } catch {
    // ignore
  }
}

export function useSpotify() {
  const [data, setData] = useState<NowPlayingResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPlayingAtRef = useRef<string | null>(null);

  // Load cached track on mount so widget is visible immediately
  useEffect(() => {
    const cached = getCachedTrack();
    if (cached) {
      setData({ ...cached, isPlaying: false });
    }
  }, []);

  const fetchNowPlaying = useCallback(async () => {
    try {
      const response = await fetch("/api/spotify/now-playing");
      if (!response.ok) {
        throw new Error("Failed to fetch");
      }
      const result = await response.json();
      if (!result.error) {
        // Track when we last saw the user actively playing
        if (result.isPlaying) {
          lastPlayingAtRef.current = new Date().toISOString();
        }
        // If paused and no playedAt, use the last time we saw playing (floor 1m ago)
        if (!result.isPlaying && !result.playedAt) {
          if (!lastPlayingAtRef.current) {
            lastPlayingAtRef.current = new Date(Date.now() - 60000).toISOString();
          }
          result.playedAt = lastPlayingAtRef.current;
        }
        setData(result);
        setCachedTrack(result);
        setError(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      await fetchNowPlaying();
      if (cancelled) return;
      const interval = data?.isPlaying ? 1000 : 10000;
      timeoutRef.current = setTimeout(poll, interval);
    }

    poll();

    return () => {
      cancelled = true;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [fetchNowPlaying, data?.isPlaying]);

  return { data, isLoading, error };
}
