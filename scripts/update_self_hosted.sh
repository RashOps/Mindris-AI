#!/usr/bin/env sh
set -eu

MINDRIS_HOME="${MINDRIS_HOME:-$HOME/.mindris-ai}"
MINDRIS_RELEASE_REF="${MINDRIS_RELEASE_REF:-main}"
MINDRIS_RAW_BASE="${MINDRIS_RAW_BASE:-https://raw.githubusercontent.com/RashOps/Mindris-AI/$MINDRIS_RELEASE_REF}"
MINDRIS_PULL_ATTEMPTS="${MINDRIS_PULL_ATTEMPTS:-3}"
MINDRIS_PULL_PARALLEL_LIMIT="${MINDRIS_PULL_PARALLEL_LIMIT:-1}"

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

pull_images() {
  attempt=1
  while [ "$attempt" -le "$MINDRIS_PULL_ATTEMPTS" ]; do
    echo "Pulling Mindris images (attempt $attempt/$MINDRIS_PULL_ATTEMPTS)..."
    if COMPOSE_PARALLEL_LIMIT="$MINDRIS_PULL_PARALLEL_LIMIT" docker compose pull; then
      return 0
    fi
    if [ "$attempt" -lt "$MINDRIS_PULL_ATTEMPTS" ]; then
      delay=$((attempt * 3))
      echo "Image pull interrupted; retrying in ${delay}s..." >&2
      sleep "$delay"
    fi
    attempt=$((attempt + 1))
  done

  echo "Unable to download Mindris images after $MINDRIS_PULL_ATTEMPTS attempts." >&2
  echo "Retry later or restart Docker/WSL if TLS transfer errors persist." >&2
  return 1
}

cd "$MINDRIS_HOME"
download "$MINDRIS_RAW_BASE/docker-compose.release.yml" docker-compose.yml
docker compose config --quiet
pull_images
docker compose up -d
docker compose ps
