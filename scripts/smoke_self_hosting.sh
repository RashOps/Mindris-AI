#!/usr/bin/env sh
set -eu

API_URL="${API_URL:-http://localhost:8000}"
RENDERER_URL="${RENDERER_URL:-http://localhost:4000}"
WEB_URL="${WEB_URL:-http://localhost:3000}"

check() {
  name="$1"
  url="$2"
  if ! curl --max-time 8 -fsS "$url" >/dev/null; then
    echo "FAIL $name $url" >&2
    exit 1
  fi
  echo "OK $name $url"
}

check "api" "$API_URL/"
check "api-system" "$API_URL/api/v1/system/status"
check "api-ready" "$API_URL/api/v1/system/ready"
check "renderer" "$RENDERER_URL/"
check "renderer-ready" "$RENDERER_URL/ready"
check "web" "$WEB_URL/"

echo "self-hosting-smoke-ok"
