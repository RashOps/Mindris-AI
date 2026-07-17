#!/usr/bin/env sh
set -eu

MINDRIS_HOME="${MINDRIS_HOME:-$HOME/.mindris-ai}"
WEB_URL="${WEB_URL:-http://localhost:3000}"
API_URL="${API_URL:-http://localhost:8000}"
RENDERER_URL="${RENDERER_URL:-http://localhost:4000}"

check() {
  name="$1"
  url="$2"
  if ! curl --max-time 8 -fsS "$url" >/dev/null; then
    echo "FAIL $name $url" >&2
    exit 1
  fi
  echo "OK $name $url"
}

cd "$MINDRIS_HOME"
docker compose config --quiet
check "web" "$WEB_URL/"
check "api-ready" "$API_URL/api/v1/system/ready"
check "renderer-ready" "$RENDERER_URL/ready"
echo "mindris-release-smoke-ok"
