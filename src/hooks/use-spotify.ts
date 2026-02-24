"use client";

import { useEffect, useState, useCallback } from "react";
import type { NowPlayingResponse } from "@/lib/spotify";

export function useSpotify(refreshInterval = 1000) {
  const [data, setData] = useState<NowPlayingResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    // Initial fetch
    fetchNowPlaying();

    // Set up polling interval
    const interval = setInterval(fetchNowPlaying, refreshInterval);

    return () => clearInterval(interval);
  }, [fetchNowPlaying, refreshInterval]);

  return { data, isLoading, error };
}
