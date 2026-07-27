# Self-hosting local avec Docker Compose

Ce guide décrit le lancement local open-source de Mindris AI avec Docker Compose.

Deux chemins existent :

- `docker-compose.yml` pour builder depuis un clone du depot ;
- `docker-compose.release.yml` pour installer depuis les images GHCR publiees.

Pour l'installation one-command sans clone, voir [`docs/install.md`](./install.md).

## Services

| Service | Port | Rôle |
| :--- | :--- | :--- |
| `web` | `3000` | Frontend Next.js |
| `api-gateway` | `8000` | API FastAPI, source de vérité applicative |
| `renderer` | `4000` | Rendu PDF et Markdown |

Les données locales sont montées depuis :

- `./storage` vers `/app/storage`
- `./logs` vers `/app/logs`

En release one-command, ces dossiers vivent par defaut dans `~/.mindris-ai/`.

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
STORAGE_DIR="./storage"
LOGS_DIR=".logs"
CHROMA_DB_DIR="./storage/vectordb"
```

Pour Docker Compose, le backend reçoit automatiquement :

```env
RENDERER_URL=http://renderer:4000
STORAGE_DIR=/app/storage
LOGS_DIR=/app/.logs
CHROMA_DB_DIR=/app/storage/vectordb
```

Le Compose de release utilise `/app/logs`, monté vers
`~/.mindris-ai/logs/`, afin de conserver une racine lisible dans le package
self-hosted.

Les variables `NEXT_PUBLIC_*` restent en `localhost` parce qu'elles sont utilisées par le navigateur de l'utilisateur, pas par le réseau interne Docker. Le navigateur local n'embarque plus de clé publique: l'accès web repose sur la frontière loopback locale, tandis que les scripts et appels externes utilisent `X-API-Key`.

Ne pas mettre de vraies clés API dans `.env.example`.

## Lancement

Depuis la racine :

```bash
./scripts/docker_local.sh doctor
```

```bash
docker compose up --build
```

Ou avec le script dédié :

```bash
./scripts/docker_local.sh up
```

Ne partage pas la sortie de `docker compose config` si ton `.env` contient de
vraies clés API : Compose y développe les valeurs en clair. Pour une validation
sans fuite de secrets, utilise `./scripts/docker_local.sh doctor`, qui lance
`docker compose config --quiet`.

URLs :

```text
Frontend  http://localhost:3000
API       http://localhost:8000
Renderer  http://localhost:4000
```

Si `3000` est deja occupe, utilise un port frontend different :

```bash
MINDRIS_WEB_PORT=3100 docker compose up -d
```

Ou, pour l'installation one-command, modifie `~/.mindris-ai/.env` puis relance :

```bash
cd "$HOME/.mindris-ai"
printf '\nMINDRIS_WEB_PORT=3100\n' >> .env
docker compose up -d
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

Ou :

```bash
./scripts/docker_local.sh smoke
```

## Logs

```bash
docker compose logs -f api-gateway
docker compose logs -f renderer
docker compose logs -f web
```

Ou :

```bash
./scripts/docker_local.sh logs
```

Statut des conteneurs :

```bash
./scripts/docker_local.sh status
```

En plus des flux `docker compose logs`, les services écrivent dans une racine
partagée. Depuis un clone Docker local, elle reste `.logs/`. Dans une
installation one-command, elle devient `~/.mindris-ai/logs/`. L'API et le
renderer utilisent le même volume, avec un fichier par service.
Les erreurs API normalisees exposent un `X-Request-Id` pour recouper les traces.

## Arrêt

```bash
docker compose down
```

Ou :

```bash
./scripts/docker_local.sh down
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

## Nettoyage d'un test release

Depuis un clone du depot, pour nettoyer un test one-command installe dans
`~/.mindris-ai` :

```bash
./scripts/clean_self_hosted_test.sh
```

Le script supprime :

- conteneurs Mindris ;
- reseaux Compose ;
- volumes Compose ;
- images GHCR du stack.

Il garde les donnees locales dans `~/.mindris-ai` par defaut. Pour supprimer
aussi `storage/`, `logs/`, `.env` et le compose installe :

```bash
REMOVE_DATA=true ./scripts/clean_self_hosted_test.sh
```

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
