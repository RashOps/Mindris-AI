#!/usr/bin/env sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
set -- "$ROOT_DIR/mindris" test
[ "${RUN_BROWSER_E2E:-0}" = "1" ] && set -- "$@" --with-e2e
exec "$@"
