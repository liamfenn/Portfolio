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

/** Seconds alone under a minute; past that, the caller separates the two parts. */
export function trackClockParts(milliseconds: number) {
  const total = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = Math.floor(total / 60), seconds = total % 60;
  return minutes ? { minutes: String(minutes), seconds: String(seconds).padStart(2, "0") } : { minutes: null, seconds: String(seconds) };
}
