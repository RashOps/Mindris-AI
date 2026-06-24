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

echo "Resetting local dependency installs without deleting lockfiles..."

rm -rf "$ROOT_DIR/.venv"
rm -rf "$ROOT_DIR/apps/web/node_modules"
rm -rf "$ROOT_DIR/services/renderer/node_modules"

cd "$ROOT_DIR"
UV_CACHE_DIR="${UV_CACHE_DIR:-/tmp/uv-cache}" uv sync --all-packages

cd "$ROOT_DIR/apps/web"
bun install --frozen-lockfile

cd "$ROOT_DIR/services/renderer"
bun install --frozen-lockfile

echo "local-deps-reset-ok"
