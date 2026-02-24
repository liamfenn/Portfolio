const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";
const SPOTIFY_NOW_PLAYING_URL =
  "https://api.spotify.com/v1/me/player/currently-playing";

function getCredentials() {
  const client_id = process.env.SPOTIFY_CLIENT_ID || "";
  const client_secret = process.env.SPOTIFY_CLIENT_SECRET || "";
  const refresh_token = process.env.SPOTIFY_REFRESH_TOKEN || "";
  const basic = Buffer.from(`${client_id}:${client_secret}`).toString("base64");
  return { basic, refresh_token };
}

interface SpotifyToken {
  access_token: string;
}

interface SpotifyTrack {
  name: string;
  artists: { name: string }[];
  album: {
    name: string;
    images: { url: string; width: number; height: number }[];
  };
  external_urls: {
    spotify: string;
  };
}

interface SpotifyNowPlaying {
  is_playing: boolean;
  item: SpotifyTrack;
}

export interface NowPlayingResponse {
  isPlaying: boolean;
  title: string;
  artist: string;
  album: string;
  albumImageUrl: string;
  songUrl: string;
  playedAt?: string;
}

// In-memory cache of last known track
let cachedTrack: NowPlayingResponse | null = null;

async function getAccessToken(): Promise<SpotifyToken> {
  const { basic, refresh_token } = getCredentials();
  const response = await fetch(SPOTIFY_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token,
    }),
    cache: "no-store",
  });

  const data = await response.json();
  if (!response.ok || !data.access_token) {
    console.error("Spotify token error:", JSON.stringify(data));
    throw new Error(`Token refresh failed: ${JSON.stringify(data)}`);
  }
  return data;
}

export async function getNowPlaying(): Promise<NowPlayingResponse | null> {
  try {
    const { access_token } = await getAccessToken();

    const response = await fetch(SPOTIFY_NOW_PLAYING_URL, {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
      cache: "no-store",
    });

    // No active session — return cached track as "not playing"
    if (response.status === 204 || response.status === 202) {
      if (cachedTrack) {
        return { ...cachedTrack, isPlaying: false };
      }
      return null;
    }

    if (response.status === 429 || !response.ok) {
      if (cachedTrack) return { ...cachedTrack, isPlaying: false };
      return null;
    }

    const data: SpotifyNowPlaying = await response.json();

    if (!data.item) {
      if (cachedTrack) {
        return { ...cachedTrack, isPlaying: false };
      }
      return null;
    }

    const track: NowPlayingResponse = {
      isPlaying: data.is_playing,
      title: data.item.name,
      artist: data.item.artists.map((a) => a.name).join(", "),
      album: data.item.album.name,
      albumImageUrl: data.item.album.images[0]?.url || "",
      songUrl: data.item.external_urls.spotify,
    };

    // Cache the track
    cachedTrack = track;

    return track;
  } catch (error) {
    console.error("Error fetching now playing:", error);
    if (cachedTrack) {
      return { ...cachedTrack, isPlaying: false };
    }
    throw error;
  }
}
