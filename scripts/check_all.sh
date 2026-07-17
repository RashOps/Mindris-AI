#!/usr/bin/env sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
RUN_LOCAL_SMOKE="${RUN_LOCAL_SMOKE:-0}"
RUN_BROWSER_E2E="${RUN_BROWSER_E2E:-0}"

cd "$ROOT_DIR"

./scripts/lint_all.sh
./scripts/test_all.sh

if [ "$RUN_LOCAL_SMOKE" = "1" ]; then
  ./scripts/smoke_local.sh
fi

if [ "$RUN_BROWSER_E2E" = "1" ]; then
  ./scripts/e2e_browser.sh
fi

echo "check-all-ok"
