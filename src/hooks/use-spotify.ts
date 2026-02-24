"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import type { NowPlayingResponse } from "@/lib/spotify";

export function useSpotify() {
  const [data, setData] = useState<NowPlayingResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPlayingAtRef = useRef<string | null>(null);

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
          const fallback = lastPlayingAtRef.current || new Date(Date.now() - 60000).toISOString();
          result.playedAt = fallback;
        }
        setData(result);
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
