#!/usr/bin/env sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

require_cmd uv
require_cmd bun

cd "$ROOT_DIR"

if [ ! -f ".env" ] && [ -f ".env.example" ]; then
  cp .env.example .env
  echo "Created .env from .env.example"
fi

UV_CACHE_DIR="${UV_CACHE_DIR:-/tmp/uv-cache}" uv sync --all-packages
UV_CACHE_DIR="${UV_CACHE_DIR:-/tmp/uv-cache}" uv run playwright install chromium

cd "$ROOT_DIR/apps/web"
bun install --frozen-lockfile

cd "$ROOT_DIR/services/renderer"
bun install --frozen-lockfile

echo "local-setup-ok"
