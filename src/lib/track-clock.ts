export interface TrackTiming {
  isPlaying: boolean;
  progressMs?: number;
  durationMs?: number;
  fetchedAt?: string;
}

/**
 * The song position at `now`, the last whole-second tick. Measuring from that tick (even when a fetch landed
 * after it) means a data refresh never moves the clock off the beat; only a real jump, like a seek or a new
 * song, shows up between ticks.
 */
export function trackPositionAt(track: TrackTiming, now: number): number | null {
  if (track.progressMs === undefined) return null;
  const elapsed = track.isPlaying && track.fetchedAt && now ? now - new Date(track.fetchedAt).getTime() : 0;
  return Math.min(track.durationMs ?? Infinity, Math.max(0, track.progressMs + elapsed));
}
