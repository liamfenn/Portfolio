import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fastStart, publishedVideos } from "../scripts/audit-media.mjs";
import { DEFAULT_WIDTHS } from "../scripts/lib/video-processing.mjs";
import { mapMediaSources } from "../scripts/lib/media-publishing.mjs";

test("every published project video follows the shared ladder and CDN delivery policy", () => {
  for (const { asset, label } of publishedVideos()) {
    const expected = [...new Set([...DEFAULT_WIDTHS.filter(width => width <= asset.width), asset.width])].sort((a, b) => a - b);
    assert.deepEqual(asset.renditions.map(rung => rung.width), expected, label);
    assert.ok(asset.frameRate > 0 && asset.frameRate <= 120 && asset.duration > 0, label);
    assert.match(asset.src, /^https:\/\//, label);
    assert.match(asset.poster, /^https:\/\//, label);
    for (const rung of asset.renditions) {
      if (asset.alpha) { assert.match(rung.hevcAlpha, /^https:\/\//); assert.match(rung.webmAlpha, /^https:\/\//); }
      else assert.match(rung.h264, /^https:\/\//);
    }
  }
});

test("publication maps every codec and poster without discarding alpha metadata", () => {
  const asset = { id: "test", alpha: true, frameRate: 60, src: "/clip.webm", poster: "/poster.webp", posters: [{ width: 800, src: "/poster.webp" }], renditions: [{ width: 800, h264: "/clip.mp4", av1: "/clip-av1.mp4", webmAlpha: "/clip.webm", hevcAlpha: "/clip.mov" }] };
  const result = mapMediaSources(asset, source => `https://media.example${source}`);
  assert.equal(result.alpha, true);
  assert.equal(result.frameRate, 60);
  assert.equal(result.renditions[0].hevcAlpha, "https://media.example/clip.mov");
  assert.equal(result.renditions[0].webmAlpha, "https://media.example/clip.webm");
  assert.equal(result.renditions[0].av1, "https://media.example/clip-av1.mp4");
  assert.equal(result.renditions[0].h264, "https://media.example/clip.mp4");
  assert.equal(result.posters[0].src, "https://media.example/poster.webp");
  assert.equal(asset.poster, "/poster.webp");
});

test("streaming validation distinguishes front-loaded MP4 metadata from trailing metadata", async t => {
  const directory = await mkdtemp(join(tmpdir(), "portfolio-streaming-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const atom = name => { const bytes = Buffer.alloc(8); bytes.writeUInt32BE(8); bytes.write(name, 4); return bytes; };
  const early = join(directory, "early.mp4"), late = join(directory, "late.mp4");
  await writeFile(early, Buffer.concat([atom("ftyp"), atom("moov"), atom("mdat")]));
  await writeFile(late, Buffer.concat([atom("ftyp"), atom("mdat"), atom("moov")]));
  assert.equal(await fastStart(early), true);
  assert.equal(await fastStart(late), false);
});
