#!/usr/bin/env bash

set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "Usage: npm run media:video -- <input> <output-base> [fps] [widths]"
  echo "Example: npm run media:video -- ~/Desktop/demo.mov public/media/shop/demo 30 \"800 1200 1600\""
  echo
  echo "Emits, for every width not larger than the source:"
  echo "  <output-base>-<width>.av1.mp4   AV1, primary"
  echo "  <output-base>-<width>.mp4       H.264, fallback"
  echo "  <output-base>-poster.webp       poster for the largest width"
  exit 1
fi

INPUT_PATH="$1"
OUTPUT_BASE="$2"
FRAME_RATE="${3:-30}"
WIDTHS="${4:-800 1200 1600}"
POSTER_OUTPUT="${OUTPUT_BASE}-poster.webp"

if ! ffmpeg -hide_banner -encoders 2>/dev/null | grep -q libsvtav1; then
  echo "error: this ffmpeg has no libsvtav1. Install with: brew install ffmpeg" >&2
  exit 1
fi

mkdir -p "$(dirname "$OUTPUT_BASE")"

SOURCE_WIDTH=$(ffprobe -v error -select_streams v:0 -show_entries stream=width -of csv=p=0 "$INPUT_PATH")
SOURCE_HEIGHT=$(ffprobe -v error -select_streams v:0 -show_entries stream=height -of csv=p=0 "$INPUT_PATH")
echo "Source: ${SOURCE_WIDTH}x${SOURCE_HEIGHT}"

# Track what we emit so the manifest snippet at the end reflects reality.
EMITTED_WIDTHS=()
LARGEST_WIDTH=0

for WIDTH in $WIDTHS; do
  # Never upscale. A 1080px master should not be stretched to 1600.
  if [[ "$WIDTH" -gt "$SOURCE_WIDTH" ]]; then
    echo "Skipping ${WIDTH}px (source is only ${SOURCE_WIDTH}px wide)"
    continue
  fi

  # -2 keeps the height even, which both encoders require for yuv420p.
  SCALE="scale=w=${WIDTH}:h=-2:flags=lanczos,fps=${FRAME_RATE},format=yuv420p"

  # A keyframe every second (-g below) keeps seeking cheap. The focused view syncs
  # to the inline video's currentTime, and with a default multi-second GOP that seek
  # has to decode from the opening keyframe, which stalls the transition.

  # Smaller renditions carry fewer pixels to hide artefacts in, so give them a
  # slightly richer budget rather than a flat CRF across the ladder.
  if [[ "$WIDTH" -le 800 ]]; then
    AV1_CRF=28
    X264_CRF=19
  elif [[ "$WIDTH" -le 1200 ]]; then
    AV1_CRF=30
    X264_CRF=20
  else
    AV1_CRF=32
    X264_CRF=21
  fi

  echo "Encoding ${WIDTH}px AV1 (crf ${AV1_CRF})..."
  ffmpeg -y -loglevel error -stats \
    -i "$INPUT_PATH" \
    -map 0:v:0 \
    -vf "$SCALE" \
    -an \
    -c:v libsvtav1 \
    -preset 6 \
    -crf "$AV1_CRF" \
    -g "$FRAME_RATE" \
    -svtav1-params "tune=0:film-grain=0" \
    -movflags +faststart \
    "${OUTPUT_BASE}-${WIDTH}.av1.mp4"

  echo "Encoding ${WIDTH}px H.264 (crf ${X264_CRF})..."
  ffmpeg -y -loglevel error -stats \
    -i "$INPUT_PATH" \
    -map 0:v:0 \
    -vf "$SCALE" \
    -an \
    -c:v libx264 \
    -preset slow \
    -crf "$X264_CRF" \
    -g "$FRAME_RATE" \
    -keyint_min "$FRAME_RATE" \
    -profile:v high \
    -pix_fmt yuv420p \
    -movflags +faststart \
    "${OUTPUT_BASE}-${WIDTH}.mp4"

  EMITTED_WIDTHS+=("$WIDTH")
  LARGEST_WIDTH="$WIDTH"
done

if [[ ${#EMITTED_WIDTHS[@]} -eq 0 ]]; then
  echo "error: no renditions emitted; source is narrower than every requested width" >&2
  exit 1
fi

echo "Encoding poster..."
ffmpeg -y -loglevel error \
  -ss 0.1 \
  -i "${OUTPUT_BASE}-${LARGEST_WIDTH}.mp4" \
  -frames:v 1 \
  -c:v libwebp \
  -quality 88 \
  "$POSTER_OUTPUT"

echo
echo "Emitted:"
for WIDTH in "${EMITTED_WIDTHS[@]}"; do
  for FILE in "${OUTPUT_BASE}-${WIDTH}.av1.mp4" "${OUTPUT_BASE}-${WIDTH}.mp4"; do
    printf "  %-52s %s\n" "$FILE" "$(du -h "$FILE" | cut -f1)"
  done
done
printf "  %-52s %s\n" "$POSTER_OUTPUT" "$(du -h "$POSTER_OUTPUT" | cut -f1)"

# The public path is what the app references; strip the leading public/ if present.
PUBLIC_BASE="${OUTPUT_BASE#public}"
POSTER_PUBLIC="${POSTER_OUTPUT#public}"
LARGEST_HEIGHT=$(ffprobe -v error -select_streams v:0 -show_entries stream=height -of csv=p=0 "${OUTPUT_BASE}-${LARGEST_WIDTH}.mp4")

echo
echo "media-assets.ts snippet:"
echo "  kind: \"video\","
echo "  poster: \"${POSTER_PUBLIC}\","
echo "  width: ${LARGEST_WIDTH},"
echo "  height: ${LARGEST_HEIGHT},"
echo "  renditions: ["
for WIDTH in "${EMITTED_WIDTHS[@]}"; do
  echo "    { width: ${WIDTH}, av1: \"${PUBLIC_BASE}-${WIDTH}.av1.mp4\", h264: \"${PUBLIC_BASE}-${WIDTH}.mp4\" },"
done
echo "  ],"
