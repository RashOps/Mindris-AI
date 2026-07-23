#!/usr/bin/env sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
export API_KEY="${API_KEY:-dev-mindris-api-key}"
exec "$ROOT_DIR/mindris" e2e \
  --web-url "${WEB_URL:-http://localhost:3000}" \
  --api-url "${API_URL:-http://localhost:8000}"
