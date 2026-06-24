# Commandes de lancement - Mindris AI

Ce fichier regroupe les commandes utiles pour lancer les services en local.
Les commandes ci-dessous partent du principe que tu es dans la racine du projet :

```bash
cd ~/projects/mindris-ai
```

## Installation

### Installation locale automatique

Depuis la racine du projet :

```bash
./scripts/setup_local.sh
```

Pour repartir d'une installation propre sans supprimer les lockfiles :

```bash
./scripts/reset_local_deps.sh
```

### Backend Python

```bash
uv sync --all-packages
uv run playwright install chromium
```

### Frontend Next.js

```bash
cd apps/web
bun install
```

### Renderer PDF

```bash
cd services/renderer
bun install
```

## Lancer les services séparément

Ouvre un terminal par service.

### Lancement local automatique sans Docker

Depuis la racine du projet :

```bash
./scripts/dev_local.sh
```

Services exposés :

```text
Frontend  http://localhost:3000
API       http://localhost:8000
Renderer  http://localhost:4000
```

Smoke check :

```bash
./scripts/smoke_local.sh
```

Guide détaillé :

```text
docs/local-development.md
```

### API Gateway FastAPI

Depuis la racine du projet :

```bash
uv run uvicorn main:app --app-dir services/api-gateway --reload
```

Depuis `services/` :

```bash
uv run uvicorn main:app --app-dir api-gateway --reload
```

Depuis `services/api-gateway/` :

```bash
uv run uvicorn main:app --reload
```

URL :

```text
http://localhost:8000
```

Healthcheck :

```bash
curl http://localhost:8000/
curl http://localhost:8000/api/v1/system/status
```

### Renderer Bun / Elysia

Depuis la racine du projet :

```bash
cd services/renderer
bun run start
```

URL :

```text
http://localhost:4000
```

Healthcheck :

```bash
curl http://localhost:4000/
```

### Frontend Next.js

Depuis la racine du projet :

```bash
cd apps/web
bun run dev
```

URL :

```text
http://localhost:3000
```

## Lancer avec Docker Compose

Depuis la racine du projet :

```bash
docker compose up --build
```

Services exposés :

```text
Frontend  http://localhost:3000
API       http://localhost:8000
Renderer  http://localhost:4000
```

Arrêter les services :

```bash
docker compose down
```

Vérifier les services self-hosted :

```bash
./scripts/smoke_self_hosting.sh
```

Guide détaillé :

```text
docs/self-hosting.md
```

## Pipeline backend complet

Depuis la racine du projet :

```bash
uv run python run_pipeline.py
```

## Exports CV ouverts

Avec l'API Gateway lancee sur `http://localhost:8000`, remplace `1` par l'id du CV :

```bash
curl -H "X-API-Key: dev-mindris-api-key" \
  -o resume.json \
  http://localhost:8000/api/v1/resumes/1/export-json
```

```bash
curl -H "X-API-Key: dev-mindris-api-key" \
  -o resume.md \
  http://localhost:8000/api/v1/resumes/1/export-markdown
```

```bash
curl -H "X-API-Key: dev-mindris-api-key" \
  -o resume.html \
  http://localhost:8000/api/v1/resumes/1/export-html
```

Details :

```text
docs/open-exports.md
```

## Vérifications locales

### Backend

```bash
uv run ruff check .
uv run ruff format --check .
uv run pytest tests/ -q --tb=short
```

Si l'environnement ne peut pas écrire dans le cache `uv` du home ou si tu veux isoler la base SQLite de test :

```bash
UV_CACHE_DIR=/tmp/uv-cache \
STORAGE_DIR=/tmp/mindris-ai-test-storage \
uv run --no-sync pytest tests/ -q --tb=short
```

Pour une vérification backend rapide du périmètre MVP1 :

```bash
UV_CACHE_DIR=/tmp/uv-cache \
STORAGE_DIR=/tmp/mindris-ai-test-storage \
uv run --no-sync python tests/smoke_mvp1_backend.py
```

### Frontend

```bash
cd apps/web
bun run lint
bun run typecheck
bun run build
```

### Renderer

```bash
cd services/renderer
bun run typecheck
bun run build
```

## Variables d'environnement minimales

Créer un fichier `.env` à la racine :

```env
API_KEY="dev-mindris-api-key"
RENDERER_URL="http://localhost:4000"
NEXT_PUBLIC_API_URL="http://localhost:8000"
NEXT_PUBLIC_RENDERER_URL="http://localhost:4000"
NEXT_PUBLIC_API_KEY="dev-mindris-api-key"
OLLAMA_API_BASE="http://127.0.0.1:11434"
OLLAMA_NUM_CTX="32768"
SCRAPER_HEADLESS=true
```

Pour Docker Compose, l'API utilise automatiquement :

```env
RENDERER_URL=http://renderer:4000
```

## Erreurs fréquentes

### `Could not import module "routers/main"`

Commande incorrecte :

```bash
uv run python -m uvicorn routers/main:app --reload
```

Commande correcte :

```bash
uv run uvicorn main:app --app-dir services/api-gateway --reload
```

### `Could not import module "main"` depuis `services/`

Si tu es dans `~/projects/mindris-ai/services`, utilise :

```bash
uv run uvicorn main:app --app-dir api-gateway --reload
```

et non :

```bash
uv run uvicorn main:app --app-dir services/api-gateway --reload
```
