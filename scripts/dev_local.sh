#!/usr/bin/env sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
API_PORT="${API_PORT:-8000}"
RENDERER_PORT="${RENDERER_PORT:-4000}"
WEB_PORT="${WEB_PORT:-3000}"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

port_free() {
  port="$1"
  if command -v lsof >/dev/null 2>&1; then
    ! lsof -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1
    return
  fi
  if command -v ss >/dev/null 2>&1; then
    ! ss -ltn | grep -q ":$port "
    return
  fi
  return 0
}

start_service() {
  name="$1"
  log_file="$2"
  shift 2
  echo "Starting $name -> $log_file"
  "$@" >"$log_file" 2>&1 &
  pids="$pids $!"
}

cleanup() {
  echo "Stopping services..."
  for pid in $pids; do
    kill "$pid" >/dev/null 2>&1 || true
  done
}

require_cmd uv
require_cmd bun

if [ ! -f "$ROOT_DIR/.env" ]; then
  echo "Missing .env. Run ./scripts/setup_local.sh first." >&2
  exit 1
fi

for port in "$API_PORT" "$RENDERER_PORT" "$WEB_PORT"; do
  if ! port_free "$port"; then
    echo "Port $port is already in use." >&2
    exit 1
  fi
done

mkdir -p "$ROOT_DIR/.logs"
pids=""
trap cleanup INT TERM EXIT

cd "$ROOT_DIR"
start_service "api" "$ROOT_DIR/.logs/api-gateway.log" \
  uv run uvicorn main:app --app-dir services/api-gateway --reload --port "$API_PORT"

cd "$ROOT_DIR/services/renderer"
start_service "renderer" "$ROOT_DIR/.logs/renderer.log" \
  bun run dev

cd "$ROOT_DIR/apps/web"
start_service "web" "$ROOT_DIR/.logs/web.log" \
  bun run dev --port "$WEB_PORT"

cat <<EOF
local-dev-started
API       http://localhost:$API_PORT
Renderer  http://localhost:$RENDERER_PORT
Frontend  http://localhost:$WEB_PORT
Logs      $ROOT_DIR/.logs

Press Ctrl+C to stop all services.
EOF

wait
