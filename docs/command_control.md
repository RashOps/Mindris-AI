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
./mindris reset-deps
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
./mindris dev
```

Services exposés :

```text
Frontend  http://localhost:3000
API       http://localhost:8000
Renderer  http://localhost:4000
```

Smoke check :

```bash
./mindris smoke
```

Guide détaillé :

```text
docs/local-development.md
```

Les logs locaux sont ecrits dans `.logs/`.
Le renderer produit des lignes JSON structurees dans
`.logs/services/renderer.log`. Les services Python écrivent dans
`.logs/services/`, et les sorties stdout/stderr supervisées dans
`.logs/process/`.
Les reponses API incluent `X-Request-Id`, `X-Content-Type-Options`, `X-Frame-Options` et `Referrer-Policy`.
En debug d'une erreur 500, conserve le `X-Request-Id` et cherche-le dans
`.logs/services/api-gateway.log`.

```bash
./mindris logs api-gateway --since 30m --request-id <request-id>
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
curl http://localhost:8000/api/v1/system/ready
```

Documentation :

```text
http://localhost:8000/docs
http://localhost:8000/openapi.json
```

### Renderer Bun / Elysia

Depuis la racine du projet :

```bash
cd services/renderer
bun run dev
```

Mode production local minimal :

```bash
bun run start
```

Le mode `dev` active le reload automatique Bun uniquement pour le developpement local.

URL :

```text
http://localhost:4000
```

Healthcheck :

```bash
bun run typecheck
bun run build
curl http://localhost:4000/
curl http://localhost:4000/ready
curl http://localhost:4000/openapi.json
```

Documentation :

```text
http://localhost:4000/docs
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

Comportement au démarrage :

```text
Le front attend explicitement l'API Gateway (/api/v1/system/ready) et le renderer (/ready).
Si un service n'est pas prêt, l'AppShell reste bloqué sur un écran de readiness avec retry automatique.
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
uv run python tests/run_pipeline.py
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

```bash
curl -H "X-API-Key: dev-mindris-api-key" \
  -o resume.docx \
  http://localhost:8000/api/v1/resumes/1/export-docx
```

```bash
curl -H "X-API-Key: dev-mindris-api-key" \
  -o resume.tex \
  http://localhost:8000/api/v1/resumes/1/export-latex
```

```bash
curl -H "X-API-Key: dev-mindris-api-key" \
  -o resume.typ \
  http://localhost:8000/api/v1/resumes/1/export-typst
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

Endpoints runtime utiles :

```text
http://localhost:8000/api/v1/system/metrics
http://localhost:4000/metrics
```

### E2E navigateur MVP1

Avec les trois services lances sur `3000`, `8000` et `4000` :

```bash
./scripts/e2e_browser.sh
```

Variables personnalisables :

```bash
WEB_URL=http://localhost:3000 \
API_URL=http://localhost:8000 \
API_KEY=dev-mindris-api-key \
./scripts/e2e_browser.sh
```

## Variables d'environnement minimales

Créer un fichier `.env` à la racine :

```env
API_KEY="dev-mindris-api-key"
RENDERER_URL="http://localhost:4000"
NEXT_PUBLIC_API_URL="http://localhost:8000"
NEXT_PUBLIC_RENDERER_URL="http://localhost:4000"
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
