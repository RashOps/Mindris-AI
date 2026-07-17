#!/usr/bin/env sh
set -eu

MINDRIS_HOME="${MINDRIS_HOME:-$HOME/.mindris-ai}"
MINDRIS_RELEASE_REF="${MINDRIS_RELEASE_REF:-main}"
MINDRIS_RAW_BASE="${MINDRIS_RAW_BASE:-https://raw.githubusercontent.com/RashOps/Mindris-AI/$MINDRIS_RELEASE_REF}"

download() {
  source_url="$1"
  target_path="$2"
  if command -v curl >/dev/null 2>&1; then
    curl -fsSL "$source_url" -o "$target_path"
  elif command -v wget >/dev/null 2>&1; then
    wget -qO "$target_path" "$source_url"
  else
    echo "Missing curl or wget." >&2
    exit 1
  fi
}

cd "$MINDRIS_HOME"
download "$MINDRIS_RAW_BASE/docker-compose.release.yml" docker-compose.yml
docker compose config --quiet
docker compose pull
docker compose up -d
docker compose ps
