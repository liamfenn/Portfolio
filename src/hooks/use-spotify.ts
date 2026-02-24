"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import type { NowPlayingResponse } from "@/lib/spotify";

export function useSpotify() {
  const [data, setData] = useState<NowPlayingResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const fetchNowPlaying = useCallback(async () => {
    try {
      const response = await fetch("/api/spotify/now-playing");
      if (!response.ok) {
        throw new Error("Failed to fetch");
      }
      const result = await response.json();
      if (!result.error) {
        setData(result);
        setError(null);
      }
      // If there's an error, keep the previous data so the widget stays visible
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
      // Poll faster when playing, slower when paused/idle
      const interval = data?.isPlaying ? 1000 : 10000;
      timeoutRef.current = setTimeout(poll, interval);
    }

    poll();

    return () => {
      cancelled = true;
      clearTimeout(timeoutRef.current);
    };
  }, [fetchNowPlaying, data?.isPlaying]);

  return { data, isLoading, error };
}
