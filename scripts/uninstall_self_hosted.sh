#!/usr/bin/env sh
set -eu

MINDRIS_HOME="${MINDRIS_HOME:-$HOME/.mindris-ai}"
REMOVE_DATA="${REMOVE_DATA:-false}"

if [ ! -d "$MINDRIS_HOME" ]; then
  echo "Mindris install directory not found: $MINDRIS_HOME"
  exit 0
fi

cd "$MINDRIS_HOME"
docker compose down

if [ "$REMOVE_DATA" = "true" ]; then
  cd /
  rm -rf "$MINDRIS_HOME"
  echo "Mindris containers and local data removed."
else
  echo "Mindris containers stopped. Data kept in: $MINDRIS_HOME"
  echo "To remove data too: REMOVE_DATA=true ./scripts/uninstall_self_hosted.sh"
fi
