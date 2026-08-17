#!/usr/bin/env node

/**
 * Uploads everything under public/media to the Vercel Blob store so the bytes
 * stay out of git. Paths are preserved, so the relative paths in media-assets.ts
 * keep working once NEXT_PUBLIC_MEDIA_BASE_URL points at the store.
 *
 *   npm run media:upload
 *   npm run media:upload -- --prefix v2   # bust a stale CDN cache
 *   npm run media:upload -- --dry-run
 */

import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import { put } from "@vercel/blob";

// BLOB_READ_WRITE_TOKEN normally arrives via `vercel env pull .env.local`,
// which Node does not read on its own.
if (!process.env.BLOB_READ_WRITE_TOKEN) {
  try {
    process.loadEnvFile(".env.local");
  } catch {
    // No local env file; the token may still be set in the environment.
  }
}

const MEDIA_ROOT = "public/media";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

const CONTENT_TYPES = {
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".avif": "image/avif",
};

function parseArgs(argv) {
  const args = { prefix: "", dryRun: false };

  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--prefix") {
      args.prefix = (argv[index + 1] ?? "").replace(/^\/+|\/+$/g, "");
      index += 1;
    } else if (argv[index] === "--dry-run") {
      args.dryRun = true;
    }
  }

  return args;
}

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const entryPath = join(directory, entry.name);
      if (entry.isDirectory()) {
        return collectFiles(entryPath);
      }

      return entry.name.startsWith(".") ? [] : [entryPath];
    }),
  );

  return files.flat();
}

function contentTypeFor(path) {
  const extension = path.slice(path.lastIndexOf("."));
  return CONTENT_TYPES[extension.toLowerCase()];
}

async function main() {
  const { prefix, dryRun } = parseArgs(process.argv.slice(2));

  if (!dryRun && !process.env.BLOB_READ_WRITE_TOKEN) {
    console.error("error: BLOB_READ_WRITE_TOKEN is not set.");
    console.error("Create a Blob store in the Vercel dashboard, then either add the");
    console.error("token to .env.local or run: vercel env pull .env.local");
    process.exit(1);
  }

  const files = await collectFiles(MEDIA_ROOT);
  if (files.length === 0) {
    console.error(`error: no files found under ${MEDIA_ROOT}`);
    process.exit(1);
  }

  console.log(`Uploading ${files.length} file(s) from ${MEDIA_ROOT}${prefix ? ` under /${prefix}` : ""}`);

  let uploadedBytes = 0;
  let firstUrl = null;

  for (const file of files) {
    // public/media/shop/x.mp4 -> media/shop/x.mp4, so the app's /media/... paths resolve.
    const relativePath = relative("public", file).split(sep).join("/");
    const blobPath = prefix ? `${prefix}/${relativePath}` : relativePath;
    const { size } = await stat(file);

    if (dryRun) {
      console.log(`  would upload ${blobPath} (${Math.round(size / 1024)} KB)`);
      uploadedBytes += size;
      continue;
    }

    const result = await put(blobPath, await readFile(file), {
      access: "public",
      contentType: contentTypeFor(file),
      // Deterministic paths, so re-uploads land on the same URL the app already references.
      addRandomSuffix: false,
      allowOverwrite: true,
      cacheControlMaxAge: ONE_YEAR_SECONDS,
    });

    firstUrl ??= result.url;
    uploadedBytes += size;
    console.log(`  ${blobPath} (${Math.round(size / 1024)} KB)`);
  }

  console.log(`\n${dryRun ? "Would upload" : "Uploaded"} ${(uploadedBytes / 1024 / 1024).toFixed(1)} MB`);

  if (firstUrl) {
    // Trim the media/... suffix back off to recover the store origin (plus prefix).
    const suffix = prefix ? `/${prefix}/media/` : "/media/";
    const base = firstUrl.slice(0, firstUrl.indexOf(suffix) + suffix.length - "media/".length - 1);
    console.log("\nSet this in .env.local and in the Vercel project settings:");
    console.log(`  NEXT_PUBLIC_MEDIA_BASE_URL=${base}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
