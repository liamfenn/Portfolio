const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";
const SPOTIFY_NOW_PLAYING_URL =
  "https://api.spotify.com/v1/me/player/currently-playing";
const SPOTIFY_RECENTLY_PLAYED_URL =
  "https://api.spotify.com/v1/me/player/recently-played?limit=1";

const client_id = process.env.SPOTIFY_CLIENT_ID;
const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
const refresh_token = process.env.SPOTIFY_REFRESH_TOKEN;

const basic = Buffer.from(`${client_id}:${client_secret}`).toString("base64");

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

interface SpotifyRecentlyPlayed {
  items: {
    track: SpotifyTrack;
    played_at: string;
  }[];
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

async function getAccessToken(): Promise<SpotifyToken> {
  const response = await fetch(SPOTIFY_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refresh_token || "",
    }),
    cache: "no-store",
  });

  return response.json();
}

export async function getNowPlaying(): Promise<NowPlayingResponse | null> {
  try {
    const { access_token } = await getAccessToken();

    // Try to get currently playing
    const response = await fetch(SPOTIFY_NOW_PLAYING_URL, {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
      cache: "no-store",
    });

    // If nothing is playing, try to get recently played
    if (response.status === 204 || response.status === 202) {
      return getRecentlyPlayed(access_token);
    }

    if (!response.ok) {
      return null;
    }

    const data: SpotifyNowPlaying = await response.json();

    if (!data.item) {
      return getRecentlyPlayed(access_token);
    }

    // If track is paused, get recently played to get the playedAt timestamp
    if (!data.is_playing) {
      return getRecentlyPlayed(access_token);
    }

    return {
      isPlaying: data.is_playing,
      title: data.item.name,
      artist: data.item.artists.map((a) => a.name).join(", "),
      album: data.item.album.name,
      albumImageUrl: data.item.album.images[0]?.url || "",
      songUrl: data.item.external_urls.spotify,
    };
  } catch (error) {
    console.error("Error fetching now playing:", error);
    return null;
  }
}

async function getRecentlyPlayed(
  access_token: string
): Promise<NowPlayingResponse | null> {
  try {
    const response = await fetch(SPOTIFY_RECENTLY_PLAYED_URL, {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const data: SpotifyRecentlyPlayed = await response.json();

    if (!data.items || data.items.length === 0) {
      return null;
    }

    const track = data.items[0].track;
    const playedAt = data.items[0].played_at;

    return {
      isPlaying: false,
      title: track.name,
      artist: track.artists.map((a) => a.name).join(", "),
      album: track.album.name,
      albumImageUrl: track.album.images[0]?.url || "",
      songUrl: track.external_urls.spotify,
      playedAt,
    };
  } catch (error) {
    console.error("Error fetching recently played:", error);
    return null;
  }
}
