# Self-hosting local avec Docker Compose

Ce guide décrit le lancement local open-source de Mindris AI avec Docker Compose.

## Services

| Service | Port | Rôle |
| :--- | :--- | :--- |
| `web` | `3000` | Frontend Next.js |
| `api-gateway` | `8000` | API FastAPI, source de vérité applicative |
| `renderer` | `4000` | Rendu PDF et Markdown |

Les données locales sont montées depuis :

- `./storage` vers `/app/storage`
- `./logs` vers `/app/logs`

## Prérequis

- Docker Engine
- Docker Compose v2
- Un fichier `.env` à la racine du projet

## Configuration

Créer le fichier `.env` depuis l'exemple :

```bash
cp .env.example .env
```

Variables minimales :

```env
API_KEY="dev-mindris-api-key"
RENDERER_URL="http://localhost:4000"
NEXT_PUBLIC_API_URL="http://localhost:8000"
NEXT_PUBLIC_RENDERER_URL="http://localhost:4000"
NEXT_PUBLIC_API_KEY="dev-mindris-api-key"
STORAGE_DIR="./storage"
LOGS_DIR="./logs"
CHROMA_DB_DIR="./storage/vectordb"
```

Pour Docker Compose, le backend reçoit automatiquement :

```env
RENDERER_URL=http://renderer:4000
STORAGE_DIR=/app/storage
LOGS_DIR=/app/logs
CHROMA_DB_DIR=/app/storage/vectordb
```

Les variables `NEXT_PUBLIC_*` restent en `localhost` parce qu'elles sont utilisées par le navigateur de l'utilisateur, pas par le réseau interne Docker.

Ne pas mettre de vraies clés API dans `.env.example`.

## Lancement

Depuis la racine :

```bash
docker compose up --build
```

URLs :

```text
Frontend  http://localhost:3000
API       http://localhost:8000
Renderer  http://localhost:4000
```

## Healthchecks

```bash
curl http://localhost:8000/
curl http://localhost:8000/api/v1/system/status
curl http://localhost:8000/api/v1/system/ready
curl http://localhost:4000/
curl http://localhost:4000/ready
curl http://localhost:3000/
```

Ou avec le script smoke :

```bash
./scripts/smoke_self_hosting.sh
```

## Logs

```bash
docker compose logs -f api-gateway
docker compose logs -f renderer
docker compose logs -f web
```

En plus des flux `docker compose logs`, les services ecrivent dans les volumes locaux.
Pour les services Python et Bun, la reference locale reste `.logs/` hors conteneur.
Les erreurs API normalisees exposent un `X-Request-Id` pour recouper les traces.

## Arrêt

```bash
docker compose down
```

## Reset local

Arrêter les containers puis supprimer les données locales :

```bash
docker compose down
```

```bash
rm -rf storage logs
```

Cette commande supprime les CV, drafts, rapports et fichiers locaux.

## Backup / restore

Sauvegarder avant reset ou migration locale :

```bash
mkdir -p /tmp/mindris-docker-backup
cp -R storage /tmp/mindris-docker-backup/storage
cp -R .logs /tmp/mindris-docker-backup/logs
```

Restaurer :

```bash
rm -rf storage .logs
cp -R /tmp/mindris-docker-backup/storage ./storage
cp -R /tmp/mindris-docker-backup/logs ./.logs
```

## Vérifications hors Docker

Backend smoke :

```bash
STORAGE_DIR=/tmp/mindris-ai-smoke \
UV_CACHE_DIR=/tmp/uv-cache \
uv run --no-sync python tests/smoke_mvp1_backend.py
```

Frontend :

```bash
cd apps/web
bun run lint
bun run typecheck
bun run build
```

Renderer :

```bash
cd services/renderer
bun run typecheck
bun run build
```
