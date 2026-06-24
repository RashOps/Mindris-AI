#!/usr/bin/env sh
set -eu

WEB_URL="${WEB_URL:-http://localhost:3000}"
API_URL="${API_URL:-http://localhost:8000}"
API_KEY="${API_KEY:-dev-mindris-api-key}"

UV_CACHE_DIR="${UV_CACHE_DIR:-/tmp/uv-cache}" \
uv run --no-sync python tests/e2e/mvp1_browser.py \
  --base-url "$WEB_URL" \
  --api-url "$API_URL" \
  --api-key "$API_KEY"
