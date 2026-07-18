#!/usr/bin/env sh
set -eu

MINDRIS_HOME="${MINDRIS_HOME:-$HOME/.mindris-ai}"
WEB_URL="${WEB_URL:-http://localhost:3000}"
API_URL="${API_URL:-http://localhost:8000}"
RENDERER_URL="${RENDERER_URL:-http://localhost:4000}"
SMOKE_ATTEMPTS="${SMOKE_ATTEMPTS:-30}"
SMOKE_RETRY_DELAY="${SMOKE_RETRY_DELAY:-2}"

check() {
  name="$1"
  url="$2"
  attempt=1
  while [ "$attempt" -le "$SMOKE_ATTEMPTS" ]; do
    if curl --max-time 5 -fsS "$url" >/dev/null; then
      echo "OK $name $url"
      return 0
    fi
    if [ "$attempt" -lt "$SMOKE_ATTEMPTS" ]; then
      sleep "$SMOKE_RETRY_DELAY"
    fi
    attempt=$((attempt + 1))
  done
  echo "FAIL $name $url after $SMOKE_ATTEMPTS attempts" >&2
  docker compose ps >&2 || true
  return 1
}

cd "$MINDRIS_HOME"
docker compose config --quiet
check "web" "$WEB_URL/"
check "api-ready" "$API_URL/api/v1/system/ready"
check "renderer-ready" "$RENDERER_URL/ready"
echo "mindris-release-smoke-ok"
