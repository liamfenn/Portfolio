#!/usr/bin/env bash
set -euo pipefail
# Kept for callers outside package.json; the validated pipeline owns all encoding options.
exec node "$(dirname "$0")/process-video.mjs" "$@"
