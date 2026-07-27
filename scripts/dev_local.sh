#!/usr/bin/env sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
exec "$ROOT_DIR/mindris" dev \
  --api-port "${API_PORT:-8000}" \
  --renderer-port "${RENDERER_PORT:-4000}" \
  --web-port "${WEB_PORT:-3000}"
