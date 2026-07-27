#!/usr/bin/env sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
set -- "$ROOT_DIR/mindris" check
[ "${RUN_LOCAL_SMOKE:-0}" = "1" ] && set -- "$@" --with-smoke
[ "${RUN_BROWSER_E2E:-0}" = "1" ] && set -- "$@" --with-e2e
exec "$@"
