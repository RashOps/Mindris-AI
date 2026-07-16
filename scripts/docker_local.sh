#!/usr/bin/env sh
set -eu

command="${1:-up}"

case "$command" in
  doctor)
    test -f .env || {
      echo "Missing .env. Create it with: cp .env.example .env" >&2
      exit 1
    }
    docker compose config --quiet
    sh -n scripts/smoke_self_hosting.sh
    echo "docker-local-doctor-ok"
    ;;
  build)
    docker compose build
    ;;
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
  status)
    docker compose ps
    ;;
  *)
    echo "Usage: ./scripts/docker_local.sh [doctor|build|up|down|smoke|logs|status]" >&2
    exit 2
    ;;
esac
