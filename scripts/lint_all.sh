#!/usr/bin/env sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
UV_CACHE_DIR="${UV_CACHE_DIR:-/tmp/uv-cache}"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

require_cmd uv
require_cmd bun

cd "$ROOT_DIR"
UV_CACHE_DIR="$UV_CACHE_DIR" uv run --no-sync ruff check .
UV_CACHE_DIR="$UV_CACHE_DIR" uv run --no-sync ruff format --check .

cd "$ROOT_DIR/apps/web"
bun run lint
bun run typecheck
bun run build

cd "$ROOT_DIR/services/renderer"
bun run typecheck
bun run build

echo "lint-all-ok"
