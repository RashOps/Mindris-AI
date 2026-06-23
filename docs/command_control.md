# Commandes de lancement - Mindris AI

Ce fichier regroupe les commandes utiles pour lancer les services en local.
Les commandes ci-dessous partent du principe que tu es dans la racine du projet :

```bash
cd ~/projects/mindris-ai
```

## Installation

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

## Pipeline backend complet

Depuis la racine du projet :

```bash
uv run python run_pipeline.py
```

## Vérifications locales

### Backend

```bash
uv run ruff check .
uv run ruff format --check .
uv run pytest tests/ -q --tb=short
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
