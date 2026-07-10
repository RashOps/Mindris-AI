#!/usr/bin/env sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
UV_CACHE_DIR="${UV_CACHE_DIR:-/tmp/uv-cache}"
RUN_BROWSER_E2E="${RUN_BROWSER_E2E:-0}"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

require_cmd uv
require_cmd bun

cd "$ROOT_DIR"
UV_CACHE_DIR="$UV_CACHE_DIR" uv run --no-sync pytest \
  tests/test_brand_assets.py \
  tests/test_logger.py \
  tests/test_system_api.py \
  tests/test_templates_api.py -q

cd "$ROOT_DIR/apps/web"
bun test src/store/useCVStore.test.ts src/lib/templates.test.ts

cd "$ROOT_DIR/services/renderer"
bun test

if [ "$RUN_BROWSER_E2E" = "1" ]; then
  cd "$ROOT_DIR"
  ./scripts/e2e_browser.sh
fi

echo "test-all-ok"
