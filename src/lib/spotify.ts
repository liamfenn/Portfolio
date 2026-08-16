const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";
const SPOTIFY_NOW_PLAYING_URL =
  "https://api.spotify.com/v1/me/player/currently-playing";
const SPOTIFY_RECENTLY_PLAYED_URL =
  "https://api.spotify.com/v1/me/player/recently-played?limit=1";

function getCredentials() {
  const client_id = process.env.SPOTIFY_CLIENT_ID?.trim() || "";
  const client_secret = process.env.SPOTIFY_CLIENT_SECRET?.trim() || "";
  const refresh_token = process.env.SPOTIFY_REFRESH_TOKEN?.trim() || "";

  const missing = [
    !client_id && "SPOTIFY_CLIENT_ID",
    !client_secret && "SPOTIFY_CLIENT_SECRET",
    !refresh_token && "SPOTIFY_REFRESH_TOKEN",
  ].filter(Boolean);

  if (missing.length > 0) {
    throw new Error(`Missing Spotify environment variables: ${missing.join(", ")}`);
  }

  const basic = Buffer.from(`${client_id}:${client_secret}`).toString("base64");
  return { basic, refresh_token };
}

interface SpotifyToken {
  access_token: string;
}

interface SpotifyTokenError {
  error?: string;
  error_description?: string;
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

  const data = (await response.json()) as SpotifyToken & SpotifyTokenError;
  if (!response.ok || !data.access_token) {
    if (data.error === "invalid_grant") {
      throw new Error(
        "Spotify authorization expired or was revoked. Run `npm run spotify:authorize` to reconnect it."
      );
    }

    throw new Error(
      `Spotify token refresh failed (${response.status}): ${
        data.error_description || data.error || "Unknown error"
      }`
    );
  }
  return data;
}

async function getRecentlyPlayed(
  access_token: string
): Promise<NowPlayingResponse | null> {
  try {
    const response = await fetch(SPOTIFY_RECENTLY_PLAYED_URL, {
      headers: { Authorization: `Bearer ${access_token}` },
      cache: "no-store",
    });

    if (!response.ok) return null;

    const data = await response.json();
    const item = data.items?.[0];
    if (!item?.track) return null;

    return {
      isPlaying: false,
      title: item.track.name,
      artist: item.track.artists.map((a: { name: string }) => a.name).join(", "),
      album: item.track.album.name,
      albumImageUrl: item.track.album.images[0]?.url || "",
      songUrl: item.track.external_urls.spotify,
      playedAt: item.played_at,
    };
  } catch {
    return null;
  }
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

    if (response.status === 204 || response.status === 202) {
      return getRecentlyPlayed(access_token);
    }

    if (response.status === 429 || !response.ok) {
      return null;
    }

    const data: SpotifyNowPlaying = await response.json();

    if (!data.item) {
      return null;
    }

    if (!data.is_playing) {
      return (await getRecentlyPlayed(access_token)) ?? {
        isPlaying: false,
        title: data.item.name,
        artist: data.item.artists.map((a) => a.name).join(", "),
        album: data.item.album.name,
        albumImageUrl: data.item.album.images[0]?.url || "",
        songUrl: data.item.external_urls.spotify,
      };
    }

    return {
      isPlaying: true,
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
