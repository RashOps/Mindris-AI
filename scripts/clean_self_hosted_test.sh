#!/usr/bin/env sh
set -eu

MINDRIS_HOME="${MINDRIS_HOME:-$HOME/.mindris-ai}"
REMOVE_DATA="${REMOVE_DATA:-false}"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required to clean the Mindris self-hosted stack." >&2
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "Docker Compose is required to clean the Mindris self-hosted stack." >&2
  exit 1
fi

if [ ! -f "$MINDRIS_HOME/docker-compose.yml" ]; then
  echo "Mindris self-hosted compose file not found: $MINDRIS_HOME/docker-compose.yml"
  echo "Nothing to clean."
  exit 0
fi

echo "Cleaning Mindris self-hosted stack in: $MINDRIS_HOME"

cd "$MINDRIS_HOME"

docker compose down --volumes --rmi all --remove-orphans

if [ "$REMOVE_DATA" = "true" ]; then
  cd /
  rm -rf "$MINDRIS_HOME"
  echo "Mindris containers, images, volumes, network and local data removed."
else
  echo "Mindris containers, images, volumes and network removed."
  echo "Local data kept in: $MINDRIS_HOME"
  echo "Run with REMOVE_DATA=true to remove the install directory too."
fi
