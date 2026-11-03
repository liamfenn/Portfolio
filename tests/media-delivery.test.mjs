import test from "node:test";
import assert from "node:assert/strict";

const previousBase = process.env.NEXT_PUBLIC_MEDIA_BASE_URL;
process.env.NEXT_PUBLIC_MEDIA_BASE_URL = "https://media.example.test/";
const { mediaUrl } = await import("../src/lib/media-delivery.ts");
if (previousBase === undefined) delete process.env.NEXT_PUBLIC_MEDIA_BASE_URL;
else process.env.NEXT_PUBLIC_MEDIA_BASE_URL = previousBase;

test("public site images stay on the current origin with a production media CDN configured", () => {
  assert.equal(mediaUrl("/images/process/clipped-mobile.png"), "/images/process/clipped-mobile.png");
  assert.equal(mediaUrl("images/profile/headshot.jpg"), "/images/profile/headshot.jpg");
});

test("relative encoded media still uses the configured CDN", () => {
  assert.equal(mediaUrl("/media/shop/poster.webp"), "https://media.example.test/media/shop/poster.webp");
  assert.equal(mediaUrl("media/shop/video.mp4"), "https://media.example.test/media/shop/video.mp4");
});

test("bundled preview videos and posters stay on the current origin", () => {
  assert.equal(mediaUrl("/videos/shop-q3-2026/clip.mp4"), "/videos/shop-q3-2026/clip.mp4");
  assert.equal(mediaUrl("videos/shop-q3-2026/poster.webp"), "/videos/shop-q3-2026/poster.webp");
});

test("explicit media URLs remain unchanged", () => {
  for (const url of ["https://assets.example.test/image.png", "//assets.example.test/video.mp4", "data:image/png;base64,abc"]) {
    assert.equal(mediaUrl(url), url);
  }
});
