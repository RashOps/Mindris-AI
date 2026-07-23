#!/usr/bin/env sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
exec "$ROOT_DIR/mindris" smoke \
  --api-url "${API_URL:-http://localhost:8000}" \
  --renderer-url "${RENDERER_URL:-http://localhost:4000}" \
  --web-url "${WEB_URL:-http://localhost:3000}"
