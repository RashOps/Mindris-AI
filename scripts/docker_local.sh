#!/usr/bin/env sh
set -eu

command="${1:-up}"

case "$command" in
  up)
    docker compose up --build
    ;;
  down)
    docker compose down
    ;;
  smoke)
    ./scripts/smoke_self_hosting.sh
    ;;
  logs)
    docker compose logs -f
    ;;
  *)
    echo "Usage: ./scripts/docker_local.sh [up|down|smoke|logs]" >&2
    exit 2
    ;;
esac
