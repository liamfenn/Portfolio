#!/usr/bin/env bash

set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "Usage: npm run media:video -- <input> <output-base> [max-dimension] [fps]"
  echo "Example: npm run media:video -- ~/Desktop/demo.mov public/media/shop/demo 1600 30"
  exit 1
fi

INPUT_PATH="$1"
OUTPUT_BASE="$2"
MAX_DIMENSION="${3:-1600}"
FRAME_RATE="${4:-30}"
VIDEO_OUTPUT="${OUTPUT_BASE}.mp4"
POSTER_OUTPUT="${OUTPUT_BASE}-poster.webp"

mkdir -p "$(dirname "$OUTPUT_BASE")"

VIDEO_FILTER="scale=w='if(gte(iw,ih),min(${MAX_DIMENSION},iw),-2)':h='if(gte(iw,ih),-2,min(${MAX_DIMENSION},ih))':flags=lanczos,fps=${FRAME_RATE},format=yuv420p"

ffmpeg -y \
  -i "$INPUT_PATH" \
  -map 0:v:0 \
  -vf "$VIDEO_FILTER" \
  -an \
  -c:v libx264 \
  -preset slow \
  -crf 21 \
  -movflags +faststart \
  "$VIDEO_OUTPUT"

ffmpeg -y \
  -ss 0.1 \
  -i "$VIDEO_OUTPUT" \
  -frames:v 1 \
  -vf "scale=w='if(gte(iw,ih),min(1200,iw),-2)':h='if(gte(iw,ih),-2,min(1200,ih))':flags=lanczos" \
  -c:v libwebp \
  -quality 82 \
  "$POSTER_OUTPUT"

echo "Created $VIDEO_OUTPUT"
echo "Created $POSTER_OUTPUT"
ffprobe -v error \
  -show_entries format=duration,size:stream=codec_name,width,height,pix_fmt,r_frame_rate \
  -of default=noprint_wrappers=1 \
  "$VIDEO_OUTPUT"
