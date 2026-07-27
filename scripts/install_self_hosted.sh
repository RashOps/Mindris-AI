#!/usr/bin/env sh
set -eu

MINDRIS_HOME="${MINDRIS_HOME:-$HOME/.mindris-ai}"
MINDRIS_RELEASE_REF="${MINDRIS_RELEASE_REF:-main}"
MINDRIS_RAW_BASE="${MINDRIS_RAW_BASE:-https://raw.githubusercontent.com/RashOps/Mindris-AI/$MINDRIS_RELEASE_REF}"
MINDRIS_INSTALL_DRY_RUN="${MINDRIS_INSTALL_DRY_RUN:-false}"
MINDRIS_PULL_ATTEMPTS="${MINDRIS_PULL_ATTEMPTS:-3}"
MINDRIS_PULL_PARALLEL_LIMIT="${MINDRIS_PULL_PARALLEL_LIMIT:-1}"
MINDRIS_PRIVACY_MODE="${MINDRIS_PRIVACY_MODE:-local_strict}"
MINDRIS_DOWNLOAD_LOCAL_MODEL="${MINDRIS_DOWNLOAD_LOCAL_MODEL:-false}"
MINDRIS_LOCAL_MODEL="${MINDRIS_LOCAL_MODEL:-llama3.2:3b}"

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

set_env_value() {
  key="$1"
  value="$2"
  tmp_env="$(mktemp)"
  awk -v key="$key" -v value="$value" '
    BEGIN { found = 0 }
    index($0, key "=") == 1 { print key "=" value; found = 1; next }
    { print }
    END { if (!found) print key "=" value }
  ' .env > "$tmp_env"
  mv "$tmp_env" .env
  chmod 600 .env
}

hardware_summary() {
  if [ -r /proc/meminfo ]; then
    memory_kib="$(awk '/MemTotal/ {print $2}' /proc/meminfo)"
    memory_gib=$((memory_kib / 1024 / 1024))
    echo "Detected memory: approximately ${memory_gib} GiB."
    if [ "$memory_gib" -lt 8 ]; then
      echo "Local model recommendation: 1B-3B (about 1-3 GB download)."
    elif [ "$memory_gib" -lt 16 ]; then
      echo "Local model recommendation: 3B-7B (about 2-6 GB download)."
    else
      echo "Local model recommendation: 7B-14B if CPU/GPU resources allow it."
    fi
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

need docker
docker compose version >/dev/null

mkdir -p "$MINDRIS_HOME/storage" "$MINDRIS_HOME/logs"
cd "$MINDRIS_HOME"

download "$MINDRIS_RAW_BASE/docker-compose.release.yml" docker-compose.yml
download \
  "$MINDRIS_RAW_BASE/docker-compose.privacy-strict.yml" \
  docker-compose.privacy-strict.yml

if [ ! -f .env ]; then
  download "$MINDRIS_RAW_BASE/.env.self-hosted.example" .env
  api_key="$(generate_api_key)"
  tmp_env="$(mktemp)"
  sed "s/^API_KEY=.*/API_KEY=$api_key/" .env > "$tmp_env"
  mv "$tmp_env" .env
  chmod 600 .env
fi

case "$MINDRIS_PRIVACY_MODE" in
  local_strict)
    set_env_value MINDRIS_PRIVACY_MODE local_strict
    set_env_value MINDRIS_TELEMETRY_ENABLED false
    set_env_value COMPOSE_PROFILES local-ai
    set_env_value OLLAMA_API_BASE http://ollama:11434
    hardware_summary
    ;;
  private_cloud|full_context_cloud)
    set_env_value MINDRIS_PRIVACY_MODE "$MINDRIS_PRIVACY_MODE"
    set_env_value COMPOSE_PROFILES ""
    ;;
  *)
    echo "Invalid MINDRIS_PRIVACY_MODE: $MINDRIS_PRIVACY_MODE" >&2
    echo "Use local_strict, private_cloud, or full_context_cloud." >&2
    exit 1
    ;;
esac
set_env_value MINDRIS_LOCAL_MODEL "$MINDRIS_LOCAL_MODEL"
set_env_value MINDRIS_DOWNLOAD_LOCAL_MODEL "$MINDRIS_DOWNLOAD_LOCAL_MODEL"

docker compose config --quiet

if [ "$MINDRIS_INSTALL_DRY_RUN" = "true" ]; then
  echo "mindris-install-dry-run-ok"
  echo "Install dir: $MINDRIS_HOME"
  exit 0
fi

pull_images
docker compose up -d

if [ "$MINDRIS_PRIVACY_MODE" = "local_strict" ] \
  && [ "$MINDRIS_DOWNLOAD_LOCAL_MODEL" = "true" ]; then
  echo "Downloading local model $MINDRIS_LOCAL_MODEL (explicit request)..."
  docker compose exec -T ollama ollama pull "$MINDRIS_LOCAL_MODEL"
fi

echo "Mindris AI is starting."
echo "Privacy:  $MINDRIS_PRIVACY_MODE"
echo "Frontend: http://localhost:${MINDRIS_WEB_PORT:-3000}"
echo "API:      http://localhost:${MINDRIS_API_PORT:-8000}"
echo "Renderer: http://localhost:${MINDRIS_RENDERER_PORT:-4000}"
echo "Install dir: $MINDRIS_HOME"
echo "Run smoke:"
echo "  curl -fsSL $MINDRIS_RAW_BASE/scripts/smoke_release.sh | MINDRIS_HOME=\"$MINDRIS_HOME\" sh"
