import test from "node:test";
import assert from "node:assert/strict";
import { getNowPlaying } from "../src/lib/spotify.ts";

const track = { name: "Current", artists: [{ name: "Artist" }], album: { name: "Album", images: [] }, external_urls: { spotify: "https://open.spotify.com/track/current" } };

async function withSpotify(responses, check) {
  const previous = globalThis.fetch;
  const keys = ["SPOTIFY_CLIENT_ID", "SPOTIFY_CLIENT_SECRET", "SPOTIFY_REFRESH_TOKEN"];
  const saved = keys.map(key => process.env[key]);
  keys.forEach(key => { process.env[key] = "test-only"; });
  const calls = [];
  globalThis.fetch = async url => {
    calls.push(String(url));
    if (String(url).includes("/api/token")) return Response.json({ access_token: "test-only" });
    const response = responses.shift();
    assert.ok(response, `Unexpected Spotify request: ${url}`);
    return response;
  };
  try { await check(calls); }
  finally {
    globalThis.fetch = previous;
    keys.forEach((key, index) => { if (saved[index] === undefined) delete process.env[key]; else process.env[key] = saved[index]; });
  }
}

test("a transient empty response recovers current playback without reading history", async () => {
  await withSpotify([new Response(null, { status: 204 }), Response.json({ is_playing: true, item: track, progress_ms: 1000 })], async calls => {
    const result = await getNowPlaying();
    assert.equal(result.title, "Current");
    assert.equal(result.isPlaying, true);
    assert.ok(!calls.some(url => url.includes("recently-played")));
  });
});

test("paused current playback stays on the current track instead of a completed track", async () => {
  await withSpotify([Response.json({ is_playing: false, item: track }), Response.json({ is_playing: false, item: track })], async calls => {
    const result = await getNowPlaying();
    assert.equal(result.title, "Current");
    assert.equal(result.isPlaying, false);
    assert.ok(!calls.some(url => url.includes("recently-played")));
  });
});

test("confirmed empty playback still returns recently played history", async () => {
  await withSpotify([new Response(null, { status: 204 }), new Response(null, { status: 204 }), Response.json({ items: [{ track, played_at: "2026-10-22T12:00:00Z" }] })], async () => {
    const result = await getNowPlaying();
    assert.equal(result.isPlaying, false);
    assert.equal(result.playedAt, "2026-10-22T12:00:00Z");
  });
});
