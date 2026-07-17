#!/usr/bin/env sh
set -eu

MINDRIS_HOME="${MINDRIS_HOME:-$HOME/.mindris-ai}"
MINDRIS_RELEASE_REF="${MINDRIS_RELEASE_REF:-main}"
MINDRIS_RAW_BASE="${MINDRIS_RAW_BASE:-https://raw.githubusercontent.com/RashOps/Mindris-AI/$MINDRIS_RELEASE_REF}"
MINDRIS_INSTALL_DRY_RUN="${MINDRIS_INSTALL_DRY_RUN:-false}"

need() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

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

generate_api_key() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 24
  else
    date +%s | sha256sum | awk '{print $1}'
  fi
}

need docker
docker compose version >/dev/null

mkdir -p "$MINDRIS_HOME/storage" "$MINDRIS_HOME/logs"
cd "$MINDRIS_HOME"

download "$MINDRIS_RAW_BASE/docker-compose.release.yml" docker-compose.yml

if [ ! -f .env ]; then
  download "$MINDRIS_RAW_BASE/.env.self-hosted.example" .env
  api_key="$(generate_api_key)"
  tmp_env="$(mktemp)"
  sed "s/^API_KEY=.*/API_KEY=$api_key/" .env > "$tmp_env"
  mv "$tmp_env" .env
  chmod 600 .env
fi

docker compose config --quiet

if [ "$MINDRIS_INSTALL_DRY_RUN" = "true" ]; then
  echo "mindris-install-dry-run-ok"
  echo "Install dir: $MINDRIS_HOME"
  exit 0
fi

docker compose pull
docker compose up -d

echo "Mindris AI is starting."
echo "Frontend: http://localhost:${MINDRIS_WEB_PORT:-3000}"
echo "API:      http://localhost:${MINDRIS_API_PORT:-8000}"
echo "Renderer: http://localhost:${MINDRIS_RENDERER_PORT:-4000}"
echo "Install dir: $MINDRIS_HOME"
echo "Run smoke:"
echo "  curl -fsSL $MINDRIS_RAW_BASE/scripts/smoke_release.sh | MINDRIS_HOME=\"$MINDRIS_HOME\" sh"
